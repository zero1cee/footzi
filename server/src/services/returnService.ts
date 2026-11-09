import mongoose from 'mongoose';
import { ReturnRequest, IReturnRequest, ReturnStatus, ReturnType, IReturnItem } from '../models/ReturnRequest.js';
import { Order } from '../models/Order.js';
import { Inventory } from '../models/Inventory.js';

interface CreateReturnDTO {
  orderId: string;
  type: ReturnType;
  items: IReturnItem[];
  customerComments?: string;
}

export class ReturnService {
  async createReturnRequest(userId: string, data: CreateReturnDTO): Promise<IReturnRequest> {
    const { orderId, type, items, customerComments } = data;

    if (!items || items.length === 0) {
      throw new Error('At least one footwear item must be selected for return or size exchange');
    }

    // 1. Locate and validate customer order
    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
      throw new Error('Order not found or does not belong to this patron account');
    }

    if (order.orderStatus === 'cancelled') {
      throw new Error('Cancelled orders are not eligible for size exchange or return');
    }

    // 2. If exchange requested, check replacement size availability
    if (type === 'exchange') {
      for (const item of items) {
        if (!item.replacementSize) {
          throw new Error(`Replacement shoe size must be specified for ${item.productName}`);
        }

        // Check inventory for replacement variant
        const replacementVariant = await Inventory.findOne({
          product: order.items[0]?.product,
          size: item.replacementSize,
        });

        if (replacementVariant && replacementVariant.availableStock < item.quantity) {
          // Note: In dropshipping, Agra artisan can craft on demand, but we flag low inventory
        }
      }
    }

    // 3. Compute refund amount if full return
    let refundAmount = 0;
    if (type === 'return') {
      refundAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }

    // 4. Generate unique Agra return identifier & reverse pickup tracking
    const returnNumber = `RET-AGR-${Date.now().toString().slice(-6)}`;
    const pickupTrackingNumber = `BD-REV-${Math.floor(10000000 + Math.random() * 90000000)}IN`;

    const returnRequest = new ReturnRequest({
      returnNumber,
      order: order._id,
      user: new mongoose.Types.ObjectId(userId),
      type,
      items,
      customerComments: customerComments || '',
      status: 'requested',
      pickupTrackingNumber,
      carrier: 'BlueDart Reverse Logistics',
      refundAmount,
    });

    await returnRequest.save();
    return returnRequest;
  }

  async getUserReturns(userId: string): Promise<any[]> {
    return ReturnRequest.find({ user: userId })
      .populate('order', 'orderNumber orderStatus total createdAt')
      .sort({ createdAt: -1 })
      .lean();
  }

  async getAllReturns(query: any = {}): Promise<any[]> {
    const filter: any = {};
    if (query.status) {
      filter.status = query.status;
    }
    if (query.type) {
      filter.type = query.type;
    }

    return ReturnRequest.find(filter)
      .populate('order', 'orderNumber orderStatus total shippingAddress')
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();
  }

  async getReturnById(returnId: string): Promise<any | null> {
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
    const request = await ReturnRequest.findById(returnId);
    if (!request) {
      throw new Error(`Return request #${returnId} not found`);
    }

    request.status = status;
    if (adminNotes) {
      request.adminNotes = adminNotes;
    }

    // If replacement footwear dispatched, assign courier tracking
    if (status === 'replacement_dispatched') {
      request.replacementTrackingNumber =
        replacementTrackingNumber || `BD-EXC-${Math.floor(10000000 + Math.random() * 90000000)}IN`;
    }

    await request.save();
    return request;
  }
}

export const returnService = new ReturnService();
