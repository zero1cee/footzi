import { Response } from 'express';
import { orderService } from '../services/orderService.js';
import { orderAccessToken } from '../services/orderAccess.js';
import { AuthRequest, isAdminRole, forViewer } from '../middleware/auth.js';
import { z } from 'zod';

const createOrderSchema = z.object({
  customerName: z.string().min(2, 'Please enter your name'),
  customerEmail: z.string().trim().toLowerCase().email('Please enter a valid email address'),
  customerPhone: z.string().min(10, 'Enter a valid mobile number'),
  items: z.array(
    z.object({
      productId: z.string(),
      variantSku: z.string(),
      size: z.enum(['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11']),
      color: z.string(),
      quantity: z.number().int().min(1).max(10),
    })
  ).min(1, 'Your shopping bag contains no items to order.').max(50, 'An order can have at most 50 lines.'),

  shippingAddress: z.object({
    name: z.string().min(1, 'Please complete the delivery address'),
    phone: z.string().min(1, 'Please complete the delivery address'),
    addressLine: z.string().min(1, 'Please complete the delivery address'),
    city: z.string().min(1, 'Please complete the delivery address'),
    state: z.string().min(1, 'Please complete the delivery address'),
    pincode: z.string().min(1, 'Please complete the delivery address'),
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
      res.status(400).json({ error: 'Order validation failed', details: error.issues });
      return;
    }
    res.status(400).json({ error: error.message });
  }
};

/** Places an order without an account. The response carries the secret that proves the order is theirs. */
export const createGuestOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validated = createOrderSchema.parse(req.body);
    const order = await orderService.createOrder({ ...validated, isGuest: true });
    res.status(201).json({
      message: 'Order created successfully. Ready for payment.',
      order,
      accessToken: orderAccessToken(order._id),
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: error.issues[0]?.message || 'Order validation failed', details: error.issues });
      return;
    }
    res.status(400).json({ error: error.message });
  }
};

const lookupSchema = z.object({
  orderNumber: z.string().trim().min(6).max(30),
  email: z.string().trim().toLowerCase().email(),
});

/** "Email me my order link". Always answers the same, whether or not the order exists. */
export const lookupOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderNumber, email } = lookupSchema.parse(req.body);
    await orderService.sendOrderLink(orderNumber, email).catch((e) => console.error('[Footzi Orders] Link email failed:', e.message));
    res.status(200).json({ message: 'If that order number and email match, we have just emailed a link to the order.' });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Enter your order number and the email address you used.' });
      return;
    }
    res.status(400).json({ error: error.message });
  }
};

/** Adds a guest order to the signed-in customer's account, proving ownership with the order link's secret. */
export const claimOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { token } = z.object({ token: z.string().min(10).max(200) }).parse(req.body);
    const order = await orderService.claimGuestOrder(req.params.id as string, req.user!.id, token);
    res.status(200).json({ message: 'This order is now in your account.', order });
  } catch (error: any) {
    res.status(400).json({ error: error.name === 'ZodError' ? 'Order link is missing.' : error.message });
  }
};

export const getMyOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const orders = await orderService.getUserOrders(req.user.id);
    res.status(200).json(forViewer(req.user, orders));
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve orders', message: error.message });
  }
};

export const getOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    // Staff see everything; customers (signed in, or a guest with the order link) see only their own order
    const order = await orderService.getOrderById(id, isAdminRole(req.user?.role) ? undefined : req.orderActor);

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.status(200).json(forViewer(req.user, order));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const cancelOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { reason } = req.body;
    const cancelled = await orderService.cancelOrder(id, req.orderActor!, typeof reason === 'string' ? reason.slice(0, 200) : undefined);

    const refund = (cancelled as any).refund as { amount: number; pending: boolean } | undefined;
    res.status(200).json({
      message: refund
        ? refund.pending
          ? 'Order cancelled. Your refund is being processed by our team.'
          : `Order cancelled. A refund of ₹${refund.amount} has been issued to your original payment method.`
        : 'Order cancelled and stock released',
      order: forViewer(req.user, cancelled),
      refund: refund ?? null,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
