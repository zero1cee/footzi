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
import { cloudinaryService } from '../services/cloudinaryService.js';

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

export const createProductAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = await productService.createProduct(req.body);
    res.status(201).json({
      message: 'Product handcrafted and added to catalog successfully',
      product,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const updateProductAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const updated = await productService.updateProduct(id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.status(200).json({
      message: 'Product specifications and inventory updated successfully',
      product: updated,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
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
    const { image, folder } = req.body;
    if (!image) {
      res.status(400).json({ error: 'Image data or URL is required for Cloudinary upload' });
      return;
    }

    const uploadResult = await cloudinaryService.uploadProductImage(
      image,
      folder || 'footzi/products'
    );

    res.status(200).json({
      message: 'Product image successfully uploaded and optimized via Cloudinary CDN',
      ...uploadResult,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
