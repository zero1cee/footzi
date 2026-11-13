import mongoose, { Schema, Document, Model } from 'mongoose';
import { ShoeSize } from './Product.js';

export type OrderStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'return_requested'
  | 'returned';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface IOrderItemSnapshot {
  product: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  size: ShoeSize;
  color: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
  image: string;
}

export interface IShippingAddressSnapshot {
  name: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  user: mongoose.Types.ObjectId;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: IOrderItemSnapshot[];
  shippingAddress: IShippingAddressSnapshot;
  subtotal: number;
  discount: number;
  couponCode?: string;
  shippingFee: number;
  total: number;
  refundedAmount: number;
  paymentStatus: PaymentStatus;
  paymentDetails?: {
    gatewayOrderId?: string;
    gatewayPaymentId?: string;
    gatewaySignature?: string;
    method?: string;
    paidAt?: Date;
  };
  orderStatus: OrderStatus;
  statusHistory: {
    status: OrderStatus;
    timestamp: Date;
    note?: string;
  }[];
  supplierOrderId?: mongoose.Types.ObjectId;
  trackingNumber?: string;
  carrier?: string;
  createdAt: Date;
  updatedAt: Date;
  canTransitionTo(newStatus: OrderStatus): boolean;
}

const OrderItemSnapshotSchema = new Schema<IOrderItemSnapshot>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    size: {
      type: String,
      required: true,
      enum: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
    },
    color: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    image: { type: String, required: true },
  },
  { _id: false }
);

const ShippingAddressSnapshotSchema = new Schema<IShippingAddressSnapshot>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },
    items: [OrderItemSnapshotSchema],
    shippingAddress: ShippingAddressSnapshotSchema,
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0 },
    couponCode: { type: String },
    shippingFee: { type: Number, default: 0 },
    total: { type: Number, required: true, min: 0 },
    refundedAmount: { type: Number, default: 0, min: 0 },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    paymentDetails: {
      gatewayOrderId: { type: String },
      gatewayPaymentId: { type: String },
      gatewaySignature: { type: String },
      method: { type: String },
      paidAt: { type: Date },
    },
    orderStatus: {
      type: String,
      enum: [
        'pending_payment',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'return_requested',
        'returned',
      ],
      default: 'pending_payment',
      index: true,
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String },
      },
    ],
    supplierOrderId: { type: Schema.Types.ObjectId, ref: 'SupplierOrder' },
    trackingNumber: { type: String },
    carrier: { type: String, default: 'BlueDart Air Express' },
  },
  {
    timestamps: true,
  }
);

// State transition validation (prevent invalid lifecycle jumps)
OrderSchema.methods.canTransitionTo = function (newStatus: OrderStatus): boolean {
  const current = this.orderStatus as OrderStatus;

  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    pending_payment: ['confirmed', 'cancelled'],
    confirmed: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: ['return_requested'],
    cancelled: [], // terminal
    return_requested: ['returned', 'delivered'], // approved or rejected
    returned: [], // terminal
  };

  return validTransitions[current]?.includes(newStatus) ?? false;
};

export const Order: Model<IOrder> = mongoose.model<IOrder>('Order', OrderSchema);
