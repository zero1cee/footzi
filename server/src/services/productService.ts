import mongoose from 'mongoose';
import { Product, IProduct } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { IUser } from '../models/User.js';
import { Inventory } from '../models/Inventory.js';
import type { CreateProductInput, UpdateProductInput } from '../validators/productValidators.js';

export interface ProductQueryFilters {
  category?: string;
  brand?: string;
  badge?: string;
  search?: string;
  size?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  sort?: string;
  page?: number;
  limit?: number;
  includeInactive?: boolean;
}

export const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const formatProduct = (p: any) => {
  if (!p) return null;
  return {
    ...p,
    id: p._id ? p._id.toString() : p.id,
    variants: (p.variants || []).map((v: any) => ({
      ...v,
      id: v._id ? v._id.toString() : v.id,
    })),
    reviews: (p.reviews || []).map((r: any) => ({
      ...r,
      id: r._id ? r._id.toString() : r.id,
    })),
  };
};

export class ProductService {
  async getProducts(filters: ProductQueryFilters) {
    const {
      category,
      brand,
      badge,
      search,
      size,
      color,
      minPrice,
      maxPrice,
      inStockOnly,
      sort = 'featured',
      page = 1,
      limit = 9,
      includeInactive = false,
    } = filters;

    const mongoQuery: any = {};
    if (!includeInactive) {
      mongoQuery.isActive = true;
    }

    if (category && category !== 'All') {
      mongoQuery.category = category;
    }

    if (brand && brand !== 'All') {
      mongoQuery.brand = brand;
    }

    if (badge) {
      mongoQuery.badge = badge;
    }

    if (search) {
      const term = escapeRegex(search);
      mongoQuery.$or = [
        { name: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } },
        { category: { $regex: term, $options: 'i' } },
      ];
    }

    if (size) {
      mongoQuery['variants.size'] = size;
    }

    if (color) {
      mongoQuery['variants.color'] = { $regex: new RegExp(`^${escapeRegex(color)}$`, 'i') };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      mongoQuery.price = {};
      if (minPrice !== undefined) mongoQuery.price.$gte = minPrice;
      if (maxPrice !== undefined) mongoQuery.price.$lte = maxPrice;
    }

    if (inStockOnly) {
      mongoQuery['variants.stock'] = { $gt: 0 };
    }

    // Sort order
    let sortOption: any = { createdAt: -1 };
    if (sort === 'price-asc') sortOption = { price: 1 };
    else if (sort === 'price-desc') sortOption = { price: -1 };
    else if (sort === 'rating') sortOption = { rating: -1 };
    else if (sort === 'newest') sortOption = { createdAt: -1 };

    const skip = (page - 1) * limit;

