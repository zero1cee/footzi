import { z } from 'zod';
import { wrongType } from './messages.js';

const SIZES = ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'] as const;
const CATEGORIES = ['Loafers', 'Sneakers', 'Oxfords', 'Boots', 'Slip-ons'] as const;
const BADGES = ['New Arrival', 'Best Seller', 'Artisan Heritage', 'Limited Run'] as const;

// Images come from Cloudinary or the site itself; anything else could point shoppers anywhere
const imageUrl = z
  .string()
  .trim()
  .refine((v) => /^https:\/\/\S+$/.test(v) || /^\/images\/\S+$/.test(v), 'Image must be an https:// link or an /images/ path');

const variant = z.object({
  sku: z.string().trim().regex(/^[A-Za-z0-9_-]{4,40}$/, 'SKU must be 4-40 letters, numbers, dashes or underscores').transform((v) => v.toUpperCase()),
  size: z.enum(SIZES),
  color: z.string().trim().min(1).max(40),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Colour must be a hex value like #8C4E28'),
  stock: z.number().int('Stock must be a whole number').min(0, 'Stock cannot be negative').default(0),
  priceOverride: z.number().positive().optional(),
  supplierRef: z.string().trim().max(40).optional(),
});

const fields = {
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  subtitle: z.string().trim().max(160).optional(),
  description: z.string().trim().min(10, 'Describe the shoe in at least 10 characters').max(2000),
  category: z.enum(CATEGORIES, `Category must be one of ${CATEGORIES.join(', ')}`),
  price: z.number(wrongType('Price must be a number')).positive('Price must be more than 0').max(1_000_000),
  originalPrice: z.number(wrongType('Original price must be a number')).positive().max(1_000_000),
  images: z.array(imageUrl).min(1, 'Add at least one image').max(8, 'At most 8 images'),
  colors: z
    .array(z.object({ name: z.string().trim().min(1).max(40), hex: z.string().regex(/^#[0-9a-fA-F]{6}$/), imageIndex: z.number().int().min(0).default(0) }))
    .max(12),
  sizes: z.array(z.enum(SIZES)).max(6),
  variants: z.array(variant).max(60),
  material: z.string().trim().max(120),
  sole: z.string().trim().max(120),
  craftsmanshipLocation: z.string().trim().max(120),
  features: z.array(z.string().trim().min(1).max(120)).max(10),
  badge: z.union([z.enum(BADGES), z.null()]),
  isActive: z.boolean(),
};

const priceOrder = (d: { price?: number; originalPrice?: number }) =>
  d.price === undefined || d.originalPrice === undefined || d.originalPrice >= d.price;
const priceOrderMessage = { message: 'Original price cannot be lower than the selling price', path: ['originalPrice'] };

export const createProductSchema = z
  .object({ ...fields })
  .partial({ originalPrice: true, subtitle: true, colors: true, sizes: true, variants: true, material: true, sole: true, craftsmanshipLocation: true, features: true, badge: true, isActive: true })
  .refine(priceOrder, priceOrderMessage);

export const updateProductSchema = z
  .object({ ...fields })
  .partial()
  .refine(priceOrder, priceOrderMessage)
  .refine((d) => Object.keys(d).length > 0, { message: 'Nothing to update' });

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
