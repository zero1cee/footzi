import { Router } from 'express';
import {
  getCart,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
} from '../controllers/cartController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All cart endpoints require user authentication
router.use(authenticate);

router.get('/', getCart);
router.post('/items', addItem);
router.patch('/items/:id', updateItemQuantity);
router.delete('/items/:id', removeItem);
router.delete('/', clearCart);

export default router;
