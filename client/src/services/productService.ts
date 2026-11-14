import { Product, ProductReview, ShoeSize } from '@/types';
import { MOCK_PRODUCTS } from '@/data/mockProducts';
import { parseApiJson } from '@/lib/utils';

export interface ProductQueryParams {
  category?: string;
  search?: string;
  badge?: string;
  brand?: string;
  size?: ShoeSize;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  sort?: 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'newest';
  page?: number;
  limit?: number;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  totalPages: number;
}

export const normalizeProduct = (p: any): Product => {
  if (!p) return p;
  return {
    ...p,
    id: p.id || p._id || '',
    variants: (p.variants || []).map((v: any) => ({
      ...v,
      id: v.id || v._id || '',
    })),
    reviews: (p.reviews || []).map((r: any) => ({
      ...r,
      id: r.id || r._id || '',
    })),
  };
};

/**
 * What a shopper sees: only colours and sizes the style actually comes in. Older catalogue entries list shades
 * or sizes that have no stock records, which looked choosable but could not be bought. The admin screens use
 * the unfiltered style, so those shades can be given stock there.
 */
export const storefrontView = (p: Product): Product => {
  if (!p || !p.variants || p.variants.length === 0) return p;
  const colors = p.colors.filter((c) => p.variants.some((v) => v.color === c.name));
  const sizes = p.sizes.filter((size) => p.variants.some((v) => v.size === size));
  return { ...p, colors: colors.length > 0 ? colors : p.colors, sizes: sizes.length > 0 ? sizes : p.sizes };
};

export const productService = {
  // Fetch products with comprehensive filtering, sorting & pagination
  async getProducts(params: ProductQueryParams = {}): Promise<ProductsResponse> {
    const {
      category = 'All',
      search = '',
      badge = '',
      brand = 'All',
      size,
      color,
      minPrice,
      maxPrice,
      inStockOnly = false,
      sort = 'featured',
      page = 1,
      limit = 9,
    } = params;

    try {
      // Build query string for live backend
      const query = new URLSearchParams();
      if (category && category !== 'All') query.set('category', category);
      if (search) query.set('search', search);
      if (badge) query.set('badge', badge);
      if (brand && brand !== 'All') query.set('brand', brand);
      if (size) query.set('size', size);
      if (color) query.set('color', color);
      if (minPrice !== undefined) query.set('minPrice', minPrice.toString());
      if (maxPrice !== undefined) query.set('maxPrice', maxPrice.toString());
      if (inStockOnly) query.set('inStockOnly', 'true');
      if (sort) query.set('sort', sort);
      query.set('page', page.toString());
      query.set('limit', limit.toString());

      const res = await fetch(`/api/products?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        return {
          ...data,
          products: (data.products || []).map((p: any) => storefrontView(normalizeProduct(p))),
        };
      }
    } catch {
      // Backend not running yet or unreachable, use client dataset
    }

    // Client-side fallback filter engine
    let list = [...MOCK_PRODUCTS];

    if (category && category !== 'All') {
      list = list.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }

    if (brand && brand !== 'All') {
      list = list.filter((p) => p.brand.toLowerCase() === brand.toLowerCase());
    }

    if (badge) {
      list = list.filter((p) => p.badge?.toLowerCase() === badge.toLowerCase());
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q)
      );
    }

    if (size) {
      list = list.filter((p) => p.sizes.includes(size));
    }

    if (color) {
      list = list.filter((p) => p.colors.some((c) => c.name.toLowerCase() === color.toLowerCase()));
    }

    if (minPrice !== undefined) {
      list = list.filter((p) => p.price >= minPrice);
    }

    if (maxPrice !== undefined) {
      list = list.filter((p) => p.price <= maxPrice);
    }

    if (inStockOnly) {
      list = list.filter((p) => p.variants.some((v) => v.stock > 0));
    }

    // Sorting
    if (sort === 'price-asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (sort === 'price-desc') {
      list.sort((a, b) => b.price - a.price);
    } else if (sort === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (sort === 'newest') {
      list.sort((a, b) => (b.badge === 'New Arrival' ? 1 : 0) - (a.badge === 'New Arrival' ? 1 : 0));
    }

    const total = list.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const paginated = list.slice(start, start + limit);

    return {
      products: paginated,
      total,
      page,
      totalPages,
    };
  },

  // Get single product by slug
  async getProductBySlug(slug: string): Promise<Product | null> {
    try {
      const res = await fetch(`/api/products/${slug}`);
      if (res.ok) {
        const data = await res.json();
        return storefrontView(normalizeProduct(data));
      }
      // The server answered: this style does not exist (or was retired), so do not invent one
      if (res.status === 404) return null;
    } catch {
      // Backend not running, use mock
    }

    const mock = MOCK_PRODUCTS.find((p) => p.slug === slug);
    return mock ? normalizeProduct(mock) : null;
  },

  // Submit a customer review. The server decides the author and whether it is a verified purchase.
  async submitReview(
    productId: string,
    review: { rating: number; title?: string; comment: string; city?: string; sizePurchased?: ShoeSize },
    token: string
  ): Promise<ProductReview> {
    const res = await fetch(`/api/products/${productId}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(review),
    });
    const body = await parseApiJson<{ review: any }>(res, 'Could not publish your review');
    return { ...body.review, id: body.review.id || body.review._id };
  },
};
