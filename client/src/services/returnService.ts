import { parseApiJson } from '@/lib/utils';

export interface RequestReturnPayload {
  orderId: string;
  type: 'return' | 'exchange';
  items: {
    sku: string;
    quantity: number;
    reason: string;
    replacementSize?: string;
    // Accepted for compatibility but ignored: the server reads these from the order
    productName?: string;
    size?: string;
    color?: string;
    price?: number;
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

    return parseApiJson(res, 'Failed to submit size exchange / return request');
  },

  async getMyReturns(token: string) {
    const res = await fetch('/api/returns/my-returns', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return parseApiJson(res, 'Failed to retrieve return history');
  },

  async getReturnById(id: string, token: string) {
    const res = await fetch(`/api/returns/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return parseApiJson(res, 'Failed to retrieve return details');
  },
};
