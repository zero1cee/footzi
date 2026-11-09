import { describe, it, expect, vi, beforeEach } from 'vitest';
import { returnService } from '@/services/returnService';

describe('Return & Size Exchange Service Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('requestReturn should issue POST request with authorization token and payload', async () => {
    const mockResponse = {
      message: 'Size exchange registered successfully',
      returnRequest: {
        returnNumber: 'RET-AGR-882194-01',
        type: 'exchange',
        status: 'requested',
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as any);

    const payload = {
      orderId: 'order_123',
      type: 'exchange' as const,
      customerComments: 'Toe box tight',
      items: [
        {
          sku: 'FTZ-BLG-TAN-UK8',
          productName: 'The Agra Belgravia Penny Loafer',
          size: 'UK 8',
          color: 'Vintage Tan',
          quantity: 1,
          price: 3899,
          reason: 'Fit issue - too tight',
          replacementSize: 'UK 9',
        },
      ],
    };

    const result = await returnService.requestReturn(payload, 'test-patron-token');

    expect(fetch).toHaveBeenCalledWith('/api/returns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-patron-token',
      },
      body: JSON.stringify(payload),
    });
    expect(result.message).toBe('Size exchange registered successfully');
    expect(result.returnRequest.type).toBe('exchange');
  });

  it('requestReturn should throw informative error when backend rejects request', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Order not found or does not belong to this patron account' }),
    } as any);

    await expect(
      returnService.requestReturn(
        {
          orderId: 'invalid_order',
          type: 'return',
          items: [],
        },
        'token'
      )
    ).rejects.toThrow('Order not found or does not belong to this patron account');
  });

  it('getMyReturns should retrieve return history for authenticated patron', async () => {
    const mockReturns = [
      {
        returnNumber: 'RET-AGR-882194-01',
        type: 'exchange',
        status: 'replacement_dispatched',
        replacementTrackingNumber: 'BD-EXC-99112233IN',
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockReturns,
    } as any);

    const data = await returnService.getMyReturns('patron-jwt');

    expect(fetch).toHaveBeenCalledWith('/api/returns/my-returns', {
      headers: {
        Authorization: 'Bearer patron-jwt',
      },
    });
    expect(data.length).toBe(1);
    expect(data[0].replacementTrackingNumber).toBe('BD-EXC-99112233IN');
  });
});
