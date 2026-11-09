import bcrypt from 'bcryptjs';
import { User, IUser, IUserAddress } from '../models/User.js';

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: 'customer' | 'admin';
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
      role: data.role || 'customer',
      addresses: [],
    });

    const token = user.generateAuthToken();

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

    user.addresses.push(address);
    await user.save();
    return user;
  }
}

export const authService = new AuthService();
