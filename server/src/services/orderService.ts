import mongoose from 'mongoose';
import { Order, IOrder, IOrderItemSnapshot, IShippingAddressSnapshot } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Inventory, IInventory } from '../models/Inventory.js';
import { Cart } from '../models/Cart.js';
import { SupplierOrder } from '../models/SupplierOrder.js';
import { escapeRegex } from './productService.js';
import { refundService } from './refundService.js';
import { couponService } from './couponService.js';
import { emailService } from './emailService.js';
import { restock } from './returnService.js';
import { OrderActor, orderFilterFor, ownerFilter } from './orderAccess.js';

const MAX_UNPAID_GUEST_ORDERS = 3;

export interface CreateOrderDTO {
  /** Absent for a guest order. */
  userId?: string;
  isGuest?: boolean;
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
    // Placing an order holds stock for 30 minutes without paying. A guest needs no account, so the number of
    // unpaid orders one email can hold at a time is capped, or someone could lock up the shelves for free.
    if (data.isGuest) {
      const waiting = await Order.countDocuments({
        isGuest: true,
        customerEmail: data.customerEmail.trim().toLowerCase(),
        orderStatus: 'pending_payment',
      });
      if (waiting >= MAX_UNPAID_GUEST_ORDERS) {
        throw new Error('You already have unpaid orders waiting. Please complete or cancel one before placing another.');
      }
    }

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

    // Clear the customer's saved bag once the order is placed (guests keep their bag in the browser only)
    if (data.userId) await Cart.findOneAndUpdate({ user: data.userId }, { items: [], subtotal: 0 });

