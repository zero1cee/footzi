import { Router } from 'express';
import { validateCoupon } from '../controllers/couponController.js';
import { optionalAuthenticate } from '../middleware/auth.js';

const router = Router();

// Public: guests can preview a code; signed-in customers also get their personal limits checked
router.post('/validate', optionalAuthenticate, validateCoupon);

export default router;
