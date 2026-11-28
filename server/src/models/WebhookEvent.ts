import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWebhookEvent extends Document {
  eventId: string;
  gateway: string;
  eventType: string;
  status: 'processing' | 'processed' | 'failed';
  errorMessage?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>(
  {
    eventId: { type: String, required: true, unique: true, trim: true },
    gateway: { type: String, default: 'razorpay' },
    eventType: { type: String, required: true },
    status: {
      type: String,
      enum: ['processing', 'processed', 'failed'],
      default: 'processing',
    },
    errorMessage: { type: String },
    processedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Automatically expire historical webhook logs after 30 days to keep DB storage lean
WebhookEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const WebhookEvent: Model<IWebhookEvent> = mongoose.model<IWebhookEvent>(
  'WebhookEvent',
  WebhookEventSchema
);
