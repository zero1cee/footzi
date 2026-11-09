import mongoose, { Schema, Document, Model } from 'mongoose';
import { ShoeSize } from './Product.js';

export interface ICartItem {
  _id?: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  productName: string;
  productSlug: string;
  image: string;
  variantSku: string;
  size: ShoeSize;
  color: string;
  colorHex: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ICart extends Document {
  user: mongoose.Types.ObjectId;
  items: ICartItem[];
  subtotal: number;
  updatedAt: Date;
  calculateSubtotal(): number;
}

const CartItemSchema = new Schema<ICartItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    productSlug: { type: String, required: true },
    image: { type: String, required: true },
    variantSku: { type: String, required: true },
    size: {
      type: String,
      required: true,
      enum: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
    },
    color: { type: String, required: true },
    colorHex: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const CartSchema = new Schema<ICart>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [CartItemSchema],
    subtotal: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Method to compute total subtotal
CartSchema.methods.calculateSubtotal = function (): number {
  this.subtotal = this.items.reduce((acc: number, item: ICartItem) => acc + item.lineTotal, 0);
  return this.subtotal;
};

export const Cart: Model<ICart> = mongoose.model<ICart>('Cart', CartSchema);
