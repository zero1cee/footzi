import mongoose, { Schema, Document, Model, ClientSession } from 'mongoose';
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
  reserveStock(qty: number, session?: ClientSession): Promise<boolean>;
  releaseStock(qty: number, session?: ClientSession): Promise<boolean>;
  confirmFulfillment(qty: number, session?: ClientSession): Promise<boolean>;
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

// High-Concurrency & Inventory Optimization Indexes
InventorySchema.index({ variantSku: 1, availableStock: 1 });
InventorySchema.index({ product: 1, availableStock: 1 });

// Method: Atomically reserve stock for an order pending payment
InventorySchema.methods.reserveStock = async function (qty: number, session?: ClientSession): Promise<boolean> {
  // Single conditional update: the stock check and the decrement happen in one
  // document-level operation, so concurrent buyers cannot both take the last pair.
  const result = await Inventory.updateOne(
    { _id: this._id, availableStock: { $gte: qty } },
    { $inc: { availableStock: -qty, reservedStock: qty } },
    session ? { session } : undefined
  );
  return result.modifiedCount === 1;
};

// Method: Release reserved stock (e.g. payment failed or cancelled)
InventorySchema.methods.releaseStock = async function (qty: number, session?: ClientSession): Promise<boolean> {
  const result = await Inventory.updateOne(
    { _id: this._id, reservedStock: { $gte: qty } },
    { $inc: { reservedStock: -qty, availableStock: qty } },
    session ? { session } : undefined
  );
  return result.modifiedCount === 1;
};

// Method: Confirm fulfillment (payment verified -> reserved stock permanently deducted)
InventorySchema.methods.confirmFulfillment = async function (qty: number, session?: ClientSession): Promise<boolean> {
  const result = await Inventory.updateOne(
    { _id: this._id, reservedStock: { $gte: qty } },
    { $inc: { reservedStock: -qty } },
    session ? { session } : undefined
  );
  return result.modifiedCount === 1;
};

export const Inventory: Model<IInventory> = mongoose.model<IInventory>('Inventory', InventorySchema);
