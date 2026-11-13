import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStockAlert extends Document {
  email: string;
  sku: string;
  product: mongoose.Types.ObjectId;
  productName: string;
  size: string;
  color: string;
  notifiedAt?: Date;
  /** The record is deleted at this moment: months after a request nobody acted on, weeks after it was sent. */
  expiresAt: Date;
  createdAt: Date;
}

const StockAlertSchema = new Schema<IStockAlert>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    sku: { type: String, required: true, uppercase: true, trim: true, index: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    size: { type: String, required: true },
    color: { type: String, required: true },
    notifiedAt: { type: Date },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// One waiting request per email and size; asking again changes nothing
StockAlertSchema.index({ email: 1, sku: 1 }, { unique: true });
// MongoDB removes expired requests by itself, so addresses are not kept longer than they are useful
StockAlertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const StockAlert: Model<IStockAlert> = mongoose.model<IStockAlert>('StockAlert', StockAlertSchema);
