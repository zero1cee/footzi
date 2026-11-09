import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../store/useCartStore';
import { MOCK_PRODUCTS } from '../data/mockProducts';

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

  it('should apply valid coupon codes correctly', () => {
    const product = MOCK_PRODUCTS[0]; // Price: ₹3,899
    const { addItem, applyCoupon, getDiscountAmount, getTotal } = useCartStore.getState();

    addItem(product, 'UK 8', 'Vintage Tan', '#8C4E28', 1);

    // Apply FOOTZI10 (10%)
    const res1 = applyCoupon('FOOTZI10');
    expect(res1.success).toBe(true);

    const expectedDiscount = Math.round(product.price * 0.1);
    expect(getDiscountAmount()).toBe(expectedDiscount);
    expect(getTotal()).toBe(product.price - expectedDiscount);

    // Apply invalid coupon
    const res2 = applyCoupon('FAKECODE99');
    expect(res2.success).toBe(false);
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
