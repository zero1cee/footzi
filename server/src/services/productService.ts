import { Product, IProduct } from '../models/Product.js';
import { Inventory } from '../models/Inventory.js';

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

  async createProduct(data: any): Promise<IProduct> {
    const slug =
      data.slug ||
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

    const originalPrice = Number(data.originalPrice || data.price);
    const price = Number(data.price);
    const discountPercent =
      data.discountPercent !== undefined
        ? Number(data.discountPercent)
        : originalPrice > price
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : 0;

    const product = new Product({
      ...data,
      slug,
      price,
      originalPrice,
      discountPercent,
      isActive: data.isActive !== undefined ? data.isActive : true,
    });

    await product.save();

    // Automatically initialize Inventory variant entries
    if (product.variants && Array.isArray(product.variants)) {
      for (const variant of product.variants) {
        await Inventory.findOneAndUpdate(
          { variantSku: variant.sku },
          {
            variantSku: variant.sku,
            product: product._id,
            size: variant.size,
            color: variant.color,
            availableStock: variant.stock || 0,
            reservedStock: 0,
            reorderThreshold: 5,
            supplierRef: variant.supplierRef || 'SUP-AGR-01',
          },
          { upsert: true, new: true }
        );
      }
    }

    return product;
  }

  async updateProduct(id: string, data: any): Promise<IProduct | null> {
    const product = await Product.findById(id);
    if (!product) return null;

    if (data.price !== undefined && data.originalPrice !== undefined) {
      data.discountPercent = Math.round(
        ((data.originalPrice - data.price) / data.originalPrice) * 100
      );
    }

    Object.assign(product, data);
    await product.save();

    // Sync inventory variant records
    if (data.variants && Array.isArray(data.variants)) {
      for (const variant of data.variants) {
        if (variant.sku) {
          await Inventory.findOneAndUpdate(
            { variantSku: variant.sku },
            {
              product: product._id,
              size: variant.size,
              color: variant.color,
              availableStock: variant.stock || 0,
            },
            { upsert: true }
          );
        }
      }
    }

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

    // Also sync back to Product variant document
    if (inv) {
      await Product.updateOne(
        { _id: inv.product, 'variants.sku': sku },
        { $set: { 'variants.$.stock': Math.max(0, newStock) } }
      );
    }

    return inv;
  }

  async addReview(productId: string, reviewData: any) {
    try {
      const product = await Product.findById(productId);
      if (!product) return null;

      product.reviews.unshift(reviewData);
      product.reviewCount = product.reviews.length;

      // Recalculate average rating
      const totalStars = product.reviews.reduce((acc, r) => acc + r.rating, 0);
      product.rating = Number((totalStars / product.reviews.length).toFixed(1));

      await product.save();
      return product;
    } catch {
      return null;
    }
  }
}

export const productService = new ProductService();
