import { Setting, IShopSettings } from '../models/Setting.js';

/** What the shop does until an admin changes it. Every field has a value, so the site never depends on the database being filled in. */
export const defaultSettings = (): IShopSettings => ({
  freeShippingThreshold: 1999,
  shippingFee: 149,
  // The ORDER_EXPIRY_MINUTES environment variable still sets the starting value
  orderExpiryMinutes: Number(process.env.ORDER_EXPIRY_MINUTES) || 30,
  returnWindowDays: 7,
  announcement: {
    enabled: true,
    label: 'Festive Privilege:',
    message: 'Use code {code} for 15% off first order',
    code: 'AGRAFIRST',
  },
});

const CACHE_MS = 30_000;

export class SettingsService {
  private cache: { value: IShopSettings; at: number } | null = null;

  /** The settings in force: stored values laid over the defaults. Cached briefly, because most requests need them. */
  async get(): Promise<IShopSettings> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.value;

    const defaults = defaultSettings();
    const stored = await Setting.findOne({ key: 'shop' }).lean();
    const value: IShopSettings = {
      freeShippingThreshold: stored?.freeShippingThreshold ?? defaults.freeShippingThreshold,
      shippingFee: stored?.shippingFee ?? defaults.shippingFee,
      orderExpiryMinutes: stored?.orderExpiryMinutes ?? defaults.orderExpiryMinutes,
      returnWindowDays: stored?.returnWindowDays ?? defaults.returnWindowDays,
      announcement: {
        enabled: stored?.announcement?.enabled ?? defaults.announcement.enabled,
        label: stored?.announcement?.label ?? defaults.announcement.label,
        message: stored?.announcement?.message ?? defaults.announcement.message,
        code: stored?.announcement?.code ?? defaults.announcement.code,
      },
    };
    this.cache = { value, at: Date.now() };
    return value;
  }

  /** Saves only the fields given, so editing the banner never resets the shipping rules. */
  async update(patch: Partial<Omit<IShopSettings, 'announcement'>> & { announcement?: Partial<IShopSettings['announcement']> }, updatedBy?: string): Promise<IShopSettings> {
    const $set: Record<string, unknown> = { updatedBy };
    for (const key of ['freeShippingThreshold', 'shippingFee', 'orderExpiryMinutes', 'returnWindowDays'] as const) {
      if (patch[key] !== undefined) $set[key] = patch[key];
    }
    for (const [key, value] of Object.entries(patch.announcement ?? {})) {
      if (value !== undefined) $set[`announcement.${key}`] = value;
    }
    await Setting.updateOne({ key: 'shop' }, { $set, $setOnInsert: { key: 'shop' } }, { upsert: true });
    this.cache = null;
    return this.get();
  }

  /** Forgets the cached copy (used by tests). */
  clearCache(): void {
    this.cache = null;
  }
}

export const settingsService = new SettingsService();

/** Shipping for a bag, from the settings in force. */
export const shippingFor = (subtotal: number, settings: Pick<IShopSettings, 'freeShippingThreshold' | 'shippingFee'>): number =>
  subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingFee;
