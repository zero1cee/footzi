import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Inventory } from '../models/Inventory.js';
import { SupplierOrder } from '../models/SupplierOrder.js';
import { ReturnRequest } from '../models/ReturnRequest.js';
import { supplierFulfillmentService } from '../services/supplierFulfillmentService.js';
import { orderService } from '../services/orderService.js';
import { productService } from '../services/productService.js';
import { stockAlertService } from '../services/stockAlertService.js';
import { refundService } from '../services/refundService.js';
import { createProductSchema, updateProductSchema } from '../validators/productValidators.js';
import { cloudinaryService, UploadError } from '../services/cloudinaryService.js';

export const getDashboardAnalytics = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 1. Total revenue & orders from paid orders
    const revenueAgg = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, totalRevenue: { $sum: '$total' }, count: { $sum: 1 } } },
    ]);

    const totalRevenue = revenueAgg[0]?.totalRevenue || 0;
    const totalPaidOrders = revenueAgg[0]?.count || 0;
    const totalOrdersCount = await Order.countDocuments();

    // 2. Total active products
    const totalProducts = await Product.countDocuments({ isActive: true });

    // 3. Low stock inventory variants (< 5)
    const lowStockVariants = await Inventory.find({ availableStock: { $lte: 5 } })
      .populate('product', 'name category')
      .lean();

    // 4. Supplier orders summary
    const activeSupplierOrders = await SupplierOrder.countDocuments({
      status: { $in: ['submitted', 'accepted', 'processing'] },
    });

    // 5. Returns & Exchange statistics
    const totalReturnsCount = await ReturnRequest.countDocuments();
    const pendingReturnsCount = await ReturnRequest.countDocuments({
      status: { $in: ['requested', 'approved', 'pickup_scheduled'] },
    });
    const returnRatePercent =
      totalPaidOrders > 0
        ? Number(((totalReturnsCount / totalPaidOrders) * 100).toFixed(1))
        : 0;

    // 6. Recent 5 customer orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.status(200).json({
      metrics: {
        totalRevenue,
        totalPaidOrders,
        totalOrdersCount,
        totalProducts,
        lowStockCount: lowStockVariants.length,
        activeSupplierOrders,
        totalReturnsCount,
        pendingReturnsCount,
        returnRatePercent,
      },
      lowStockVariants,
      recentOrders,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to compute dashboard analytics', message: error.message });
  }
};

export const getAllOrdersAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orders = await orderService.getAllOrders(req.query);
    res.status(200).json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getSupplierOrders = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orders = await supplierFulfillmentService.getAllSupplierOrders();
    res.status(200).json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const fulfillSupplierOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status, note } = req.body;

    if (!status) {
      res.status(400).json({ error: 'Target supplier status is required' });
      return;
    }

    const updated = await supplierFulfillmentService.transitionSupplierOrderStatus(id, status, note);
    res.status(200).json({
      message: `Supplier order successfully transitioned to ${status}`,
      supplierOrder: updated,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getInventoryOverview = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const inventory = await Inventory.find()
      .populate('product', 'name category images price')
      .sort({ availableStock: 1 })
      .lean();

    res.status(200).json(inventory);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const sendProductError = (res: Response, error: any): void => {
  if (error.name === 'ZodError') {
    res.status(400).json({ error: error.issues[0]?.message || 'Validation failed', details: error.issues });
    return;
  }
  res.status(400).json({ error: error.message });
};

/** Every product including archived ones, so an archived shoe can be brought back. */
export const getProductsAdmin = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.status(200).json(await productService.getProducts({ limit: 200, includeInactive: true, sort: 'newest' }));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createProductAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = await productService.createProduct(createProductSchema.parse(req.body));
    res.status(201).json({
      message: 'Product handcrafted and added to catalog successfully',
      product,
    });
  } catch (error: any) {
    sendProductError(res, error);
  }
};

export const updateProductAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const updated = await productService.updateProduct(id, updateProductSchema.parse(req.body));
    if (!updated) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.status(200).json({
      message: 'Product specifications and inventory updated successfully',
      product: updated,
    });
  } catch (error: any) {
    sendProductError(res, error);
  }
};

export const deleteProductAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const success = await productService.deleteProduct(id);
    if (!success) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.status(200).json({ message: 'Product archived successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const toggleProductActiveAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const product = await productService.toggleProductActive(id);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.status(200).json({
      message: `Product is now ${product.isActive ? 'active in catalog' : 'deactivated'}`,
      isActive: product.isActive,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const updateInventoryStockAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sku = req.params.sku as string;
    const { availableStock } = req.body;

    if (availableStock === undefined || availableStock < 0) {
      res.status(400).json({ error: 'Valid positive stock number required' });
      return;
    }

    const updated = await productService.updateInventoryStock(sku, availableStock);
    // Anyone waiting on this size hears about it straight away rather than at the next sweep
    if (updated && availableStock > 0) void stockAlertService.sweep().catch(() => {});
    if (!updated) {
      res.status(404).json({ error: `Variant with SKU ${sku} not found` });
      return;
    }

    res.status(200).json({
      message: `Inventory stock updated for variant ${sku}`,
      inventory: updated,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const uploadProductImageAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { image } = req.body;
    if (!image) {
      res.status(400).json({ error: 'Image data or URL is required for Cloudinary upload' });
      return;
    }

    const uploadResult = await cloudinaryService.uploadProductImage(String(image), 'footzi/products');

    res.status(200).json({
      message: 'Product image successfully uploaded and optimized via Cloudinary CDN',
      ...uploadResult,
    });
  } catch (error: any) {
    res.status(error instanceof UploadError ? error.status : 500).json({ error: error.message });
  }
};

/** Retries the refund for a cancelled order whose automatic refund failed. Safe to repeat. */
export const refundCancelledOrderAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    if (order.orderStatus !== 'cancelled' || order.paymentStatus === 'pending') {
      res.status(400).json({ error: 'Only cancelled orders that were paid can be refunded here.' });
      return;
    }

    const result = await refundService.refundOrder({
      orderId: order._id,
      reference: `cancel:${order._id}`,
      reason: `Cancelled order ${order.orderNumber}`,
    });
    res.status(200).json({
      message: result.alreadyIssued ? 'This order was already refunded.' : `Refund of ₹${result.amount} issued.`,
      refund: result,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
