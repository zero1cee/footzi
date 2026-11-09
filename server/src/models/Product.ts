import mongoose, { Schema, Document } from 'mongoose';

export type ShoeSize = 'UK 6' | 'UK 7' | 'UK 8' | 'UK 9' | 'UK 10' | 'UK 11';

export interface IProductVariant {
  id: string;
  sku: string;
  size: ShoeSize;
  color: string;
  colorHex: string;
  stock: number;
  priceOverride?: number;
  supplierRef?: string;
}

export interface IProductReview {
  id: string;
  author: string;
  city: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
  verified: boolean;
  sizePurchased: ShoeSize;
}

export interface IProduct extends Document {
  name: string;
  slug: string;
  subtitle: string;
  description: string;
  category: 'Loafers' | 'Sneakers' | 'Oxfords' | 'Boots' | 'Slip-ons';
  brand: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  rating: number;
  reviewCount: number;
  badge?: 'New Arrival' | 'Best Seller' | 'Artisan Heritage' | 'Limited Run';
  images: string[];
  colors: {
    name: string;
    hex: string;
    imageIndex: number;
  }[];
  sizes: ShoeSize[];
  variants: IProductVariant[];
  material: string;
  sole: string;
  craftsmanshipLocation: string;
  features: string[];
  reviews: IProductReview[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VariantSchema = new Schema<IProductVariant>(
  {
    sku: { type: String, required: true },
    size: {
      type: String,
      required: true,
      enum: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
    },
    color: { type: String, required: true },
    colorHex: { type: String, required: true },
    stock: { type: Number, required: true, default: 0, min: 0 },
    priceOverride: { type: Number },
    supplierRef: { type: String },
  },
  { _id: true }
);

const ReviewSchema = new Schema<IProductReview>(
  {
    author: { type: String, required: true },
    city: { type: String, default: 'India' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true },
    comment: { type: String, required: true },
    date: { type: String, default: () => new Date().toLocaleDateString('en-GB') },
    verified: { type: Boolean, default: true },
    sizePurchased: { type: String, required: true },
  },
  { _id: true }
);

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    subtitle: { type: String, default: '' },
    description: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: ['Loafers', 'Sneakers', 'Oxfords', 'Boots', 'Slip-ons'],
    },
    brand: { type: String, required: true, default: 'Footzi Atelier' },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, default: 0 },
    rating: { type: Number, default: 4.8, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    badge: {
      type: String,
      enum: ['New Arrival', 'Best Seller', 'Artisan Heritage', 'Limited Run'],
    },
    images: [{ type: String, required: true }],
    colors: [
      {
        name: { type: String, required: true },
        hex: { type: String, required: true },
        imageIndex: { type: Number, default: 0 },
      },
    ],
    sizes: [
      {
        type: String,
        enum: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
      },
    ],
    variants: [VariantSchema],
    material: { type: String, default: 'Full-Grain Leather' },
    sole: { type: String, default: 'Blake Stitched Leather Sole' },
    craftsmanshipLocation: { type: String, default: 'Handcrafted in Agra, Uttar Pradesh' },
    features: [{ type: String }],
    reviews: [ReviewSchema],
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

ProductSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret: any) => {
    if (ret._id) ret.id = ret._id.toString();
    if (Array.isArray(ret.variants)) {
      ret.variants.forEach((v: any) => {
        if (v._id) v.id = v._id.toString();
      });
    }
    if (Array.isArray(ret.reviews)) {
      ret.reviews.forEach((r: any) => {
        if (r._id) r.id = r._id.toString();
      });
    }
    return ret;
  },
});

ProductSchema.set('toObject', {
  virtuals: true,
  transform: (_doc, ret: any) => {
    if (ret._id) ret.id = ret._id.toString();
    if (Array.isArray(ret.variants)) {
      ret.variants.forEach((v: any) => {
        if (v._id) v.id = v._id.toString();
      });
    }
    return ret;
  },
});

// Database Indexes for Fast Ecommerce Queries
ProductSchema.index({ category: 1, price: 1 });
ProductSchema.index({ 'variants.sku': 1 });
ProductSchema.index({ name: 'text', description: 'text', brand: 'text' });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
