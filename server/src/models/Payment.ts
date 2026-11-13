import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPaymentRefund {
  refundId: string;
  amount: number;
  reason: string;
  // Idempotency key: the return request or order action this refund was issued for
  reference: string;
  simulated: boolean;
  status: 'processed' | 'pending';
  createdAt: Date;
}

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
  refunds: IPaymentRefund[];
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
    refunds: [
      {
        _id: false,
        refundId: { type: String, required: true },
        amount: { type: Number, required: true },
        reason: { type: String, default: '' },
        reference: { type: String, required: true },
        simulated: { type: Boolean, default: false },
        status: { type: String, enum: ['processed', 'pending'], default: 'processed' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Payment: Model<IPayment> = mongoose.model<IPayment>('Payment', PaymentSchema);
