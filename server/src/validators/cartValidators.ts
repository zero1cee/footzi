import { z } from 'zod';

export const addToCartSchema = z.object({
  productId: z.string({ required_error: 'Product ID is required' }),
  variantSku: z.string({ required_error: 'Variant SKU is required' }),
  size: z.enum(['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'], {
    required_error: 'A valid Indian (UK) shoe size is required',
  }),
  color: z.string({ required_error: 'Color shade name is required' }),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(10, 'Maximum 10 pairs per order variant')
    .default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(10, 'Maximum 10 pairs per order variant'),
});
