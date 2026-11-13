import { Router } from 'express';
import {
  createOrder,
  createGuestOrder,
  lookupOrder,
  claimOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
} from '../controllers/orderController.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { resolveOrderActor } from '../middleware/orderActor.js';

const router = Router();

// Public: place an order without an account, or ask for a link back to one
router.post('/guest', createGuestOrder);
router.post('/lookup', lookupOrder);

// Signed-in customers
router.post('/', authenticate, createOrder);
router.get('/my-orders', authenticate, getMyOrders);
router.post('/:id/claim', authenticate, claimOrder);

// One order: a signed-in customer, staff, or a guest holding the order's link
router.get('/:id', optionalAuthenticate, resolveOrderActor, getOrderById);
router.post('/:id/cancel', optionalAuthenticate, resolveOrderActor, cancelOrder);

export default router;
