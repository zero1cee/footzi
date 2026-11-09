import { Router } from 'express';
import { getProducts, getProductBySlug, addProductReview } from '../controllers/productController.js';

const router = Router();

// GET /api/products - List products with filters & pagination
router.get('/', getProducts);

// GET /api/products/:slug - Retrieve product by slug
router.get('/:slug', getProductBySlug);

// POST /api/products/:id/reviews - Submit customer review
router.post('/:id/reviews', addProductReview);

export default router;
