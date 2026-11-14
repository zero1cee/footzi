import { create } from 'zustand';

export interface ShopSettings {
  freeShippingThreshold: number;
  shippingFee: number;
  orderExpiryMinutes: number;
  returnWindowDays: number;
  announcement: { enabled: boolean; label: string; message: string; code: string };
}

/** What the shop does until the server says otherwise; identical to the server's own starting values. */
export const DEFAULT_SETTINGS: ShopSettings = {
  freeShippingThreshold: 1999,
  shippingFee: 149,
  orderExpiryMinutes: 30,
  returnWindowDays: 7,
  announcement: { enabled: true, label: 'Festive Privilege:', message: 'Use code {code} for 15% off first order', code: 'AGRAFIRST' },
};

interface SettingsState {
  settings: ShopSettings;
  /** Fetches the shop's current rules. If the server cannot be reached, the starting values stay in force. */
  load: () => Promise<void>;
}

const valid = (s: any): s is ShopSettings =>
  s &&
  typeof s.freeShippingThreshold === 'number' &&
  typeof s.shippingFee === 'number' &&
  typeof s.returnWindowDays === 'number' &&
  typeof s.orderExpiryMinutes === 'number' &&
  s.announcement &&
  typeof s.announcement.message === 'string';

export const useSettingsStore = create<SettingsState>()((set) => ({
  settings: DEFAULT_SETTINGS,
  load: async () => {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) return;
      const body = await res.json();
      if (valid(body)) set({ settings: body });
    } catch {
      // Offline or the server is down: keep what we have
    }
  },
}));

/** The settings in force, for code that is not a component (such as the bag's totals). */
export const currentSettings = (): ShopSettings => useSettingsStore.getState().settings;
