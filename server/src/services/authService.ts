import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, IUser, IUserAddress } from '../models/User.js';
import { emailService } from './emailService.js';

// Shared public demo logins: anyone may use them, so nobody may change their credentials
export const DEMO_ACCOUNT_EMAILS = new Set(['patron@footzi.in', 'demo-admin@footzi.in']);

const RESET_TOKEN_MINUTES = 60;
const hashToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex');

export class AuthError extends Error {}

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export class AuthService {
  async register(data: RegisterDTO): Promise<{ user: IUser; token: string }> {
    const existing = await User.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await User.create({
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      passwordHash,
      phone: data.phone?.trim(),
      // Public signup always creates a customer; admins are provisioned by the seed script
      role: 'customer',
      addresses: [],
    });

    const token = user.generateAuthToken();
    void emailService.welcome(user);

    return { user, token };
  }

  async login(email: string, password: string): Promise<{ user: IUser; token: string }> {
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new Error('Invalid email or password.');
    }

    const token = user.generateAuthToken();

    return { user, token };
  }

  async getCurrentUser(userId: string): Promise<IUser | null> {
    return User.findById(userId);
  }

  async addAddress(userId: string, address: IUserAddress): Promise<IUser | null> {
    const user = await User.findById(userId);
    if (!user) return null;

    if (address.isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    // The first address a customer saves becomes their default
    if (user.addresses.length === 0) address.isDefault = true;

    user.addresses.push(address);
    await user.save();
    return user;
  }

  async updateProfile(userId: string, data: { name?: string; phone?: string }): Promise<IUser | null> {
    const user = await User.findById(userId);
    if (!user) return null;
    if (DEMO_ACCOUNT_EMAILS.has(user.email)) {
      throw new AuthError('Demo accounts are shared, so their profile cannot be changed. Create your own account to edit it.');
    }
    if (data.name !== undefined) user.name = data.name.trim();
    if (data.phone !== undefined) user.phone = data.phone.trim() || undefined;
    await user.save();
    return user;
  }

  async updateAddress(userId: string, addressId: string, data: Partial<IUserAddress>): Promise<IUser | null> {
    const user = await User.findById(userId);
    if (!user) return null;
    const address = user.addresses.find((a) => a._id?.toString() === addressId);
    if (!address) throw new AuthError('Address not found.');

    const { isDefault, ...fields } = data;
    Object.assign(address, fields);
    if (isDefault) {
      user.addresses.forEach((a) => {
        a.isDefault = a._id?.toString() === addressId;
      });
    }
    await user.save();
    return user;
  }

  async deleteAddress(userId: string, addressId: string): Promise<IUser | null> {
    const user = await User.findById(userId);
    if (!user) return null;
    const index = user.addresses.findIndex((a) => a._id?.toString() === addressId);
    if (index === -1) throw new AuthError('Address not found.');

    const [removed] = user.addresses.splice(index, 1);
    // Keep exactly one default when any addresses remain
    if (removed.isDefault && user.addresses.length > 0) user.addresses[0].isDefault = true;
    await user.save();
    return user;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ user: IUser; token: string }> {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) throw new AuthError('Account not found.');
    if (DEMO_ACCOUNT_EMAILS.has(user.email)) {
      throw new AuthError('Demo accounts are shared, so their password cannot be changed. Create your own account instead.');
    }
    if (!(await user.comparePassword(currentPassword))) {
      throw new AuthError('Your current password is incorrect.');
    }
    if (currentPassword === newPassword) {
      throw new AuthError('Your new password must be different from the current one.');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordChangedAt = new Date();
    user.resetTokenHash = undefined;
    user.resetTokenExpires = undefined;
    await user.save();
    void emailService.passwordChanged(user);

    // Every older token is now void; hand back a fresh one so this device stays signed in
    return { user, token: user.generateAuthToken() };
  }

  /**
   * Emails a single-use reset link. Callers must respond identically whether or not
   * the address exists, so this never reveals which emails have accounts.
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || DEMO_ACCOUNT_EMAILS.has(user.email)) return;

    const token = crypto.randomBytes(32).toString('hex');
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          resetTokenHash: hashToken(token),
          resetTokenExpires: new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000),
        },
      }
    );
    await emailService.passwordReset(user, token, RESET_TOKEN_MINUTES);
  }

  async resetPassword(token: string, newPassword: string): Promise<{ user: IUser; token: string }> {
    // One conditional update consumes the token, so it cannot be used twice
    const user = await User.findOneAndUpdate(
      { resetTokenHash: hashToken(token), resetTokenExpires: { $gt: new Date() } },
      {
        $set: { passwordHash: await bcrypt.hash(newPassword, 10), passwordChangedAt: new Date() },
        $unset: { resetTokenHash: '', resetTokenExpires: '' },
      },
      { new: true }
    );
    if (!user) throw new AuthError('This reset link is invalid or has expired. Please request a new one.');

    void emailService.passwordChanged(user);
    return { user, token: user.generateAuthToken() };
  }
}

export const authService = new AuthService();
