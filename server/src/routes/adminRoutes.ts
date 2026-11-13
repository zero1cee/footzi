import { Router } from 'express';
import {
  getDashboardAnalytics,
  getAllOrdersAdmin,
  getSupplierOrders,
  fulfillSupplierOrder,
  getInventoryOverview,
  updateInventoryStockAdmin,
  getProductsAdmin,
  createProductAdmin,
  updateProductAdmin,
  deleteProductAdmin,
  toggleProductActiveAdmin,
  uploadProductImageAdmin,
  refundCancelledOrderAdmin,
} from '../controllers/adminController.js';
import {
  getAllReturnsAdmin,
  updateReturnStatusAdmin,
} from '../controllers/returnController.js';
import { listCouponsAdmin, createCouponAdmin, updateCouponAdmin } from '../controllers/couponController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Protect all admin endpoints
router.use(authenticate, requireAdmin);

// Analytics & Orders
router.get('/analytics', getDashboardAnalytics);
router.get('/orders', getAllOrdersAdmin);
router.post('/orders/:id/refund', refundCancelledOrderAdmin);

// Inventory Control
router.get('/inventory', getInventoryOverview);
router.patch('/inventory/:sku', updateInventoryStockAdmin);

// Supplier Fulfillment Pipeline
router.get('/supplier-orders', getSupplierOrders);
router.post('/supplier-orders/:id/fulfill', fulfillSupplierOrder);

// Catalog & Product Operations
router.get('/products', getProductsAdmin);
router.post('/products', createProductAdmin);
router.put('/products/:id', updateProductAdmin);
router.delete('/products/:id', deleteProductAdmin);
router.patch('/products/:id/toggle-active', toggleProductActiveAdmin);
router.post('/products/upload-image', uploadProductImageAdmin);

// Coupons
router.get('/coupons', listCouponsAdmin);
router.post('/coupons', createCouponAdmin);
router.put('/coupons/:id', updateCouponAdmin);

// Returns & Exchanges Management
router.get('/returns', getAllReturnsAdmin);
router.patch('/returns/:id', updateReturnStatusAdmin);

export default router;
