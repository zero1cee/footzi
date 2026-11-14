import mongoose from 'mongoose';
import { ReturnRequest, IReturnRequest, ReturnStatus, ReturnType, IReturnItem } from '../models/ReturnRequest.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Inventory } from '../models/Inventory.js';
import { refundService } from './refundService.js';
import { emailService } from './emailService.js';
import { settingsService } from './settingsService.js';

export const RETURN_REASONS = [
  'Fit issue - too tight',
  'Fit issue - too loose',
  'Patina variation',
  'Defective craftsmanship',
  'Changed mind',
] as const;

export interface CreateReturnDTO {
  orderId: string;
  type: ReturnType;
  items: {
    sku: string;
    quantity: number;
    reason: IReturnItem['reason'];
    replacementSize?: IReturnItem['replacementSize'];
  }[];
  customerComments?: string;
}

// Each request moves forward one step at a time; the three endings are final.
const TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  requested: ['approved', 'rejected'],
  approved: ['pickup_scheduled', 'rejected'],
  pickup_scheduled: ['inspected', 'rejected'],
  inspected: ['replacement_dispatched', 'refund_processed', 'rejected'],
  replacement_dispatched: [],
  refund_processed: [],
  rejected: [],
};

export const nextReturnStatuses = (status: ReturnStatus, type: ReturnType): ReturnStatus[] =>
  TRANSITIONS[status].filter((next) => {
    if (next === 'replacement_dispatched') return type === 'exchange';
    if (next === 'refund_processed') return type === 'return';
    return true;
  });

/** When the customer received the order: the latest "delivered" entry in its history. */
const deliveredAt = (order: any): Date => {
  const entries = (order.statusHistory || []).filter((h: any) => h.status === 'delivered');
  const last = entries[entries.length - 1];
  return new Date(last?.timestamp ?? order.updatedAt);
};

/** Puts returned or replaced-out pairs back on the shelf, in both the inventory ledger and the catalog. */
export const restock = async (sku: string, quantity: number) => {
  await Inventory.updateOne({ variantSku: sku }, { $inc: { availableStock: quantity } });
  await Product.updateOne({ 'variants.sku': sku }, { $inc: { 'variants.$.stock': quantity } });
};

export class ReturnService {
  async createReturnRequest(userId: string, data: CreateReturnDTO): Promise<IReturnRequest> {
    const { orderId, type, items, customerComments } = data;

    if (!items || items.length === 0) {
      throw new Error('At least one footwear item must be selected for return or size exchange');
    }
    if (!mongoose.isValidObjectId(orderId)) {
      throw new Error('Order not found or does not belong to this patron account');
    }

    // 1. The order must be the patron's own, paid and delivered, and still inside the window
    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
      throw new Error('Order not found or does not belong to this patron account');
    }
    if (order.paymentStatus !== 'paid' || order.orderStatus !== 'delivered') {
      throw new Error('Returns and size exchanges open once your order has been delivered');
    }
    const { returnWindowDays } = await settingsService.get();
    const windowEnds = deliveredAt(order).getTime() + returnWindowDays * 24 * 60 * 60 * 1000;
    if (Date.now() > windowEnds) {
      throw new Error(`The ${returnWindowDays}-day return window for this order has closed`);
    }

    // 2. Pairs already covered by earlier, non-rejected requests cannot be claimed twice
    const earlier = await ReturnRequest.find({ order: order._id, status: { $ne: 'rejected' } }).lean();
    const claimed = new Map<string, number>();
    for (const request of earlier) {
      for (const item of request.items) {
        claimed.set(item.sku, (claimed.get(item.sku) ?? 0) + item.quantity);
      }
    }

    // Everything about an item comes from the order itself, never from the request
    const reservations: { sku: string; quantity: number }[] = [];
    const releaseReservations = async () => {
      for (const { sku, quantity } of reservations) {
        const inv = await Inventory.findOne({ variantSku: sku });
        await inv?.releaseStock(quantity).catch(() => false);
      }
    };

