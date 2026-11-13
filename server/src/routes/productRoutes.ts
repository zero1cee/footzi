import { Router } from 'express';
import { getProducts, getProductBySlug, addProductReview, suggestProducts } from '../controllers/productController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/products - List products with filters & pagination
router.get('/', getProducts);

// GET /api/products/suggest?q= - Search-box suggestions (declared before :slug so it is not read as a slug)
router.get('/suggest', suggestProducts);

// GET /api/products/:slug - Retrieve product by slug
router.get('/:slug', getProductBySlug);

// POST /api/products/:id/reviews - Submit customer review
router.post('/:id/reviews', authenticate, addProductReview);

export default router;
