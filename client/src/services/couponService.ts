import { parseApiJson } from '@/lib/utils';

/** A coupon the server has accepted for the current bag. */
export interface AppliedCoupon {
  code: string;
  description: string;
  type: 'percent' | 'flat';
  value: number;
  maxDiscount: number | null;
  minOrderValue: number;
}

/**
 * Mirrors the server's formula so the bag can show the discount as quantities change.
 * The server recalculates it when the order is placed, so this is only ever a preview.
 */
export const computeCouponDiscount = (coupon: AppliedCoupon | null, subtotal: number): number => {
  if (!coupon || subtotal <= 0 || subtotal < coupon.minOrderValue) return 0;
  const raw = coupon.type === 'percent' ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
  const capped = coupon.type === 'percent' && coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
  return Math.max(0, Math.min(capped, subtotal));
};

export const couponService = {
  /** Asks the server whether a code works for this bag. Throws with the server's reason when it does not. */
  async validate(code: string, subtotal: number, token?: string | null): Promise<AppliedCoupon & { discount: number }> {
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ code, subtotal }),
    });
    return parseApiJson(res, 'This coupon code is not valid.');
  },
};
