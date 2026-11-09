import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayment extends Document {
  order: mongoose.Types.ObjectId;
  orderNumber: string;
  gateway: 'razorpay';
  gatewayOrderId: string;
  gatewayPaymentId?: string;
  gatewaySignature?: string;
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'failed' | 'refunded';
  signatureVerified: boolean;
  failureReason?: string;
  webhookEvents: any[];
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    orderNumber: { type: String, required: true },
    gateway: { type: String, default: 'razorpay' },
    gatewayOrderId: { type: String, required: true, index: true },
    gatewayPaymentId: { type: String, index: true },
    gatewaySignature: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['created', 'authorized', 'captured', 'failed', 'refunded'],
      default: 'created',
      index: true,
    },
    signatureVerified: { type: Boolean, default: false },
    failureReason: { type: String },
    webhookEvents: [{ type: Schema.Types.Mixed }],
  },
  {
    timestamps: true,
  }
);

export const Payment: Model<IPayment> = mongoose.model<IPayment>('Payment', PaymentSchema);
