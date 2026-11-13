import { z } from 'zod';
import { required } from './messages.js';

export const addToCartSchema = z.object({
  productId: z.string(required('Product ID is required')),
  variantSku: z.string(required('Variant SKU is required')),
  size: z.enum(['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'], 'A valid Indian (UK) shoe size is required'),
  color: z.string(required('Color shade name is required')),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(10, 'Maximum 10 pairs per order variant')
    .default(1),
});

// A guest's bag may hold more than the per-variant limit; clamp it rather than reject the whole bag
const mergeItemSchema = addToCartSchema.extend({
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .transform((q) => Math.min(q, 10)),
});

export const mergeCartSchema = z.object({
  items: z.array(mergeItemSchema).max(50, 'Too many items to merge'),
});

export const updateCartItemSchema = z.object({
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(10, 'Maximum 10 pairs per order variant'),
});
