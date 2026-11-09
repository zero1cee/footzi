export type ShoeSize = 'UK 6' | 'UK 7' | 'UK 8' | 'UK 9' | 'UK 10' | 'UK 11';

export interface ProductVariant {
  id: string;
  sku: string;
  size: ShoeSize;
  color: string;
  colorHex: string;
  stock: number;
  priceOverride?: number;
  supplierRef?: string;
}

export interface ProductReview {
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

export interface Product {
  id: string;
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
  variants: ProductVariant[];
  material: string;
  sole: string;
  craftsmanshipLocation: string;
  features: string[];
  reviews?: ProductReview[];
}

export interface CartItem {
  id: string; // unique item key: productId-sku
  productId: string;
  productName: string;
  productSlug: string;
  variantId: string;
  sku: string;
  size: ShoeSize;
  color: string;
  colorHex: string;
  price: number;
  image: string;
  quantity: number;
  stock: number;
}

export interface FilterState {
  category: string;
  brand: string;
  sortBy: 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'newest';
  sizes: ShoeSize[];
  colors: string[];
  minPrice: number;
  maxPrice: number;
  inStockOnly: boolean;
  search: string;
}
