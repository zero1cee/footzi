import { Router } from 'express';
import {
  createReturn,
  getMyReturns,
  getReturnById,
} from '../controllers/returnController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Protect all patron return routes
router.use(authenticate);

router.post('/', createReturn);
router.get('/my-returns', getMyReturns);
router.get('/:id', getReturnById);

export default router;
