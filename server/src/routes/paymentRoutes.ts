import { Router } from 'express';
import {
  createPaymentOrder,
  verifyPayment,
  handleWebhook,
} from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Webhook endpoint (public, signature checked inside controller)
router.post('/webhook', handleWebhook);

// Protected payment endpoints
router.post('/create-order', authenticate, createPaymentOrder);
router.post('/verify', authenticate, verifyPayment);

export default router;
