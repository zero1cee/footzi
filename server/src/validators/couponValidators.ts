import { z } from 'zod';

const optionalNumber = (schema: z.ZodNumber) => z.union([schema, z.null()]).optional();

const base = z.object({
  code: z
    .string({ required_error: 'A coupon code is required' })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,24}$/, 'Use 3-24 letters, numbers, dashes or underscores'),
  description: z.string().trim().max(120, 'Keep the description under 120 characters').optional(),
  type: z.enum(['percent', 'flat'], { errorMap: () => ({ message: 'Choose percent or flat' }) }),
  value: z.number({ invalid_type_error: 'Enter the discount value' }).positive('The discount must be more than 0'),
  minOrderValue: z.number().min(0, 'Minimum order cannot be negative').optional(),
  maxDiscount: optionalNumber(z.number().positive('The cap must be more than 0')),
  firstOrderOnly: z.boolean().optional(),
  usageLimit: optionalNumber(z.number().int('Use a whole number').min(1, 'The limit must be at least 1')),
  perUserLimit: optionalNumber(z.number().int('Use a whole number').min(1, 'The limit must be at least 1')),
  expiresAt: z.union([z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)), z.null()]).optional(),
  isActive: z.boolean().optional(),
});

const percentRule = (d: { type?: string; value?: number }) => !(d.type === 'percent' && d.value !== undefined && d.value > 90);

export const createCouponSchema = base.refine(percentRule, { message: 'A percent coupon cannot exceed 90%', path: ['value'] });

export const updateCouponSchema = base
  .omit({ code: true })
  .partial()
  .refine(percentRule, { message: 'A percent coupon cannot exceed 90%', path: ['value'] })
  .refine((d) => Object.keys(d).length > 0, { message: 'Nothing to update' });

export const validateCouponSchema = z.object({
  code: z.string().trim().min(1, 'Enter a coupon code').max(40),
  subtotal: z.number({ invalid_type_error: 'Subtotal must be a number' }).min(0),
  // A guest has no account, so their first-order and per-customer limits are checked against this email
  email: z.string().trim().toLowerCase().email().optional(),
});
