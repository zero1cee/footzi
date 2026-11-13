import mongoose from 'mongoose';
import { Coupon, ICoupon } from '../models/Coupon.js';
import { Order } from '../models/Order.js';

export const normalizeCode = (code: unknown): string => String(code ?? '').trim().toUpperCase();

/** The one place the discount is calculated; the storefront mirrors this formula for its live preview. */
export const computeDiscount = (coupon: Pick<ICoupon, 'type' | 'value' | 'maxDiscount'>, subtotal: number): number => {
  const raw = coupon.type === 'percent' ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
  const capped = coupon.type === 'percent' && coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
  return Math.max(0, Math.min(capped, subtotal));
};

export type CouponCheck =
  | { ok: true; coupon: ICoupon; discount: number }
  | { ok: false; reason: string };

// A cancelled or expired order gives its redemption back
const redemptions = (filter: Record<string, unknown>) =>
  Order.countDocuments({ ...filter, orderStatus: { $ne: 'cancelled' } });

/** Starter codes, created once and never overwritten, so admin edits survive restarts. */
export const DEFAULT_COUPONS = [
  { code: 'FOOTZI10', description: '10% off your order', type: 'percent' as const, value: 10 },
  { code: 'AGRAFIRST', description: '15% off your first order', type: 'percent' as const, value: 15, firstOrderOnly: true },
];

export const ensureDefaultCoupons = async (): Promise<void> => {
  for (const coupon of DEFAULT_COUPONS) {
    await Coupon.updateOne({ code: coupon.code }, { $setOnInsert: coupon }, { upsert: true });
  }
};

export class CouponService {
  /**
   * Checks a code against the bag. With a userId the per-customer rules (first order,
   * per-user limit) are enforced; without one (a guest previewing) only the general
   * rules are checked, and the order itself re-checks everything.
   */
  async evaluate(rawCode: unknown, subtotal: number, userId?: string): Promise<CouponCheck> {
    const code = normalizeCode(rawCode);
    const coupon = code ? await Coupon.findOne({ code }) : null;
    if (!coupon || !coupon.isActive) return { ok: false, reason: 'This coupon code is not valid.' };
    if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'This coupon has expired.' };
    if (subtotal < coupon.minOrderValue) {
      return { ok: false, reason: `Add ₹${coupon.minOrderValue - subtotal} more to use this coupon (minimum order ₹${coupon.minOrderValue}).` };
    }

    if (userId && mongoose.isValidObjectId(userId)) {
      if (coupon.firstOrderOnly && (await redemptions({ user: userId })) > 0) {
        return { ok: false, reason: 'This coupon is only for your first order.' };
      }
      if (coupon.perUserLimit && (await redemptions({ user: userId, couponCode: code })) >= coupon.perUserLimit) {
        return { ok: false, reason: 'You have already used this coupon.' };
      }
    }

    if (coupon.usageLimit && (await redemptions({ couponCode: code })) >= coupon.usageLimit) {
      return { ok: false, reason: 'This coupon has been fully redeemed.' };
    }

    const discount = computeDiscount(coupon, subtotal);
    if (discount <= 0) return { ok: false, reason: 'This coupon does not apply to your bag.' };
    return { ok: true, coupon, discount };
  }

  async list() {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    const counts = await Order.aggregate([
      { $match: { couponCode: { $in: coupons.map((c) => c.code) }, orderStatus: { $ne: 'cancelled' } } },
      { $group: { _id: '$couponCode', used: { $sum: 1 } } },
    ]);
    const used = new Map(counts.map((c) => [c._id as string, c.used as number]));
    return coupons.map((c) => ({ ...c, used: used.get(c.code) ?? 0 }));
  }

  async create(data: Partial<ICoupon>) {
    try {
      return await Coupon.create(data);
    } catch (error: any) {
      if (error.code === 11000) throw new Error(`A coupon with the code ${data.code} already exists.`);
      throw error;
    }
  }

  async update(id: string, data: Partial<ICoupon>) {
    if (!mongoose.isValidObjectId(id)) return null;
    // The code is the customer-facing identity and orders refer to it, so it never changes
    const { code: _ignored, ...rest } = data as any;
    const $set: Record<string, unknown> = {};
    const $unset: Record<string, ''> = {};
    for (const [key, value] of Object.entries(rest)) {
      if (value === null) $unset[key] = '';
      else $set[key] = value;
    }
    return Coupon.findByIdAndUpdate(id, { ...(Object.keys($set).length ? { $set } : {}), ...(Object.keys($unset).length ? { $unset } : {}) }, { new: true, runValidators: true });
  }
}

export const couponService = new CouponService();
