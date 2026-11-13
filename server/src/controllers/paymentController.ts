import { Request, Response } from 'express';
import { paymentService } from '../services/paymentService.js';
import { AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';
import { required } from '../validators/messages.js';

const createPaymentOrderSchema = z.object({
  orderId: z.string(required('Order ID is required')),
});

const verifyPaymentSchema = z.object({
  orderId: z.string(required('Order ID is required')),
  razorpayOrderId: z.string(required('Razorpay order ID is required')),
  razorpayPaymentId: z.string(required('Razorpay payment ID is required')),
  razorpaySignature: z.string(required('Cryptographic signature is required')),
});

export const createPaymentOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId } = createPaymentOrderSchema.parse(req.body);
    const gatewayOrder = await paymentService.createGatewayOrder(orderId, req.orderActor!);

    res.status(200).json(gatewayOrder);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error.issues });
      return;
    }
    res.status(400).json({ error: error.message });
  }
};

export const verifyPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validated = verifyPaymentSchema.parse(req.body);
    const result = await paymentService.verifyPaymentSignature({
      ...validated,
      actor: req.orderActor!,
    });

    if (!result.verified) {
      res.status(400).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error.issues });
      return;
    }
    res.status(400).json({ error: error.message });
  }
};

export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const result = await paymentService.handleWebhook(req.body, signature || '', (req as any).rawBody);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
