import { Order, IOrder, IOrderItemSnapshot, IShippingAddressSnapshot } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Inventory, IInventory } from '../models/Inventory.js';
import { Cart } from '../models/Cart.js';
import { escapeRegex } from './productService.js';

export interface CreateOrderDTO {
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: {
    productId: string;
    variantSku: string;
    size: any;
    color: string;
    quantity: number;
  }[];
  shippingAddress: IShippingAddressSnapshot;
  couponCode?: string;
}

export class OrderService {
  async createOrder(data: CreateOrderDTO): Promise<IOrder> {
    const reservations: { inventory: IInventory; quantity: number }[] = [];

    let order: IOrder;
    try {
      order = await this.reserveAndCreateOrder(data, reservations);
    } catch (error) {
      // Roll back every reservation made before the failure so stock is not stranded
      for (const { inventory, quantity } of reservations) {
        await inventory.releaseStock(quantity).catch(() => false);
      }
      throw error;
    }

    // Clear customer's server cart upon order placement
    await Cart.findOneAndUpdate({ user: data.userId }, { items: [], subtotal: 0 });

    return order;
  }

  private async reserveAndCreateOrder(
    data: CreateOrderDTO,
    reservations: { inventory: IInventory; quantity: number }[]
  ): Promise<IOrder> {
    const {
      userId,
      customerName,
      customerEmail,
      customerPhone,
      items: requestedItems,
      shippingAddress,
      couponCode,
    } = data;

    if (!requestedItems || requestedItems.length === 0) {
      throw new Error('Your shopping bag contains no items to order.');
    }

    const orderNumber = `FTZ-AGR-${Math.floor(100000 + Math.random() * 900000)}`;

    const orderItems: IOrderItemSnapshot[] = [];
    let subtotal = 0;

    // 1. Recalculate and validate prices & stock exclusively from database
    for (const reqItem of requestedItems) {
      const product = await Product.findById(reqItem.productId);
      if (!product || !product.isActive) {
        throw new Error(`Footwear product '${reqItem.productId}' is no longer available.`);
      }

      const variant = product.variants.find((v) => v.sku === reqItem.variantSku);
      if (!variant) {
        throw new Error(`Variant SKU '${reqItem.variantSku}' does not exist.`);
      }

      // Check Inventory
      let inventory = await Inventory.findOne({ variantSku: variant.sku });
      if (!inventory) {
        // Fallback: create inventory record if not initialized
        inventory = await Inventory.create({
          variantSku: variant.sku,
          product: product._id,
          size: variant.size,
          color: variant.color,
          availableStock: variant.stock,
          reservedStock: 0,
        });
      }

      if (inventory.availableStock < reqItem.quantity) {
        throw new Error(
          `Insufficient stock for ${product.name} (${variant.size} - ${variant.color}). Only ${inventory.availableStock} pairs available.`
        );
      }

      // Atomic stock reservation
      const reserved = await inventory.reserveStock(reqItem.quantity);
      if (!reserved) {
        throw new Error(
          `Insufficient stock for ${product.name} (${variant.size} - ${variant.color}). It was just reserved by another patron.`
        );
      }
      reservations.push({ inventory, quantity: reqItem.quantity });

      const unitPrice = variant.priceOverride ?? product.price;
      const lineTotal = unitPrice * reqItem.quantity;
      subtotal += lineTotal;

      orderItems.push({
        product: product._id as any,
        name: product.name,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        quantity: reqItem.quantity,
        unitPrice,
        discount: 0,
        lineTotal,
        image: product.images[0],
      });
    }

    // 2. Validate Coupon & Discount
    let discount = 0;
    const cleanCoupon = couponCode?.trim().toUpperCase();
    if (cleanCoupon === 'FOOTZI10') {
      discount = Math.round(subtotal * 0.1);
    } else if (cleanCoupon === 'AGRAFIRST') {
      discount = Math.round(subtotal * 0.15);
    }

    // 3. Shipping Fee (Complimentary for >= ₹1,999)
    const shippingFee = subtotal >= 1999 ? 0 : 149;
    const total = Math.max(0, subtotal - discount + shippingFee);

    // 4. Create Order document
    return Order.create({
      orderNumber,
      user: userId,
      customerName,
      customerEmail,
      customerPhone,
      items: orderItems,
      shippingAddress,
      subtotal,
      discount,
      couponCode: cleanCoupon,
      shippingFee,
      total,
      paymentStatus: 'pending',
      orderStatus: 'pending_payment',
      statusHistory: [
        {
          status: 'pending_payment',
          timestamp: new Date(),
          note: 'Order initiated. Awaiting Razorpay payment gateway confirmation.',
        },
      ],
    });
  }

