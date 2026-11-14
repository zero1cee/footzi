import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAnnouncement {
  enabled: boolean;
  /** Small label before the message, e.g. "Festive Privilege:". */
  label: string;
  /** The message. "{code}" is replaced by the highlighted coupon code below. */
  message: string;
  code: string;
}

export interface IShopSettings {
  /** Orders at or above this subtotal (rupees) ship free. 0 means everything ships free. */
  freeShippingThreshold: number;
  /** Rupees charged on smaller orders. */
  shippingFee: number;
  /** An unpaid order releases its stock after this many minutes. */
  orderExpiryMinutes: number;
  /** Days after delivery during which a return or exchange can be requested. */
  returnWindowDays: number;
  announcement: IAnnouncement;
}

export interface ISetting extends Document, IShopSettings {
  key: string;
  updatedAt: Date;
  updatedBy?: string;
}

const SettingSchema = new Schema<ISetting>(
  {
    // There is exactly one document, with this key
    key: { type: String, required: true, unique: true, default: 'shop' },
    freeShippingThreshold: { type: Number, min: 0 },
    shippingFee: { type: Number, min: 0 },
    orderExpiryMinutes: { type: Number, min: 5, max: 1440 },
    returnWindowDays: { type: Number, min: 1, max: 60 },
    announcement: {
      enabled: { type: Boolean },
      label: { type: String, maxlength: 40 },
      message: { type: String, maxlength: 160 },
      code: { type: String, maxlength: 24 },
    },
    updatedBy: { type: String },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const Setting: Model<ISetting> = mongoose.model<ISetting>('Setting', SettingSchema);