    try {
      const returnItems: IReturnItem[] = [];
      const discountShare = order.subtotal > 0 ? order.discount / order.subtotal : 0;

      for (const requested of items) {
        const orderItem = order.items.find((i) => i.sku === requested.sku);
        if (!orderItem) {
          throw new Error(`Item ${requested.sku} is not part of this order`);
        }

        const remaining = orderItem.quantity - (claimed.get(orderItem.sku) ?? 0);
        if (requested.quantity > remaining) {
          throw new Error(
            remaining > 0
              ? `Only ${remaining} pair(s) of ${orderItem.name} can still be returned or exchanged`
              : `${orderItem.name} already has a return or exchange request`
          );
        }
        claimed.set(orderItem.sku, (claimed.get(orderItem.sku) ?? 0) + requested.quantity);

        const returnItem: IReturnItem = {
          sku: orderItem.sku,
          productName: orderItem.name,
          size: orderItem.size,
          color: orderItem.color,
          quantity: requested.quantity,
          // The customer is refunded what they paid for the pair, coupon share included
          price: Math.round(orderItem.unitPrice * (1 - discountShare)),
          reason: requested.reason,
        };

        if (type === 'exchange') {
          if (!requested.replacementSize) {
            throw new Error(`Replacement shoe size must be specified for ${orderItem.name}`);
          }
          if (requested.replacementSize === orderItem.size) {
            throw new Error('Please choose a different size for the exchange');
          }

          const product = await Product.findById(orderItem.product);
          const variant = product?.variants.find(
            (v) => v.size === requested.replacementSize && v.color === orderItem.color
          );
          if (!variant) {
            throw new Error(`${orderItem.name} is not available in ${requested.replacementSize} (${orderItem.color})`);
          }

          // Hold the replacement pair for this patron straight away
          const inv = await Inventory.findOne({ variantSku: variant.sku });
          if (!inv || !(await inv.reserveStock(requested.quantity))) {
            throw new Error(`${requested.replacementSize} in ${orderItem.color} is out of stock right now`);
          }
          reservations.push({ sku: variant.sku, quantity: requested.quantity });

          returnItem.replacementSize = requested.replacementSize;
          returnItem.replacementColor = orderItem.color;
          returnItem.replacementSku = variant.sku;
        }

        returnItems.push(returnItem);
      }

      const refundAmount =
        type === 'return' ? returnItems.reduce((sum, item) => sum + item.price * item.quantity, 0) : 0;

      const returnRequest = new ReturnRequest({
        returnNumber: `RET-AGR-${Math.floor(100000 + Math.random() * 900000)}`,
        order: order._id,
        user: new mongoose.Types.ObjectId(userId),
        type,
        items: returnItems,
        customerComments: customerComments || '',
        status: 'requested',
        pickupTrackingNumber: `BD-REV-${Math.floor(10000000 + Math.random() * 90000000)}IN`,
        carrier: 'BlueDart Reverse Logistics',
        refundAmount,
      });

      await returnRequest.save();
      return returnRequest;
    } catch (error) {
      await releaseReservations();
      throw error;
    }
  }

  async getUserReturns(userId: string): Promise<any[]> {
    return ReturnRequest.find({ user: userId })
      .populate('order', 'orderNumber orderStatus total createdAt')
      .sort({ createdAt: -1 })
      .lean();
  }

  async getAllReturns(query: any = {}): Promise<any[]> {
    const filter: any = {};
    if (typeof query.status === 'string') {
      filter.status = query.status;
    }
    if (typeof query.type === 'string') {
      filter.type = query.type;
    }

    return ReturnRequest.find(filter)
      .populate('order', 'orderNumber orderStatus total shippingAddress')
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();
  }

  async getReturnById(returnId: string): Promise<any | null> {
    if (!mongoose.isValidObjectId(returnId)) return null;
    return ReturnRequest.findById(returnId)
      .populate('order', 'orderNumber orderStatus total shippingAddress items')
      .populate('user', 'name email phone')
      .lean();
  }

  async updateReturnStatus(
    returnId: string,
    status: ReturnStatus,
    adminNotes?: string,
    replacementTrackingNumber?: string
  ): Promise<IReturnRequest> {
    const request = mongoose.isValidObjectId(returnId) ? await ReturnRequest.findById(returnId) : null;
    if (!request) {
      throw new Error(`Return request #${returnId} not found`);
    }

    if (!nextReturnStatuses(request.status, request.type).includes(status)) {
      const allowed = nextReturnStatuses(request.status, request.type);
      throw new Error(
        allowed.length > 0
          ? `A ${request.status} request can only move to: ${allowed.join(', ')}`
          : `This request is ${request.status} and can no longer change`
      );
    }

    // Money goes back before the request is closed. The refund is idempotent per
    // return request, so if closing fails or is retried the customer is never paid twice,
    // and if the gateway refuses, the request simply stays open for another attempt.
    let refundNote = '';
    if (status === 'refund_processed') {
      const refund = await refundService.refundOrder({
        orderId: request.order,
        reference: `return:${request._id}`,
        reason: `Return ${request.returnNumber}`,
        amount: request.refundAmount,
        notify: false,
      });
      refundNote = `Refund of ₹${refund.amount} issued (${refund.refundId}).`;
    }

    const update: Record<string, unknown> = { status };
    if (refundNote) update.adminNotes = [adminNotes, refundNote].filter(Boolean).join(' ');
    if (adminNotes && !refundNote) update.adminNotes = adminNotes;
    if (status === 'replacement_dispatched') {
      update.replacementTrackingNumber =
        replacementTrackingNumber || `BD-EXC-${Math.floor(10000000 + Math.random() * 90000000)}IN`;
    }

    // Only one admin action can move a request out of its current status, so the
    // stock changes below run exactly once.
    const moved = await ReturnRequest.findOneAndUpdate(
      { _id: request._id, status: request.status },
      { $set: update },
      { new: true }
    );
    if (!moved) {
      throw new Error('This request was just updated by someone else. Please refresh and try again.');
    }

    if (status === 'rejected' && moved.type === 'exchange') {
      // Give the held replacement pairs back
      for (const item of moved.items) {
        if (!item.replacementSku) continue;
        const inv = await Inventory.findOne({ variantSku: item.replacementSku });
        await inv?.releaseStock(item.quantity);
      }
    } else if (status === 'replacement_dispatched') {
      // The replacement leaves the shelf and the original pair comes back
      for (const item of moved.items) {
        if (item.replacementSku) {
          const inv = await Inventory.findOne({ variantSku: item.replacementSku });
          await inv?.confirmFulfillment(item.quantity);
          await Product.updateOne(
            { 'variants.sku': item.replacementSku },
            { $inc: { 'variants.$.stock': -item.quantity } }
          );
        }
        await restock(item.sku, item.quantity);
      }
    } else if (status === 'refund_processed') {
      for (const item of moved.items) {
        await restock(item.sku, item.quantity);
      }
    }

    void this.notifyCustomer(moved);
    return moved;
  }

  private async notifyCustomer(request: IReturnRequest): Promise<void> {
    const order = await Order.findById(request.order).select('customerEmail orderNumber');
    if (!order) return;
    const copy: Partial<Record<ReturnStatus, [string, string]>> = {
      approved: ['Request approved', 'We approved your request. A pickup will be scheduled shortly.'],
      pickup_scheduled: ['Pickup scheduled', 'Our courier will collect the pair from your address. Please keep it in its original box.'],
      inspected: ['Pair received and inspected', 'Your pair reached the workshop and passed inspection.'],
      replacement_dispatched: ['Replacement on its way', 'Your replacement pair has been dispatched.'],
      refund_processed: ['Refund issued', `₹${request.refundAmount ?? 0} has been refunded to your original payment method. Allow 5–7 working days.`],
      rejected: ['Request declined', request.adminNotes || 'We could not approve this request.'],
    };
    const entry = copy[request.status];
    if (entry) await emailService.returnUpdate(order.customerEmail, request, entry[0], entry[1]);
  }
}

export const returnService = new ReturnService();
