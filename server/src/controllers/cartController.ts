import { Response } from 'express';
import { cartService } from '../services/cartService.js';
import { addToCartSchema, updateCartItemSchema } from '../validators/cartValidators.js';
import { AuthRequest } from '../middleware/auth.js';

export const getCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const cart = await cartService.getCart(req.user.id);
    res.status(200).json(cart);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve cart', message: error.message });
  }
};

export const addItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const validatedData = addToCartSchema.parse(req.body);
    const cart = await cartService.addItem(req.user.id, validatedData);
    res.status(200).json({ message: 'Item added to bag', cart });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    res.status(400).json({ error: error.message });
  }
};

export const updateItemQuantity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const itemId = req.params.id as string;
    const { quantity } = updateCartItemSchema.parse(req.body);

    const cart = await cartService.updateQuantity(req.user.id, itemId, quantity);
    res.status(200).json({ message: 'Cart updated', cart });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    res.status(400).json({ error: error.message });
  }
};

export const removeItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const itemId = req.params.id as string;
    const cart = await cartService.removeItem(req.user.id, itemId);
    res.status(200).json({ message: 'Item removed from bag', cart });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const clearCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const cart = await cartService.clearCart(req.user.id);
    res.status(200).json({ message: 'Bag cleared', cart });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to clear bag', message: error.message });
  }
};
