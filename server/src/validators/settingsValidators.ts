import { z } from 'zod';

const rupees = (label: string) =>
  z.number({ error: `${label} must be a number` }).min(0, `${label} cannot be negative`).max(1_000_000, `${label} is too large`);

export const updateSettingsSchema = z
  .object({
    freeShippingThreshold: rupees('The free shipping threshold'),
    shippingFee: rupees('The shipping fee'),
    orderExpiryMinutes: z.number({ error: 'Order expiry must be a number' }).int('Use whole minutes').min(5, 'Hold stock for at least 5 minutes').max(1440, 'Hold stock for at most 24 hours'),
    returnWindowDays: z.number({ error: 'The return window must be a number' }).int('Use whole days').min(1, 'The return window must be at least 1 day').max(60, 'The return window can be at most 60 days'),
    announcement: z
      .object({
        enabled: z.boolean(),
        label: z.string().trim().max(40, 'Keep the label under 40 characters'),
        message: z.string().trim().min(1, 'The announcement needs a message').max(160, 'Keep the message under 160 characters'),
        code: z.string().trim().toUpperCase().max(24, 'Keep the code under 24 characters').regex(/^[A-Z0-9_-]*$/, 'Use letters, numbers, dashes or underscores'),
      })
      .partial(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Nothing to update' })
  // A message that points at a code needs one
  .refine((d) => !(d.announcement?.message?.includes('{code}') && d.announcement.code === ''), { message: 'The message uses {code}, so enter a coupon code', path: ['announcement', 'code'] });
