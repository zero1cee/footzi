import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { couponService } from '../services/couponService.js';
import { createCouponSchema, updateCouponSchema, validateCouponSchema } from '../validators/couponValidators.js';

const fail = (res: Response, error: any, status = 400): void => {
  if (error.name === 'ZodError') {
    res.status(400).json({ error: error.errors[0]?.message || 'Validation failed', details: error.errors });
    return;
  }
  res.status(status).json({ error: error.message });
};

/** Lets the bag check a code against the server's rules. Guests get the general checks only. */
export const validateCoupon = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code, subtotal } = validateCouponSchema.parse(req.body);
    const check = await couponService.evaluate(code, subtotal, req.user?.id);
    if (!check.ok) {
      res.status(400).json({ valid: false, error: check.reason });
      return;
    }
    const { coupon, discount } = check;
    res.status(200).json({
      valid: true,
      code: coupon.code,
      description: coupon.description,
      type: coupon.type,
      value: coupon.value,
      maxDiscount: coupon.maxDiscount ?? null,
      minOrderValue: coupon.minOrderValue,
      discount,
    });
  } catch (error: any) {
    fail(res, error);
  }
};

export const listCouponsAdmin = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.status(200).json(await couponService.list());
  } catch (error: any) {
    fail(res, error, 500);
  }
};

export const createCouponAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = createCouponSchema.parse(req.body);
    const coupon = await couponService.create({ ...data, expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined } as any);
    res.status(201).json({ message: `Coupon ${coupon.code} created`, coupon });
  } catch (error: any) {
    fail(res, error);
  }
};

export const updateCouponAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = updateCouponSchema.parse(req.body);
    const patch: any = { ...data };
    if (data.expiresAt) patch.expiresAt = new Date(data.expiresAt);
    const coupon = await couponService.update(req.params.id as string, patch);
    if (!coupon) {
      res.status(404).json({ error: 'Coupon not found' });
      return;
    }
    res.status(200).json({ message: `Coupon ${coupon.code} updated`, coupon });
  } catch (error: any) {
    fail(res, error);
  }
};