  async getUserOrders(userId: string): Promise<any[]> {
    return Order.find({ user: userId }).sort({ createdAt: -1 }).lean();
  }

  async getOrderById(orderId: string, userId?: string): Promise<any | null> {
    const query: any = { _id: orderId };
    if (userId) {
      query.user = userId;
    }
    return Order.findOne(query).populate('supplierOrderId').lean();
  }

  /**
   * Cancels an order that has not been paid and releases its reserved stock.
   * The status change is a single conditional update, so when a patron cancel,
   * the expiry job and a payment verification race, exactly one of them wins and
   * the stock is released exactly once.
   */
  async cancelUnpaidOrder(
    orderId: unknown,
    note: string,
    extraFilter: Record<string, unknown> = {}
  ): Promise<IOrder | null> {
    const order = await Order.findOneAndUpdate(
      { _id: orderId, orderStatus: 'pending_payment', paymentStatus: { $ne: 'paid' }, ...extraFilter },
      {
        $set: { orderStatus: 'cancelled' },
        $push: { statusHistory: { status: 'cancelled', timestamp: new Date(), note } },
      },
      { new: true }
    );
    if (!order) return null;

    for (const item of order.items) {
      const inv = await Inventory.findOne({ variantSku: item.sku });
      if (inv) {
        await inv.releaseStock(item.quantity);
      }
    }
    return order;
  }

  async cancelOrder(orderId: string, userId: string, reason?: string): Promise<IOrder> {
    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
      throw new Error('Order not found.');
    }

    // A paid order has already had its stock deducted and money captured; undoing
    // that needs a refund, which goes through the returns workflow instead.
    if (order.paymentStatus === 'paid') {
      throw new Error('A paid order cannot be cancelled here. Please request a return instead.');
    }

    const cancelled = await this.cancelUnpaidOrder(
      order._id,
      reason || 'Customer requested order cancellation.',
      { user: userId }
    );
    if (!cancelled) {
      const current = await Order.findById(order._id);
      throw new Error(`Order in '${current?.orderStatus ?? order.orderStatus}' state cannot be cancelled.`);
    }
    return cancelled;
  }

  /**
   * Cancels orders that were created but never paid within the window, so an
   * abandoned checkout cannot hold stock forever. Safe to run from several
   * instances at once.
   */
  async expireStaleOrders(maxAgeMinutes = Number(process.env.ORDER_EXPIRY_MINUTES) || 30): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
    const stale = await Order.find({
      orderStatus: 'pending_payment',
      paymentStatus: { $ne: 'paid' },
      createdAt: { $lt: cutoff },
    })
      .select('_id')
      .limit(200)
      .lean();

    let expired = 0;
    for (const { _id } of stale) {
      const cancelled = await this.cancelUnpaidOrder(
        _id,
        `Payment was not completed within ${maxAgeMinutes} minutes. Order expired and stock released.`
      );
      if (cancelled) expired += 1;
    }
    return expired;
  }

  async getAllOrders(query: any = {}) {
    const status = typeof query.status === 'string' ? query.status : undefined;
    const search = typeof query.search === 'string' ? escapeRegex(query.search) : undefined;
    const page = Math.max(1, Math.floor(Number(query.page)) || 1);
    const limit = Math.min(100, Math.max(1, Math.floor(Number(query.limit)) || 20));
    const filter: any = {};

    if (status && status !== 'all') {
      filter.orderStatus = status;
    }

    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return {
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

export const orderService = new OrderService();
