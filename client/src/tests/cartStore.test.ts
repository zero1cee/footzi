import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useCartStore } from '../store/useCartStore';
import { MOCK_PRODUCTS } from '../data/mockProducts';
import { computeCouponDiscount } from '../services/couponService';

describe('useCartStore - Ecommerce Business Logic', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
    useCartStore.getState().removeCoupon();
  });

  it('should initialize with an empty cart', () => {
    const { items, getTotalItemsCount, getSubtotal } = useCartStore.getState();
    expect(items).toHaveLength(0);
    expect(getTotalItemsCount()).toBe(0);
    expect(getSubtotal()).toBe(0);
  });

  it('should add footwear with selected variant size and color', () => {
    const product = MOCK_PRODUCTS[0];
    const { addItem } = useCartStore.getState();

    addItem(product, 'UK 8', 'Vintage Tan', '#8C4E28', 1);

    const { items, getTotalItemsCount, getSubtotal } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].productName).toBe(product.name);
    expect(items[0].size).toBe('UK 8');
    expect(items[0].color).toBe('Vintage Tan');
    expect(items[0].quantity).toBe(1);
    expect(items[0].price).toBe(product.price);
    expect(getTotalItemsCount()).toBe(1);
    expect(getSubtotal()).toBe(product.price);
  });

  it('should enforce stock limits to prevent overselling', () => {
    const product = MOCK_PRODUCTS[0];
    const variant = product.variants.find((v) => v.size === 'UK 10' && v.color === 'Imperial Onyx');
    const stockLimit = variant ? variant.stock : 4;

    const { addItem, updateQuantity } = useCartStore.getState();
    addItem(product, 'UK 10', 'Imperial Onyx', '#1C1C1C', 2);

    const itemId = useCartStore.getState().items[0].id;
    // Attempt to exceed stock
    updateQuantity(itemId, stockLimit + 10);

    const updatedQty = useCartStore.getState().items[0].quantity;
    expect(updatedQty).toBeLessThanOrEqual(stockLimit);
  });

  it('should calculate free pan-india delivery for orders >= ₹1,999', () => {
    const product = MOCK_PRODUCTS[0]; // Price: ₹3,899 (above ₹1,999)
    const { addItem, getShippingFee, getTotal } = useCartStore.getState();

    addItem(product, 'UK 8', 'Vintage Tan', '#8C4E28', 1);

    expect(getShippingFee()).toBe(0);
    expect(getTotal()).toBe(product.price);
  });

  describe('coupons are checked by the server', () => {
    const fetchMock = vi.fn();
    beforeEach(() => {
      vi.stubGlobal('fetch', fetchMock);
      fetchMock.mockReset();
    });
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    const accepted = (coupon: Record<string, unknown>) => ({ ok: true, status: 200, json: async () => ({ valid: true, discount: 0, ...coupon }) });
    const rejected = (error: string) => ({ ok: false, status: 400, json: async () => ({ valid: false, error }) });

    it('applies an accepted code and previews the discount as the bag changes', async () => {
      const product = MOCK_PRODUCTS[0]; // Price: ₹3,899
      const { addItem, applyCoupon } = useCartStore.getState();
      addItem(product, 'UK 8', 'Vintage Tan', '#8C4E28', 1);
      fetchMock.mockResolvedValue(
        accepted({ code: 'FOOTZI10', description: '10% off', type: 'percent', value: 10, maxDiscount: null, minOrderValue: 0 })
      );

      const res = await applyCoupon('footzi10');
      expect(res.success).toBe(true);
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ code: 'footzi10', subtotal: product.price });

      const state = useCartStore.getState();
      const expected = Math.round(product.price * 0.1);
      expect(state.getDiscountAmount()).toBe(expected);
      expect(state.getTotal()).toBe(product.price - expected);

      state.updateQuantity(state.items[0].id, 2);
      expect(useCartStore.getState().getDiscountAmount()).toBe(Math.round(product.price * 2 * 0.1));
    });

    it('shows the server reason and applies nothing when a code is refused', async () => {
      const { addItem, applyCoupon } = useCartStore.getState();
      addItem(MOCK_PRODUCTS[0], 'UK 8', 'Vintage Tan', '#8C4E28', 1);
      fetchMock.mockResolvedValue(rejected('This coupon has expired.'));

      const res = await applyCoupon('OLD');
      expect(res).toEqual({ success: false, message: 'This coupon has expired.' });
      expect(useCartStore.getState().couponCode).toBeNull();
      expect(useCartStore.getState().getDiscountAmount()).toBe(0);
    });

    it('does not apply a code to an empty bag or when the server cannot be reached', async () => {
      expect((await useCartStore.getState().applyCoupon('FOOTZI10')).success).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();

      useCartStore.getState().addItem(MOCK_PRODUCTS[0], 'UK 8', 'Vintage Tan', '#8C4E28', 1);
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
      const res = await useCartStore.getState().applyCoupon('FOOTZI10');
      expect(res.success).toBe(false);
      expect(res.message).toMatch(/couldn't check/i);
      expect(useCartStore.getState().couponCode).toBeNull();
    });

    it('caps percent coupons, limits flat ones to the bag, and honours the minimum order', () => {
      const percent = { code: 'P', description: '', type: 'percent' as const, value: 50, maxDiscount: 700, minOrderValue: 0 };
      expect(computeCouponDiscount(percent, 4000)).toBe(700);
      expect(computeCouponDiscount(percent, 1000)).toBe(500);

      const flat = { code: 'F', description: '', type: 'flat' as const, value: 500, maxDiscount: null, minOrderValue: 0 };
      expect(computeCouponDiscount(flat, 300)).toBe(300);
      expect(computeCouponDiscount(null, 4000)).toBe(0);

      const withMin = { ...flat, minOrderValue: 3000 };
      expect(computeCouponDiscount(withMin, 2999)).toBe(0);
      expect(computeCouponDiscount(withMin, 3000)).toBe(500);
    });

    it('tells the shopper how much more is needed to unlock a minimum-order coupon', () => {
      const product = MOCK_PRODUCTS[0];
      useCartStore.getState().addItem(product, 'UK 8', 'Vintage Tan', '#8C4E28', 1);
      useCartStore.setState({
        couponCode: 'BIG',
        coupon: { code: 'BIG', description: '', type: 'flat', value: 500, maxDiscount: null, minOrderValue: product.price + 1000 },
      });

      expect(useCartStore.getState().getCouponShortfall()).toBe(1000);
      expect(useCartStore.getState().getDiscountAmount()).toBe(0);
    });
  });

  it('should toggle wishlist items cleanly', () => {
    const { toggleWishlist, isInWishlist } = useCartStore.getState();
    const testId = 'test-silhouette-99';

    expect(isInWishlist(testId)).toBe(false);

    toggleWishlist(testId);
    expect(isInWishlist(testId)).toBe(true);

    toggleWishlist(testId);
    expect(isInWishlist(testId)).toBe(false);
  });
});
