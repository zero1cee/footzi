import { Request, Response } from 'express';
import { productService } from '../services/productService.js';

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
      category: category as string,
      brand: brand as string,
      badge: badge as string,
      search: search as string,
      size: size as string,
      color: color as string,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      inStockOnly: inStockOnly === 'true',
      sort: sort as string,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 9,
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
