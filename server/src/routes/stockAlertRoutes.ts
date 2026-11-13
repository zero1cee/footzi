import { Router } from 'express';
import { subscribeToStockAlert } from '../controllers/stockAlertController.js';

const router = Router();

// Public: anyone can ask to be told when a sold-out size returns
router.post('/', subscribeToStockAlert);

export default router;
