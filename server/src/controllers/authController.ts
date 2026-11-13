import { Request, Response } from 'express';
import { authService } from '../services/authService.js';
import {
  registerSchema,
  loginSchema,
  addressSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  updateAddressSchema,
} from '../validators/authValidators.js';
import { AuthRequest } from '../middleware/auth.js';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const { user, token } = await authService.register(validatedData);

    res.status(201).json({
      message: 'Account registered successfully',
      token,
      user,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: error.issues });
      return;
    }
    res.status(400).json({ error: error.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const { user, token } = await authService.login(email, password);

    res.status(200).json({
      message: 'Login successful',
      token,
      user,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: error.issues });
      return;
    }
    res.status(401).json({ error: error.message });
  }
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({ message: 'Logged out successfully. Please clear client-stored tokens.' });
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  res.status(200).json({ user: req.user });
};

export const addAddress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const validatedAddress = addressSchema.parse(req.body);
    const updatedUser = await authService.addAddress(req.user.id, validatedAddress as any);

    res.status(201).json({ message: 'Address added successfully', user: updatedUser });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: error.issues });
      return;
    }
    res.status(400).json({ error: error.message });
  }
};

const fail = (res: Response, error: any, status = 400): void => {
  if (error.name === 'ZodError') {
    res.status(400).json({ error: error.issues[0]?.message || 'Validation failed', details: error.issues });
    return;
  }
  res.status(status).json({ error: error.message });
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const user = await authService.updateProfile(req.user!.id, data);
    res.status(200).json({ message: 'Profile updated', user });
  } catch (error: any) {
    fail(res, error);
  }
};

export const updateAddress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = updateAddressSchema.parse(req.body);
    const user = await authService.updateAddress(req.user!.id, req.params.id as string, data as any);
    res.status(200).json({ message: 'Address updated', user });
  } catch (error: any) {
    fail(res, error);
  }
};

export const deleteAddress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await authService.deleteAddress(req.user!.id, req.params.id as string);
    res.status(200).json({ message: 'Address removed', user });
  } catch (error: any) {
    fail(res, error);
  }
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const { user, token } = await authService.changePassword(req.user!.id, currentPassword, newPassword);
    res.status(200).json({ message: 'Password changed. Other devices have been signed out.', token, user });
  } catch (error: any) {
    fail(res, error);
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    await authService.requestPasswordReset(email).catch((e) => console.error('[Footzi Auth] Reset request failed:', e.message));
    // Same answer whether or not the address has an account
    res.status(200).json({ message: 'If an account exists for that email, a reset link is on its way.' });
  } catch (error: any) {
    fail(res, error);
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);
    const result = await authService.resetPassword(token, newPassword);
    res.status(200).json({ message: 'Password updated. You are now signed in.', token: result.token, user: result.user });
  } catch (error: any) {
    fail(res, error);
  }
};
