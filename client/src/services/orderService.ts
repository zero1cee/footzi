export interface CreateOrderPayload {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: {
    productId: string;
    variantSku: string;
    size: string;
    color: string;
    quantity: number;
  }[];
  shippingAddress: {
    name: string;
    phone: string;
    addressLine: string;
    city: string;
    state: string;
    pincode: string;
  };
  couponCode?: string;
}

export const orderService = {
  async createOrder(payload: CreateOrderPayload, token: string) {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error || 'Failed to place order');
    }
    return body.order;
  },

  async createPaymentOrder(orderId: string, token: string) {
    const res = await fetch('/api/payments/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ orderId }),
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error || 'Failed to initiate payment');
    }
    return body;
  },

  async verifyPayment(
    data: {
      orderId: string;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
    token: string
  ) {
    const res = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.message || body.error || 'Payment verification failed');
    }
    return body;
  },

  async getMyOrders(token: string) {
    const res = await fetch('/api/orders/my-orders', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch orders');
    return res.json();
  },

  async getOrderById(id: string, token: string) {
    const res = await fetch(`/api/orders/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Order not found');
    return res.json();
  },
};
