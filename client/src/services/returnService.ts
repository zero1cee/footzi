export interface RequestReturnPayload {
  orderId: string;
  type: 'return' | 'exchange';
  items: {
    sku: string;
    productName: string;
    size: string;
    color: string;
    quantity: number;
    price: number;
    reason: string;
    replacementSize?: string;
    replacementColor?: string;
  }[];
  customerComments?: string;
}

export const returnService = {
  async requestReturn(payload: RequestReturnPayload, token: string) {
    const res = await fetch('/api/returns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Failed to submit size exchange / return request');
    return body;
  },

  async getMyReturns(token: string) {
    const res = await fetch('/api/returns/my-returns', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error('Failed to retrieve return history');
    return res.json();
  },

  async getReturnById(id: string, token: string) {
    const res = await fetch(`/api/returns/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error('Failed to retrieve return details');
    return res.json();
  },
};
