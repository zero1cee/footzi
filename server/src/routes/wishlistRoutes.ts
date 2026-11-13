import { Router } from 'express';
import { getWishlist, addToWishlist, removeFromWishlist, mergeWishlist } from '../controllers/wishlistController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', getWishlist);
router.post('/merge', mergeWishlist);
router.put('/:productId', addToWishlist);
router.delete('/:productId', removeFromWishlist);

export default router;
