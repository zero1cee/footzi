import { parseApiJson } from '@/lib/utils';

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

    const body = await parseApiJson(res, 'Failed to place order');
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

    return parseApiJson(res, 'Failed to initiate payment');
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

    return parseApiJson(res, 'Payment verification failed', true);
  },

  async getMyOrders(token: string) {
    const res = await fetch('/api/orders/my-orders', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return parseApiJson(res, 'Failed to fetch orders');
  },

  async getOrderById(id: string, token: string) {
    const res = await fetch(`/api/orders/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return parseApiJson(res, 'Order not found');
  },

  async cancelOrder(id: string, reason: string | undefined, token: string) {
    const res = await fetch(`/api/orders/${id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });
    return parseApiJson(res, 'Failed to cancel order');
  },
};
