import { parseApiJson } from '@/lib/utils';

export interface ServerCartItem {
  _id: string;
  product: {
    _id: string;
    id?: string;
    name: string;
    slug: string;
    images: string[];
    price: number;
  };
  sku: string;
  size: string;
  color: string;
  colorHex?: string;
  price: number;
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

  async updateQuantity(itemId: string, quantity: number, token: string): Promise<{ message: string; cart: ServerCart }> {
    const res = await fetch(`/api/cart/items/${itemId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ quantity }),
    });
    return parseApiJson(res, 'Failed to update bag');
  },

  async removeItem(itemId: string, token: string): Promise<{ message: string; cart: ServerCart }> {
    const res = await fetch(`/api/cart/items/${itemId}`, {
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
