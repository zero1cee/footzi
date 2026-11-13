import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { MOCK_PRODUCTS } from '../data/mockProducts';

const signedIn = { token: 'real-token', isAuthenticated: true, user: { _id: 'u1', name: 'Test', email: 't@e.com', role: 'customer' as const } };
const signedOut = { token: null, isAuthenticated: false, user: null };

const serverCart = (items: any[]) => ({ ok: true, json: async () => ({ message: 'Bag merged', cart: { _id: 'c1', user: 'u1', subtotal: 0, updatedAt: '', items } }) });

describe('bag follows the session', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    useAuthStore.setState(signedOut);
    useCartStore.setState({ items: [], couponCode: null, discountRate: 0 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('merges a guest bag into the saved bag on sign-in and adopts the server prices', async () => {
    const product = MOCK_PRODUCTS[0];
    useCartStore.getState().addItem(product, 'UK 8', 'Vintage Tan', '#8C4E28', 2);
    const guest = useCartStore.getState().items[0];

    fetchMock.mockResolvedValue(
      serverCart([
        {
          _id: 'line1',
          product: guest.productId,
          productName: guest.productName,
          productSlug: guest.productSlug,
          image: guest.image,
          variantSku: guest.sku,
          size: 'UK 8',
          color: 'Vintage Tan',
          colorHex: '#8C4E28',
          quantity: 2,
          unitPrice: 1234,
          lineTotal: 2468,
        },
      ])
    );

    useAuthStore.setState(signedIn);

    await vi.waitFor(() => expect(useCartStore.getState().items[0]?.price).toBe(1234));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/cart/merge');
    expect(JSON.parse(init.body).items).toEqual([
      { productId: guest.productId, variantSku: guest.sku, size: 'UK 8', color: 'Vintage Tan', quantity: 2 },
    ]);
    expect(init.headers.Authorization).toBe('Bearer real-token');
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it('keeps the guest bag when the server cannot be reached', async () => {
    useCartStore.getState().addItem(MOCK_PRODUCTS[0], 'UK 8', 'Vintage Tan', '#8C4E28', 1);
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    useAuthStore.setState(signedIn);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it('clears the bag on sign-out so the next person does not inherit it', () => {
    useAuthStore.setState(signedIn);
    fetchMock.mockResolvedValue(serverCart([]));
    useCartStore.setState({ items: [{ id: 'x' } as any], couponCode: 'FOOTZI10', discountRate: 0.1 });

    useAuthStore.setState(signedOut);

    expect(useCartStore.getState().items).toHaveLength(0);
    expect(useCartStore.getState().couponCode).toBeNull();
  });
});
