import mongoose, { Schema, Document, Model } from 'mongoose';
import { ShoeSize } from './Product.js';

export interface IInventory extends Document {
  variantSku: string;
  product: mongoose.Types.ObjectId;
  size: ShoeSize;
  color: string;
  availableStock: number;
  reservedStock: number;
  reorderThreshold: number;
  supplierRef?: string;
  reserveStock(qty: number): Promise<boolean>;
  releaseStock(qty: number): Promise<boolean>;
  confirmFulfillment(qty: number): Promise<boolean>;
}

const InventorySchema = new Schema<IInventory>(
  {
    variantSku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    size: {
      type: String,
      required: true,
      enum: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
    },
    color: { type: String, required: true },
    availableStock: { type: Number, required: true, min: 0, default: 0 },
    reservedStock: { type: Number, required: true, min: 0, default: 0 },
    reorderThreshold: { type: Number, default: 5 },
    supplierRef: { type: String, default: 'SUP-AGR-01' },
  },
  {
    timestamps: true,
  }
);

// Method: Atomically reserve stock for an order pending payment
InventorySchema.methods.reserveStock = async function (qty: number): Promise<boolean> {
  if (this.availableStock < qty) {
    return false;
  }
  this.availableStock -= qty;
  this.reservedStock += qty;
  await this.save();
  return true;
};

// Method: Release reserved stock (e.g. payment failed or cancelled)
InventorySchema.methods.releaseStock = async function (qty: number): Promise<boolean> {
  const toRelease = Math.min(qty, this.reservedStock);
  this.reservedStock -= toRelease;
  this.availableStock += toRelease;
  await this.save();
  return true;
};

// Method: Confirm fulfillment (payment verified -> reserved stock permanently deducted)
InventorySchema.methods.confirmFulfillment = async function (qty: number): Promise<boolean> {
  const toDeduct = Math.min(qty, this.reservedStock);
  this.reservedStock -= toDeduct;
  await this.save();
  return true;
};

export const Inventory: Model<IInventory> = mongoose.model<IInventory>('Inventory', InventorySchema);
