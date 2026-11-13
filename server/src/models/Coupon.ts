import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICoupon extends Document {
  code: string;
  description: string;
  type: 'percent' | 'flat';
  /** Percent (1-100) or a rupee amount, depending on `type`. */
  value: number;
  minOrderValue: number;
  /** Upper limit in rupees for percent coupons. */
  maxDiscount?: number;
  firstOrderOnly: boolean;
  /** Total redemptions allowed across all customers. */
  usageLimit?: number;
  /** Redemptions allowed per customer. */
  perUserLimit?: number;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    type: { type: String, enum: ['percent', 'flat'], required: true },
    value: { type: Number, required: true, min: 1 },
    minOrderValue: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, min: 1 },
    firstOrderOnly: { type: Boolean, default: false },
    usageLimit: { type: Number, min: 1 },
    perUserLimit: { type: Number, min: 1 },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Coupon: Model<ICoupon> = mongoose.model<ICoupon>('Coupon', CouponSchema);
