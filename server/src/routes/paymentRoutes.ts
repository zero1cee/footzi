import { Router } from 'express';
import {
  createPaymentOrder,
  verifyPayment,
  handleWebhook,
} from '../controllers/paymentController.js';
import { optionalAuthenticate } from '../middleware/auth.js';
import { resolveOrderActor } from '../middleware/orderActor.js';

const router = Router();

// Webhook endpoint (public, signature checked inside controller)
router.post('/webhook', handleWebhook);

// Paying for an order: its owner (signed in) or a guest holding the order's link
router.post('/create-order', optionalAuthenticate, resolveOrderActor, createPaymentOrder);
router.post('/verify', optionalAuthenticate, resolveOrderActor, verifyPayment);

export default router;
