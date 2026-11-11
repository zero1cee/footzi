import { Request, Response } from 'express';
import { productService } from '../services/productService.js';

// Query params can arrive as arrays or objects (?category[$ne]=x). Only plain
// strings are passed on, so operators can never be smuggled into a Mongo query.
const str = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value.slice(0, 100) : undefined;

const num = (value: unknown): number | undefined => {
  const n = Number(str(value));
  return Number.isFinite(n) ? n : undefined;
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

export const addProductReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { author, city, rating, title, comment, sizePurchased } = req.body;

    if (!author || !rating || !comment) {
      res.status(400).json({ error: 'Author, rating and comment are required' });
      return;
    }

    const updated = await productService.addReview(id, {
      author,
      city: city || 'India',
      rating: Number(rating),
      title: title || 'Patron Review',
      comment,
      sizePurchased: sizePurchased || 'UK 8',
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      verified: true,
    });

    if (!updated) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.status(201).json({ message: 'Review successfully recorded', product: updated });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to record review', message: error.message });
  }
};
