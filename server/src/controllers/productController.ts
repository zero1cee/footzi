import { Request, Response } from 'express';
import { z } from 'zod';
import { productService } from '../services/productService.js';
import { AuthRequest } from '../middleware/auth.js';

// Query params can arrive as arrays or objects (?category[$ne]=x). Only plain
// strings are passed on, so operators can never be smuggled into a Mongo query.
const str = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value.slice(0, 100) : undefined;

const num = (value: unknown): number | undefined => {
  const n = Number(str(value));
  return Number.isFinite(n) ? n : undefined;
};

export const suggestProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const suggestions = await productService.suggest(str(req.query.q) ?? '');
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.status(200).json({ suggestions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      category,
      brand,
      badge,
      search,
      size,
      color,
      minPrice,
      maxPrice,
      inStockOnly,
      sort,
      page,
      limit,
    } = req.query;

    const result = await productService.getProducts({
      category: str(category),
      brand: str(brand),
      badge: str(badge),
      search: str(search),
      size: str(size),
      color: str(color),
      minPrice: num(minPrice),
      maxPrice: num(maxPrice),
      inStockOnly: inStockOnly === 'true',
      sort: str(sort),
      page: Math.max(1, Math.floor(num(page) ?? 1)),
      limit: Math.min(100, Math.max(1, Math.floor(num(limit) ?? 9))),
    });

    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve footwear products', message: error.message });
  }
};

export const getProductBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = req.params.slug as string;
    const product = await productService.getProductBySlug(slug);

    if (!product) {
      res.status(404).json({ error: 'Product silhouette not found' });
      return;
    }

    res.status(200).json(product);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve product details', message: error.message });
  }
};

const reviewSchema = z.object({
  rating: z.number().int().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5'),
  title: z.string().trim().max(100).optional(),
  comment: z.string().trim().min(3, 'Please write a few words about the pair').max(1000),
  city: z.string().trim().max(60).optional(),
  sizePurchased: z.enum(['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11']).optional(),
});

export const addProductReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Please sign in to write a review' });
      return;
    }

    const data = reviewSchema.parse(req.body);
    const result = await productService.addReview(req.params.id as string, req.user, data);

    if (result === 'not_found') {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    if (result === 'duplicate') {
      res.status(409).json({ error: 'You have already reviewed this product' });
      return;
    }

    res.status(201).json({ message: 'Review successfully recorded', review: result.review, product: result.product });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: error.errors[0]?.message || 'Invalid review', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to record review', message: error.message });
  }
};
