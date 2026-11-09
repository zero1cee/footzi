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
    if (!res.ok) throw new Error('Failed to fetch cart');
    return res.json();
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
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to add item to bag');
    }
    return res.json();
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
    if (!res.ok) throw new Error('Failed to update bag');
    return res.json();
  },

  async removeItem(itemId: string, token: string): Promise<{ message: string; cart: ServerCart }> {
    const res = await fetch(`/api/cart/items/${itemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to remove item');
    return res.json();
  },

  async clearCart(token: string): Promise<{ message: string; cart: ServerCart }> {
    const res = await fetch('/api/cart', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to clear bag');
    return res.json();
  },
};
