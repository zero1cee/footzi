import { IOrder, Order } from '../models/Order.js';
import { Supplier } from '../models/Supplier.js';
import { SupplierOrder, ISupplierOrder, SupplierOrderStatus } from '../models/SupplierOrder.js';

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
          timestamp: new Date(Date.now() + 1000 * 60 * 15),
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

  // 2. Transition Supplier Order Status (Simulate progress through the pipeline)
  async transitionSupplierOrderStatus(
    supplierOrderId: string,
    nextStatus: SupplierOrderStatus,
    note?: string
  ): Promise<ISupplierOrder> {
    const supplierOrder = await SupplierOrder.findById(supplierOrderId);
    if (!supplierOrder) {
      throw new Error('Supplier order not found.');
    }

    const customerOrder = await Order.findById(supplierOrder.customerOrder);

    supplierOrder.status = nextStatus;

    let eventLocation = 'Agra Workshop';
    let defaultNote = `Status progressed to ${nextStatus}`;

    if (nextStatus === 'processing') {
      supplierOrder.acceptedAt = supplierOrder.acceptedAt || new Date();
      eventLocation = 'Agra Workshop — Stitching & Lasting Station';
      defaultNote = 'Artisans hand-lasting leather upper and Blake-stitching soles.';
      if (customerOrder) {
        customerOrder.orderStatus = 'processing';
      }
    } else if (nextStatus === 'shipped') {
      supplierOrder.shippedAt = new Date();
      eventLocation = 'BlueDart Agra Logistics Hub';
      defaultNote = `Dispatched via BlueDart Air Express. Tracking ID: ${supplierOrder.trackingNumber}`;
      if (customerOrder) {
        customerOrder.orderStatus = 'shipped';
        customerOrder.trackingNumber = supplierOrder.trackingNumber;
      }
    } else if (nextStatus === 'delivered') {
      supplierOrder.deliveredAt = new Date();
      eventLocation = customerOrder?.shippingAddress.city || 'Destination Pincode';
      defaultNote = 'Successfully delivered to patron doorstep. Signed by customer.';
      if (customerOrder) {
        customerOrder.orderStatus = 'delivered';
      }
    } else if (nextStatus === 'cancelled') {
      defaultNote = 'Supplier order cancelled.';
      if (customerOrder && customerOrder.orderStatus !== 'delivered') {
        customerOrder.orderStatus = 'cancelled';
      }
    }

    supplierOrder.shipmentEvents.push({
      timestamp: new Date(),
      status: nextStatus.toUpperCase(),
      location: eventLocation,
      note: note || defaultNote,
    });

    await supplierOrder.save();

    if (customerOrder) {
      customerOrder.statusHistory.push({
        status: customerOrder.orderStatus,
        timestamp: new Date(),
        note: `[Supplier Update] ${defaultNote}`,
      });
      await customerOrder.save();
    }

    return supplierOrder;
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
