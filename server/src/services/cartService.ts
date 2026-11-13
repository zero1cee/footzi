import mongoose from 'mongoose';
import { Cart, ICart } from '../models/Cart.js';
import { Product } from '../models/Product.js';

export interface AddItemDTO {
  productId: string;
  variantSku: string;
  size: any;
  color: string;
  quantity: number;
}

// A cart line can be addressed by its own _id or by its variant SKU (what the client knows)
const matchesItem = (item: { _id?: unknown; variantSku: string }, key: string): boolean =>
  item._id?.toString() === key || item.variantSku === key;

export class CartService {
  async getCart(userId: string): Promise<ICart> {
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = await Cart.create({ user: userId, items: [], subtotal: 0 });
    }
    return cart;
  }

  async addItem(userId: string, data: AddItemDTO): Promise<ICart> {
    const product = await Product.findById(data.productId);
    if (!product || !product.isActive) {
      throw new Error('This footwear silhouette is currently unavailable.');
    }

    // Resolve variant
    const variant = product.variants.find((v) => v.sku === data.variantSku) ||
      product.variants.find((v) => v.size === data.size && v.color === data.color);

    if (!variant) {
      throw new Error('The selected size or color variant does not exist.');
    }

    if (variant.stock <= 0) {
      throw new Error('This footwear variant is currently out of stock.');
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    const price = variant.priceOverride ?? product.price;
    const existingIndex = cart.items.findIndex((item) => item.variantSku === variant.sku);

    if (existingIndex > -1) {
      const currentQty = cart.items[existingIndex].quantity;
      const newQty = currentQty + data.quantity;

      if (newQty > variant.stock) {
        throw new Error(`Cannot add ${data.quantity} more. Maximum available stock is ${variant.stock}.`);
      }

      cart.items[existingIndex].quantity = newQty;
      cart.items[existingIndex].lineTotal = newQty * price;
    } else {
      if (data.quantity > variant.stock) {
        throw new Error(`Only ${variant.stock} pairs are currently available.`);
      }

      cart.items.push({
        product: product._id as any,
        productName: product.name,
        productSlug: product.slug,
        image: product.images[0],
        variantSku: variant.sku,
        size: variant.size,
        color: variant.color,
        colorHex: variant.colorHex,
        quantity: data.quantity,
        unitPrice: price,
        lineTotal: data.quantity * price,
      });
    }

    cart.calculateSubtotal();
    await cart.save();
    return cart;
  }

  /**
   * Folds a guest's bag into the account's saved bag after sign-in. For a pair that
   * is in both, the larger quantity wins instead of the two adding up, so running
   * this repeatedly (every page load, every login) never inflates the bag. Prices
   * are refreshed from the catalog, and anything unavailable is skipped.
   */
  async mergeItems(userId: string, items: AddItemDTO[]): Promise<ICart> {
    const ids = [...new Set(items.map((i) => i.productId))].filter((id) => mongoose.isValidObjectId(id));
    const products = await Product.find({ _id: { $in: ids }, isActive: true });
    const byId = new Map(products.map((p) => [String(p._id), p]));

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    for (const wanted of items) {
      const product = byId.get(wanted.productId);
      const variant = product?.variants.find((v) => v.sku === wanted.variantSku);
      if (!product || !variant || variant.stock <= 0) continue;

      const price = variant.priceOverride ?? product.price;
      const existing = cart.items.find((item) => item.variantSku === variant.sku);
      const quantity = Math.min(Math.max(existing?.quantity ?? 0, wanted.quantity), variant.stock, 10);

      if (existing) {
        existing.quantity = quantity;
        existing.unitPrice = price;
        existing.lineTotal = quantity * price;
      } else {
        cart.items.push({
          product: product._id as any,
          productName: product.name,
          productSlug: product.slug,
          image: product.images[0],
          variantSku: variant.sku,
          size: variant.size,
          color: variant.color,
          colorHex: variant.colorHex,
          quantity,
          unitPrice: price,
          lineTotal: quantity * price,
        });
      }
    }

    cart.calculateSubtotal();
    await cart.save();
    return cart;
  }

  async updateQuantity(userId: string, itemId: string, quantity: number): Promise<ICart> {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      throw new Error('Cart not found.');
    }

    const itemIndex = cart.items.findIndex((item) => matchesItem(item, itemId));
    if (itemIndex === -1) {
      throw new Error('Item not found in cart.');
    }

    const item = cart.items[itemIndex];
    const product = await Product.findById(item.product);
    const variant = product?.variants.find((v) => v.sku === item.variantSku);

    if (variant && quantity > variant.stock) {
      throw new Error(`Only ${variant.stock} pairs are available for this size/shade.`);
    }

    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].lineTotal = quantity * cart.items[itemIndex].unitPrice;

    cart.calculateSubtotal();
    await cart.save();
    return cart;
  }

  async removeItem(userId: string, itemId: string): Promise<ICart> {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      throw new Error('Cart not found.');
    }

    cart.items = cart.items.filter((item) => !matchesItem(item, itemId)) as any;
    cart.calculateSubtotal();
    await cart.save();
    return cart;
  }

  async clearCart(userId: string): Promise<ICart> {
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [], subtotal: 0 });
    } else {
      cart.items = [] as any;
      cart.subtotal = 0;
    }
    await cart.save();
    return cart;
  }
}

export const cartService = new CartService();
