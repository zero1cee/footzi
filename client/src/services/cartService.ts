import { parseApiJson } from '@/lib/utils';

// Mirrors the cart line stored by the server (server/src/models/Cart.ts)
export interface ServerCartItem {
  _id: string;
  product: string;
  productName: string;
  productSlug: string;
  image: string;
  variantSku: string;
  size: string;
  color: string;
  colorHex?: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface ServerCart {
  _id: string;
  user: string;
  items: ServerCartItem[];
  subtotal: number;
  updatedAt: string;
}

export const cartService = {
  async getCart(token: string): Promise<ServerCart> {
    const res = await fetch('/api/cart', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return parseApiJson<ServerCart>(res, 'Failed to fetch cart');
  },

  async addItem(
    item: {
      productId: string;
      variantSku: string;
      size: string;
      color: string;
      quantity: number;
    },
    token: string
  ): Promise<{ message: string; cart: ServerCart }> {
    const res = await fetch('/api/cart/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(item),
    });
    return parseApiJson(res, 'Failed to add item to bag');
  },

  // Folds a guest's bag into the saved bag; safe to repeat because the larger quantity wins
  async mergeItems(
    items: { productId: string; variantSku: string; size: string; color: string; quantity: number }[],
    token: string
  ): Promise<{ message: string; cart: ServerCart }> {
    const res = await fetch('/api/cart/merge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ items }),
    });
    return parseApiJson(res, 'Failed to merge your bag');
  },

  // Cart lines are addressed by variant SKU, which both client and server know
  async updateQuantity(sku: string, quantity: number, token: string): Promise<{ message: string; cart: ServerCart }> {
    const res = await fetch(`/api/cart/items/${encodeURIComponent(sku)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ quantity }),
    });
    return parseApiJson(res, 'Failed to update bag');
  },

  async removeItem(sku: string, token: string): Promise<{ message: string; cart: ServerCart }> {
    const res = await fetch(`/api/cart/items/${encodeURIComponent(sku)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    return parseApiJson(res, 'Failed to remove item');
  },

  async clearCart(token: string): Promise<{ message: string; cart: ServerCart }> {
    const res = await fetch('/api/cart', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    return parseApiJson(res, 'Failed to clear bag');
  },
};