    try {
      const total = await Product.countDocuments(mongoQuery);
      const rawProducts = await Product.find(mongoQuery)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean();

      const products = rawProducts.map(formatProduct);
      const totalPages = Math.ceil(total / limit) || 1;

      return {
        products,
        total,
        page,
        totalPages,
      };
    } catch {
      return {
        products: [],
        total: 0,
        page,
        totalPages: 1,
      };
    }
  }

  async getProductBySlug(slug: string) {
    try {
      const product = await Product.findOne({ slug, isActive: true }).lean();
      return formatProduct(product);
    } catch {
      return null;
    }
  }

  async getProductById(id: string) {
    try {
      const product = await Product.findById(id).lean();
      return formatProduct(product);
    } catch {
      return null;
    }
  }

  /**
   * Type-ahead for the search box: styles whose name has a word starting with what was typed,
   * or whose category starts with it. Only active styles, only the few fields a suggestion needs.
   */
  async suggest(query: string, limit = 6) {
    const term = query.trim().slice(0, 40);
    if (term.length < 2) return [];
    const safe = escapeRegex(term);
    const products = await Product.find({
      isActive: true,
      $or: [{ name: { $regex: `(^|\\s)${safe}`, $options: 'i' } }, { category: { $regex: `^${safe}`, $options: 'i' } }],
    })
      .select('name slug images price category')
      .sort({ rating: -1, createdAt: -1 })
      .limit(Math.min(limit, 10))
      .lean();
    return products.map((p) => ({ id: p._id.toString(), name: p.name, slug: p.slug, image: p.images?.[0] ?? '', price: p.price, category: p.category }));
  }

  /** Every variant SKU is the key of an inventory record, so a SKU may belong to only one product. */
  private async assertSkusFree(skus: string[], exceptProductId?: unknown): Promise<void> {
    const unique = new Set(skus);
    if (unique.size !== skus.length) throw new Error('Each variant needs its own SKU; one is repeated.');
    const taken = await Product.findOne({
      'variants.sku': { $in: skus },
      ...(exceptProductId ? { _id: { $ne: exceptProductId } } : {}),
    }).select('name variants.sku');
    if (taken) {
      const clash = taken.variants.find((v) => skus.includes(v.sku));
      throw new Error(`SKU ${clash?.sku} is already used by "${taken.name}".`);
    }
  }

  private async createInventoryFor(product: IProduct, variants: IProduct['variants']): Promise<void> {
    for (const variant of variants) {
      await Inventory.updateOne(
        { variantSku: variant.sku },
        {
          $set: { product: product._id, size: variant.size, color: variant.color, supplierRef: variant.supplierRef || 'SUP-AGR-01' },
          $setOnInsert: { variantSku: variant.sku, availableStock: variant.stock || 0, reservedStock: 0, reorderThreshold: 5 },
        },
        { upsert: true }
      );
    }
  }

  async createProduct(data: CreateProductInput): Promise<IProduct> {
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const price = data.price!;
    const originalPrice = data.originalPrice ?? price;
    const discountPercent = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

    await this.assertSkusFree((data.variants ?? []).map((v) => v.sku));

    const product = new Product({ ...data, slug, price, originalPrice, discountPercent, isActive: data.isActive ?? true });
    try {
      await product.save();
    } catch (error: any) {
      if (error.code === 11000) throw new Error(`A product called "${data.name}" already exists. Choose a different name.`);
      throw error;
    }

    await this.createInventoryFor(product, product.variants);
    return product;
  }

  /**
   * Edits a product's details. Only the validated fields are applied. Existing variants keep
   * their size, colour and stock (stock is changed on the inventory screen, where reserved
   * pairs are accounted for); variants with new SKUs are added with their opening stock.
   */
  async updateProduct(id: string, data: UpdateProductInput): Promise<IProduct | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const product = await Product.findById(id);
    if (!product) return null;

    const { variants: incoming, ...fields } = data;
    Object.assign(product, fields);

    if (product.originalPrice < product.price) {
      throw new Error('Original price cannot be lower than the selling price');
    }
    product.discountPercent =
      product.originalPrice > product.price ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;

    const added: IProduct['variants'] = [];
    if (incoming) {
      const known = new Map(product.variants.map((v) => [v.sku, v]));
      const fresh = incoming.filter((v) => !known.has(v.sku));
      await this.assertSkusFree(fresh.map((v) => v.sku), product._id);
      for (const v of incoming) {
        const existing = known.get(v.sku);
        if (existing) {
          existing.priceOverride = v.priceOverride;
          if (v.supplierRef) existing.supplierRef = v.supplierRef;
        } else {
          product.variants.push(v as any);
          added.push(product.variants[product.variants.length - 1]);
        }
      }
    }

    await product.save();
    await this.createInventoryFor(product, added);
    return product;
  }

  async toggleProductActive(id: string): Promise<IProduct | null> {
    const product = await Product.findById(id);
    if (!product) return null;

    product.isActive = !product.isActive;
    await product.save();
    return product;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const product = await Product.findById(id);
    if (!product) return false;

    // Soft delete product by deactivating it
    product.isActive = false;
    await product.save();
    return true;
  }

  async updateInventoryStock(sku: string, newStock: number): Promise<any> {
    const inv = await Inventory.findOneAndUpdate(
      { variantSku: sku },
      { availableStock: Math.max(0, newStock) },
      { new: true }
    );

    // The catalog shows pairs on hand, which includes the ones held for unpaid orders
    if (inv) {
      await Product.updateOne(
        { _id: inv.product, 'variants.sku': sku },
        { $set: { 'variants.$.stock': inv.availableStock + inv.reservedStock } }
      );
    }

    return inv;
  }

  /**
   * Records a review written by a signed-in customer. The author name comes from
   * the account (never from the request), each customer can review a product once,
   * and a review is marked verified only when the customer has a paid order for it.
   */
  async addReview(
    productId: string,
    user: IUser,
    data: { rating: number; title?: string; comment: string; city?: string; sizePurchased?: string }
  ): Promise<{ review: any; product: IProduct } | 'not_found' | 'duplicate'> {
    if (!mongoose.isValidObjectId(productId)) return 'not_found';

    const purchase = await Order.findOne({
      user: user._id,
      paymentStatus: 'paid',
      'items.product': productId,
    })
      .select('items')
      .lean();
    const purchasedItem = purchase?.items.find((i) => String(i.product) === productId);

    const review = {
      user: user._id,
      author: user.name,
      city: data.city || 'India',
      rating: data.rating,
      title: data.title || 'Patron Review',
      comment: data.comment,
      sizePurchased: (data.sizePurchased || purchasedItem?.size || 'UK 8') as any,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      verified: Boolean(purchase),
    };

    // One review per customer, enforced by the update itself so a double submit cannot slip through
    const product = await Product.findOneAndUpdate(
      { _id: productId, 'reviews.user': { $ne: user._id } },
      { $push: { reviews: { $each: [review], $position: 0 } } },
      { new: true }
    );
    if (!product) {
      return (await Product.exists({ _id: productId })) ? 'duplicate' : 'not_found';
    }

    const total = product.reviews.reduce((sum, r) => sum + r.rating, 0);
    product.reviewCount = product.reviews.length;
    product.rating = Number((total / product.reviews.length).toFixed(1));
    await product.save();

    return { review: product.reviews[0], product };
  }
}

export const productService = new ProductService();
