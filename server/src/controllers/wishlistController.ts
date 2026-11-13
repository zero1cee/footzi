import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';
import { wishlistService } from '../services/wishlistService.js';

// Items are checked one by one in the service, so one bad entry never rejects the whole list
const mergeSchema = z.object({ productIds: z.array(z.unknown()).max(200, 'Too many styles in one request') });

export const getWishlist = async (req: AuthRequest, res: Response): Promise<void> => {
  res.status(200).json({ productIds: await wishlistService.get(req.user!.id) });
};

export const addToWishlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.status(200).json({ productIds: await wishlistService.add(req.user!.id, req.params.productId as string) });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const removeFromWishlist = async (req: AuthRequest, res: Response): Promise<void> => {
  res.status(200).json({ productIds: await wishlistService.remove(req.user!.id, req.params.productId as string) });
};

export const mergeWishlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productIds } = mergeSchema.parse(req.body);
    res.status(200).json({ productIds: await wishlistService.merge(req.user!.id, productIds) });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: error.issues[0]?.message || 'Validation failed' });
      return;
    }
    res.status(400).json({ error: error.message });
  }
};
