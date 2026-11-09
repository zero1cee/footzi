import { Response } from 'express';
import { orderService } from '../services/orderService.js';
import { AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const createOrderSchema = z.object({
  customerName: z.string().min(2),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(10),
  items: z.array(
    z.object({
      productId: z.string(),
      variantSku: z.string(),
      size: z.enum(['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11']),
      color: z.string(),
      quantity: z.number().int().min(1).max(10),
    })
  ),
  shippingAddress: z.object({
    name: z.string(),
    phone: z.string(),
    addressLine: z.string(),
    city: z.string(),
    state: z.string(),
    pincode: z.string(),
  }),
  couponCode: z.string().optional(),
});

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const validated = createOrderSchema.parse(req.body);
    const order = await orderService.createOrder({
      userId: req.user.id,
      ...validated,
    });

    res.status(201).json({
      message: 'Order created successfully. Ready for payment.',
      order,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Order validation failed', details: error.errors });
      return;
    }
    res.status(400).json({ error: error.message });
  }
};

export const getMyOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const orders = await orderService.getUserOrders(req.user.id);
    res.status(200).json(orders);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve orders', message: error.message });
  }
};

export const getOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const order = await orderService.getOrderById(id, req.user?.role === 'admin' ? undefined : req.user?.id);

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.status(200).json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const cancelOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const id = req.params.id as string;
    const { reason } = req.body;
    const cancelled = await orderService.cancelOrder(id, req.user.id, reason);

    res.status(200).json({ message: 'Order cancelled and stock released', order: cancelled });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
