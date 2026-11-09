import mongoose, { Schema, Document, Model } from 'mongoose';
import { ShoeSize } from './Product.js';

export type SupplierOrderStatus =
  | 'pending'
  | 'submitted'
  | 'accepted'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export interface ISupplierOrderItem {
  product: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  size: ShoeSize;
  color: string;
  quantity: number;
  costPerUnit: number;
  lineCost: number;
}

export interface IShipmentEvent {
  timestamp: Date;
  status: string;
  location: string;
  note: string;
}

export interface ISupplierOrder extends Document {
  customerOrder: mongoose.Types.ObjectId;
  customerOrderNumber: string;
  supplier: mongoose.Types.ObjectId;
  supplierCode: string;
  supplierOrderNumber: string;
  items: ISupplierOrderItem[];
  status: SupplierOrderStatus;
  totalWholesaleCost: number;
  trackingNumber?: string;
  carrier: string;
  shipmentEvents: IShipmentEvent[];
  submittedAt?: Date;
  acceptedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ShipmentEventSchema = new Schema<IShipmentEvent>(
  {
    timestamp: { type: Date, default: Date.now },
    status: { type: String, required: true },
    location: { type: String, required: true },
    note: { type: String, required: true },
  },
  { _id: false }
);

const SupplierOrderItemSchema = new Schema<ISupplierOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    size: { type: String, required: true },
    color: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    costPerUnit: { type: Number, required: true },
    lineCost: { type: Number, required: true },
  },
  { _id: false }
);

const SupplierOrderSchema = new Schema<ISupplierOrder>(
  {
    customerOrder: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    customerOrderNumber: { type: String, required: true },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    supplierCode: { type: String, required: true, default: 'SUP-AGR-01' },
    supplierOrderNumber: { type: String, required: true, unique: true, index: true },
    items: [SupplierOrderItemSchema],
    status: {
      type: String,
      enum: [
        'pending',
        'submitted',
        'accepted',
        'processing',
        'shipped',
        'delivered',
        'failed',
        'cancelled',
      ],
      default: 'pending',
      index: true,
    },
    totalWholesaleCost: { type: Number, required: true },
    trackingNumber: { type: String },
    carrier: { type: String, default: 'BlueDart Air Express' },
    shipmentEvents: [ShipmentEventSchema],
    submittedAt: { type: Date },
    acceptedAt: { type: Date },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const SupplierOrder: Model<ISupplierOrder> = mongoose.model<ISupplierOrder>(
  'SupplierOrder',
  SupplierOrderSchema
);
