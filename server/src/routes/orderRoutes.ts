import { Router } from 'express';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
} from '../controllers/orderController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// POST /api/orders - Initiate order & reserve stock
router.post('/', createOrder);

// GET /api/orders/my-orders - Customer's orders
router.get('/my-orders', getMyOrders);

// GET /api/orders/:id - Specific order
router.get('/:id', getOrderById);

// POST /api/orders/:id/cancel - Cancel order & release stock
router.post('/:id/cancel', cancelOrder);

export default router;