    return order;
  }

  private async reserveAndCreateOrder(
    data: CreateOrderDTO,
    reservations: { inventory: IInventory; quantity: number }[]
  ): Promise<IOrder> {
    const {
      userId,
      isGuest,
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

    // 2. Validate Coupon & Discount (the server decides; an invalid code is an error, never a silent zero)
    let discount = 0;
    let cleanCoupon: string | undefined;
    if (couponCode && couponCode.trim()) {
      const check = await couponService.evaluate(couponCode, subtotal, userId, customerEmail);
      if (!check.ok) throw new Error(check.reason);
      discount = check.discount;
      cleanCoupon = check.coupon.code;
    }

    // 3. Shipping Fee (Complimentary for >= ₹1,999)
    const shippingFee = subtotal >= 1999 ? 0 : 149;
    const total = Math.max(0, subtotal - discount + shippingFee);

    // 4. Create Order document
    return Order.create({
      orderNumber,
      user: userId,
      isGuest: Boolean(isGuest),
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

  /**
   * Moves a guest order into the account of a signed-in customer who holds the order's link. Possession of the
   * link (it was emailed to the address on the order) is the proof, so no email matching is needed. Once claimed,
   * the guest link stops working and the account owns the order.
   */
  async claimGuestOrder(orderId: string, userId: string, token: string): Promise<IOrder> {
    const filter = orderFilterFor(orderId, { guestToken: token });
    const claimed = filter
      ? await Order.findOneAndUpdate(filter, { $set: { user: userId, isGuest: false }, $push: { statusHistory: { status: 'claimed', timestamp: new Date(), note: 'Order added to a customer account.' } } }, { new: true })
      : null;
    if (!claimed) throw new Error('This order link is not valid, or the order already belongs to an account.');
    return claimed;
  }

  /**
   * Emails a way back to an order. The reply never says whether the order exists, so this cannot be used to
   * find out which emails or order numbers are real.
   */
  async sendOrderLink(orderNumber: string, email: string): Promise<void> {
    const order = await Order.findOne({ orderNumber: orderNumber.trim().toUpperCase(), customerEmail: email.trim().toLowerCase() });
    if (order) await emailService.orderLink(order);
  }

  async getUserOrders(userId: string): Promise<any[]> {
    return Order.find({ user: userId }).select('-paymentDetails.gatewaySignature').sort({ createdAt: -1 }).lean();
  }

  /**
   * One order. With no actor the caller is staff and sees everything. A customer (signed in, or a guest
   * holding the order's link) sees only their own order, with tracking but not the supplier's wholesale
   * costs or the payment signature.
   */
  async getOrderById(orderId: string, actor?: OrderActor): Promise<any | null> {
    if (!mongoose.isValidObjectId(orderId)) return null;
    const query = actor ? orderFilterFor(orderId, actor) : { _id: orderId };
    if (!query) return null;

    const supplierFields = actor ? 'status trackingNumber carrier shipmentEvents shippedAt deliveredAt' : undefined;
    const order = await Order.findOne(query).populate('supplierOrderId', supplierFields).lean();
    if (order && actor && order.paymentDetails) {
      delete (order.paymentDetails as any).gatewaySignature;
    }
    return order;
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
      // Built from several optional pieces, so Mongoose 9's strict filter typing cannot check it statically
      { _id: orderId, orderStatus: 'pending_payment', paymentStatus: { $ne: 'paid' }, ...extraFilter } as any,
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

  async cancelOrder(orderId: string, actor: OrderActor, reason?: string): Promise<IOrder & { refund?: { amount: number; pending: boolean } }> {
    const filter = orderFilterFor(orderId, actor);
    const order = filter ? await Order.findOne(filter) : null;
    if (!order) {
      throw new Error('Order not found.');
    }

    // Paid orders can be cancelled until they ship, with a full refund
    if (order.paymentStatus === 'paid') {
      return this.cancelPaidOrder(order._id, { actor, reason });
    }

    const cancelled = await this.cancelUnpaidOrder(
      order._id,
      reason || 'Customer requested order cancellation.',
      ownerFilter(actor)
    );
    if (!cancelled) {
      const current = await Order.findById(order._id);
      throw new Error(`Order in '${current?.orderStatus ?? order.orderStatus}' state cannot be cancelled.`);
    }
    return cancelled;
  }

  /**
   * Cancels a paid order that has not shipped yet: one atomic claim, then the pairs
   * go back on the shelf, the workshop job is cancelled and the money is refunded.
   * If the gateway refuses the refund the order stays cancelled (the stock is already
   * back) and is flagged for an admin to retry, rather than leaving a half-done state.
   */
  async cancelPaidOrder(orderId: unknown, opts: { actor?: OrderActor; reason?: string; byWorkshop?: boolean } = {}) {
    const note = opts.reason || (opts.byWorkshop ? 'Cancelled by the workshop before dispatch.' : 'Customer cancelled before dispatch.');
    const filter: Record<string, unknown> = {
      _id: orderId,
      paymentStatus: 'paid',
      orderStatus: { $in: ['confirmed', 'processing'] },
    };
    if (opts.actor) Object.assign(filter, ownerFilter(opts.actor));

    const order = await Order.findOneAndUpdate(
      filter,
      { $set: { orderStatus: 'cancelled' }, $push: { statusHistory: { status: 'cancelled', timestamp: new Date(), note } } },
      { new: true }
    );
    if (!order) {
      const current = await Order.findById(orderId);
      throw new Error(
        `Order in '${current?.orderStatus}' state can no longer be cancelled. Once an order has shipped, request a return after delivery.`
      );
    }

    for (const item of order.items) {
      await restock(item.sku, item.quantity);
    }
    await SupplierOrder.updateOne(
      { customerOrder: order._id, status: { $nin: ['shipped', 'delivered', 'cancelled'] } },
      {
        $set: { status: 'cancelled' },
        $push: { shipmentEvents: { timestamp: new Date(), status: 'CANCELLED', location: 'Footzi Central Atelier, Agra', note: opts.byWorkshop ? 'Cancelled by the workshop before dispatch.' : 'Cancelled by the customer before dispatch.' } },
      }
    );

    let refund = { amount: 0, pending: false };
    try {
      const result = await refundService.refundOrder({
        orderId: order._id,
        reference: `cancel:${order._id}`,
        reason: `Cancelled order ${order.orderNumber}`,
        notify: false,
      });
      refund = { amount: result.amount, pending: false };
    } catch (error: any) {
      refund = { amount: 0, pending: true };
      await Order.updateOne(
        { _id: order._id },
        { $push: { statusHistory: { status: 'cancelled', timestamp: new Date(), note: `Refund could not be issued automatically (${error.message}). Awaiting manual retry.` } } }
      );
    }

    const fresh = (await Order.findById(order._id))!;
    void emailService.orderCancelled(fresh, refund.amount);
    return Object.assign(fresh, { refund });
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
