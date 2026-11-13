import mongoose, { Schema, Document } from 'mongoose';
import { ShoeSize } from './Product.js';

export type ReturnType = 'return' | 'exchange';

export type ReturnStatus =
  | 'requested'
  | 'approved'
  | 'pickup_scheduled'
  | 'inspected'
  | 'replacement_dispatched'
  | 'refund_processed'
  | 'rejected';

export interface IReturnItem {
  sku: string;
  productName: string;
  size: ShoeSize;
  color: string;
  quantity: number;
  price: number;
  reason:
    | 'Fit issue - too tight'
    | 'Fit issue - too loose'
    | 'Patina variation'
    | 'Defective craftsmanship'
    | 'Changed mind';
  replacementSize?: ShoeSize;
  replacementColor?: string;
  replacementSku?: string;
}

export interface IReturnRequest extends Document {
  returnNumber: string;
  order: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  type: ReturnType;
  items: IReturnItem[];
  status: ReturnStatus;
  customerComments?: string;
  adminNotes?: string;
  pickupTrackingNumber?: string;
  replacementTrackingNumber?: string;
  carrier: string;
  refundAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReturnItemSchema = new Schema<IReturnItem>(
  {
    sku: { type: String, required: true },
    productName: { type: String, required: true },
    size: {
      type: String,
      required: true,
      enum: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
    },
    color: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    reason: {
      type: String,
      required: true,
      enum: [
        'Fit issue - too tight',
        'Fit issue - too loose',
        'Patina variation',
        'Defective craftsmanship',
        'Changed mind',
      ],
    },
    replacementSize: {
      type: String,
      enum: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
    },
    replacementColor: { type: String },
    replacementSku: { type: String },
  },
  { _id: false }
);

const ReturnRequestSchema = new Schema<IReturnRequest>(
  {
    returnNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['return', 'exchange'],
      default: 'exchange',
    },
    items: [ReturnItemSchema],
    status: {
      type: String,
      required: true,
      enum: [
        'requested',
        'approved',
        'pickup_scheduled',
        'inspected',
        'replacement_dispatched',
        'refund_processed',
        'rejected',
      ],
      default: 'requested',
    },
    customerComments: { type: String, default: '' },
    adminNotes: { type: String, default: '' },
    pickupTrackingNumber: { type: String },
    replacementTrackingNumber: { type: String },
    carrier: { type: String, default: 'BlueDart Reverse Logistics' },
    refundAmount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

ReturnRequestSchema.index({ user: 1, createdAt: -1 });
ReturnRequestSchema.index({ order: 1 });
ReturnRequestSchema.index({ status: 1 });

export const ReturnRequest = mongoose.model<IReturnRequest>('ReturnRequest', ReturnRequestSchema);
