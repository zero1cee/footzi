import { z } from 'zod';
import { required } from './messages.js';

export const registerSchema = z.object({
  name: z
    .string(required('Full name is required'))
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name must be under 60 characters'),
  email: z
    .string(required('Email is required'))
    .email('Please provide a valid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string(required('Password is required'))
    .min(8, 'Password must be at least 8 characters long'),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z
    .string(required('Email is required'))
    .email('Please provide a valid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string(required('Password is required'))
    .min(1, 'Password cannot be empty'),
});

export const addressSchema = z.object({
  name: z.string().min(2, 'Recipient name is required'),
  phone: z.string().min(10, 'Valid 10-digit mobile number required'),
  addressLine: z.string().min(5, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Must be a valid 6-digit Indian PIN code'),
  isDefault: z.boolean().optional(),
});

const newPassword = z
  .string(required('A new password is required'))
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password is too long');

export const changePasswordSchema = z.object({
  currentPassword: z.string(required('Your current password is required')).min(1, 'Your current password is required'),
  newPassword,
});

export const forgotPasswordSchema = z.object({
  email: z.string(required('Email is required')).email('Please provide a valid email address').toLowerCase().trim(),
});

export const resetPasswordSchema = z.object({
  token: z.string(required('Reset token is required')).min(32, 'This reset link is invalid').max(200),
  newPassword,
});

export const updateProfileSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(60, 'Name must be under 60 characters').optional(),
    phone: z.string().regex(/^(\+?\d[\d\s-]{8,14})?$/, 'Enter a valid phone number').optional(),
  })
  .refine((d) => d.name !== undefined || d.phone !== undefined, { message: 'Nothing to update' });

export const updateAddressSchema = addressSchema.partial();
