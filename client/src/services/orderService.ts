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

/** How a request proves it may use an order: an account's sign-in token, or a guest's order secret. */
export type OrderAuth = string | { bearer?: string | null; orderToken?: string | null } | null | undefined;

const authHeaders = (auth: OrderAuth): Record<string, string> => {
  if (!auth) return {};
  if (typeof auth === 'string') return { Authorization: `Bearer ${auth}` };
  return {
    ...(auth.bearer ? { Authorization: `Bearer ${auth.bearer}` } : {}),
    ...(auth.orderToken ? { 'X-Order-Token': auth.orderToken } : {}),
  };
};

const hasBearer = (auth: OrderAuth): boolean => (typeof auth === 'string' ? Boolean(auth) : Boolean(auth?.bearer));

const json = (auth: OrderAuth) => ({ 'Content-Type': 'application/json', ...authHeaders(auth) });

export const orderService = {
  /**
   * Signed in: places the order on the account. Otherwise: places it as a guest, and the returned order carries
   * `accessToken`, the secret that proves it is theirs for paying, viewing and cancelling.
   */
  async createOrder(payload: CreateOrderPayload, auth: OrderAuth) {
    const guest = !hasBearer(auth);
    const res = await fetch(guest ? '/api/orders/guest' : '/api/orders', {
      method: 'POST',
      headers: json(auth),
      body: JSON.stringify(payload),
    });

    const body = await parseApiJson(res, 'Failed to place order');
    return guest ? { ...body.order, accessToken: body.accessToken as string } : body.order;
  },

  async createPaymentOrder(orderId: string, auth: OrderAuth) {
    const res = await fetch('/api/payments/create-order', {
      method: 'POST',
      headers: json(auth),
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
    auth: OrderAuth
  ) {
    const res = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: json(auth),
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

  async getOrderById(id: string, auth: OrderAuth) {
    const res = await fetch(`/api/orders/${id}`, { headers: authHeaders(auth) });
    return parseApiJson(res, 'Order not found');
  },

  async cancelOrder(id: string, reason: string | undefined, auth: OrderAuth) {
    const res = await fetch(`/api/orders/${id}/cancel`, {
      method: 'POST',
      headers: json(auth),
      body: JSON.stringify({ reason }),
    });
    return parseApiJson(res, 'Failed to cancel order');
  },

  /** Adds a guest order to the signed-in customer's account, using the secret from the order link. */
  async claimOrder(id: string, orderToken: string, bearer: string) {
    const res = await fetch(`/api/orders/${id}/claim`, {
      method: 'POST',
      headers: json(bearer),
      body: JSON.stringify({ token: orderToken }),
    });
    return parseApiJson(res, 'Could not add this order to your account');
  },

  /** Asks for an email with a link back to an order. The answer is the same whether or not it exists. */
  async requestOrderLink(orderNumber: string, email: string): Promise<string> {
    const res = await fetch('/api/orders/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderNumber, email }),
    });
    return (await parseApiJson<{ message: string }>(res, 'Could not send the link')).message;
  },
};
