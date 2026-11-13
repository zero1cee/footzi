import mongoose from 'mongoose';
import { emailService } from './emailService.js';
import { orderService } from './orderService.js';
import { IOrder, Order } from '../models/Order.js';
import { Supplier } from '../models/Supplier.js';
import { SupplierOrder, ISupplierOrder, SupplierOrderStatus } from '../models/SupplierOrder.js';

// The workshop pipeline moves forward one step at a time; the last three are final.
export const SUPPLIER_TRANSITIONS: Record<SupplierOrderStatus, SupplierOrderStatus[]> = {
  pending: ['submitted', 'cancelled'],
  submitted: ['accepted', 'cancelled'],
  accepted: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  failed: [],
  cancelled: [],
};

export class SupplierFulfillmentService {
  // 1. Create Supplier Order upon Payment Verification
  async createSupplierOrder(customerOrder: IOrder): Promise<ISupplierOrder> {
    // Find or create default master supplier in Agra
    let supplier = await Supplier.findOne({ code: 'SUP-AGR-01' });
    if (!supplier) {
      supplier = await Supplier.create({
        name: 'Agra Master Artisan Guild Ltd.',
        code: 'SUP-AGR-01',
        contactPerson: 'Master Ustad Zahid Ali',
        email: 'zahid.guild@agra-craft.in',
        phone: '+91 562 284 1122',
        address: 'Plot 14, Taj Crafts Enclave, Fatehabad Road',
        city: 'Agra',
        state: 'Uttar Pradesh',
        leadTimeDays: 2,
        isActive: true,
      });
    }

    const supplierOrderNumber = `SUP-AGR-${Math.floor(100000 + Math.random() * 900000)}`;
    const trackingNumber = `BD-AGR-${Math.floor(10000000 + Math.random() * 90000000)}IN`;

    // Calculate wholesale supplier items cost (approx 55% of retail price)
    const supplierItems = customerOrder.items.map((item) => {
      const wholesaleCost = Math.round(item.unitPrice * 0.55);
      return {
        product: item.product,
        name: item.name,
        sku: item.sku,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        costPerUnit: wholesaleCost,
        lineCost: wholesaleCost * item.quantity,
      };
    });

    const totalWholesaleCost = supplierItems.reduce((acc, i) => acc + i.lineCost, 0);

    const supplierOrder = await SupplierOrder.create({
      customerOrder: customerOrder._id,
      customerOrderNumber: customerOrder.orderNumber,
      supplier: supplier._id,
      supplierCode: supplier.code,
      supplierOrderNumber,
      items: supplierItems,
      status: 'accepted', // Auto-accepted in simulation
      totalWholesaleCost,
      trackingNumber,
      carrier: 'BlueDart Air Express',
      shipmentEvents: [
        {
          timestamp: new Date(),
          status: 'Order Placed',
          location: 'Footzi Central Atelier, Agra',
          note: `Customer order ${customerOrder.orderNumber} successfully received and verified.`,
        },
        {
          timestamp: new Date(),
          status: 'Supplier Accepted',
          location: 'Agra Master Artisan Guild Workshop',
          note: 'Master shoemaker accepted build order and allocated certified leather stock.',
        },
      ],
      submittedAt: new Date(),
      acceptedAt: new Date(),
    });

    return supplierOrder;
  }

  // 2. Transition Supplier Order Status. The workshop pipeline only moves forward one
  // step at a time, and only one admin action can move an order out of a given status.
  async transitionSupplierOrderStatus(
    supplierOrderId: string,
    nextStatus: SupplierOrderStatus,
    note?: string
  ): Promise<ISupplierOrder> {
    const supplierOrder = mongoose.isValidObjectId(supplierOrderId) ? await SupplierOrder.findById(supplierOrderId) : null;
    if (!supplierOrder) {
      throw new Error('Supplier order not found.');
    }

    const allowed = SUPPLIER_TRANSITIONS[supplierOrder.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new Error(
        allowed.length > 0
          ? `A ${supplierOrder.status} supplier order can only move to: ${allowed.join(', ')}`
          : `This supplier order is ${supplierOrder.status} and can no longer change`
      );
    }

    // A cancellation also undoes the customer's order: stock back, refund issued
    if (nextStatus === 'cancelled') {
      await orderService.cancelPaidOrder(supplierOrder.customerOrder, {
        byWorkshop: true,
        reason: note || 'The workshop could not fulfil this order.',
      });
      return (await SupplierOrder.findById(supplierOrder._id))!;
    }

    const customerOrder = await Order.findById(supplierOrder.customerOrder);

    const update: Record<string, unknown> = { status: nextStatus };
    let eventLocation = 'Agra Workshop';
    let defaultNote = `Status progressed to ${nextStatus}`;
    let customerStatus: string | null = null;

    if (nextStatus === 'processing') {
      update.acceptedAt = supplierOrder.acceptedAt || new Date();
      eventLocation = 'Agra Workshop — Stitching & Lasting Station';
      defaultNote = 'Artisans hand-lasting leather upper and Blake-stitching soles.';
      customerStatus = 'processing';
    } else if (nextStatus === 'shipped') {
      update.shippedAt = new Date();
      eventLocation = 'BlueDart Agra Logistics Hub';
      defaultNote = `Dispatched via BlueDart Air Express. Tracking ID: ${supplierOrder.trackingNumber}`;
      customerStatus = 'shipped';
    } else if (nextStatus === 'delivered') {
      update.deliveredAt = new Date();
      eventLocation = customerOrder?.shippingAddress.city || 'Destination Pincode';
      defaultNote = 'Successfully delivered to patron doorstep. Signed by customer.';
      customerStatus = 'delivered';
    }

    const moved = await SupplierOrder.findOneAndUpdate(
      { _id: supplierOrder._id, status: supplierOrder.status },
      {
        $set: update,
        $push: {
          shipmentEvents: { timestamp: new Date(), status: nextStatus.toUpperCase(), location: eventLocation, note: note || defaultNote },
        },
      },
      { new: true }
    );
    if (!moved) {
      throw new Error('This supplier order was just updated by someone else. Please refresh and try again.');
    }

    if (customerOrder && customerStatus) {
      customerOrder.orderStatus = customerStatus as any;
      if (customerStatus === 'shipped') customerOrder.trackingNumber = moved.trackingNumber;
      customerOrder.statusHistory.push({
        status: customerOrder.orderStatus,
        timestamp: new Date(),
        note: `[Supplier Update] ${defaultNote}`,
      });
      await customerOrder.save();

      if (nextStatus === 'shipped') void emailService.orderShipped(customerOrder);
      if (nextStatus === 'delivered') void emailService.orderDelivered(customerOrder);
    }

    return moved;
  }

  // List all supplier orders for Admin Portal
  async getAllSupplierOrders() {
    return SupplierOrder.find()
      .populate('supplier', 'name code city email phone')
      .sort({ createdAt: -1 })
      .lean();
  }

  // Get supplier order details
  async getSupplierOrderById(id: string) {
    return SupplierOrder.findById(id)
      .populate('supplier')
      .populate('customerOrder')
      .lean();
  }
}

export const supplierFulfillmentService = new SupplierFulfillmentService();
