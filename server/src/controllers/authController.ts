import { Request, Response } from 'express';
import { authService } from '../services/authService.js';
import { registerSchema, loginSchema, addressSchema } from '../validators/authValidators.js';
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
      res.status(400).json({ error: 'Validation failed', details: error.errors });
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
      res.status(400).json({ error: 'Validation failed', details: error.errors });
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
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    res.status(400).json({ error: error.message });
  }
};
