import React, { useEffect, useState } from 'react';
import { adminService } from '@/services/adminService';
import { DEFAULT_SETTINGS, ShopSettings, useSettingsStore } from '@/store/useSettingsStore';
import { formatINR } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

const inputClass = 'w-full bg-white border border-ivory-300 px-3 py-2.5 rounded-xs text-xs focus:outline-none focus:border-charcoal-900 disabled:opacity-60';

interface Form {
  freeShippingThreshold: string;
  shippingFee: string;
  orderExpiryMinutes: string;
  returnWindowDays: string;
  enabled: boolean;
  label: string;
  message: string;
  code: string;
}

const toForm = (s: ShopSettings): Form => ({
  freeShippingThreshold: String(s.freeShippingThreshold),
  shippingFee: String(s.shippingFee),
  orderExpiryMinutes: String(s.orderExpiryMinutes),
  returnWindowDays: String(s.returnWindowDays),
  enabled: s.announcement.enabled,
  label: s.announcement.label,
  message: s.announcement.message,
  code: s.announcement.code,
});

interface Props {
  token: string;
  isReadOnly: boolean;
  onMessage: (message: string) => void;
}

/** The rules the shop runs by. Saved changes apply to new orders straight away. */
export const SettingsPanel: React.FC<Props> = ({ token, isReadOnly, onMessage }) => {
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    adminService
      .getSettings(token)
      .then((s) => active && setForm(toForm(s)))
      .catch((err) => active && setError(err.message || 'Could not load the settings'));
    return () => {
      active = false;
    };
  }, [token]);

  if (!form) {
    return error ? (
      <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xs">{error}</div>
    ) : (
      <p role="status" className="text-xs text-charcoal-500 py-10 text-center">Loading the settings…</p>
    );
  }

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm({ ...form, [key]: value });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await adminService.updateSettings(
        {
          freeShippingThreshold: Number(form.freeShippingThreshold),
          shippingFee: Number(form.shippingFee),
          orderExpiryMinutes: Number(form.orderExpiryMinutes),
          returnWindowDays: Number(form.returnWindowDays),
          announcement: { enabled: form.enabled, label: form.label.trim(), message: form.message.trim(), code: form.code.trim() },
        },
        token
      );
      setForm(toForm(res.settings));
      // The storefront in this browser picks up the change at once
      useSettingsStore.setState({ settings: res.settings });
      onMessage(res.message);
    } catch (err: any) {
      setError(err.message || 'Could not save the settings');
    } finally {
      setSaving(false);
    }
  };

  const [before, after] = form.message.split('{code}');
  const field = (id: string, label: string, key: keyof Form, hint: string, props: Record<string, unknown> = {}) => (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-charcoal-700 mb-1">{label}</label>
      <input id={id} type="number" min={0} className={inputClass} disabled={isReadOnly} value={form[key] as string} onChange={(e) => set(key, e.target.value as never)} {...props} />
      <p className="text-[11px] text-charcoal-500 mt-1">{hint}</p>
    </div>
  );

  return (
    <form onSubmit={save} className="bg-white p-6 sm:p-8 rounded-xs border border-ivory-200 shadow-sm space-y-8">
      <div className="border-b border-ivory-200 pb-4">
        <h3 className="font-serif text-xl font-medium text-charcoal-950">Shop settings</h3>
        <p className="text-xs text-charcoal-500 mt-0.5">The rules the shop runs by. New orders use changes straight away and the storefront follows within a couple of minutes. Existing orders keep what they were charged.</p>
      </div>

      {error && <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xs">{error}</div>}
      {isReadOnly && <p className="text-[11px] text-charcoal-500">The read-only demo can look but not change settings.</p>}

      <section aria-labelledby="settings-shipping" className="space-y-4">
        <h4 id="settings-shipping" className="text-[11px] uppercase tracking-widest font-bold text-charcoal-700">Shipping</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {field('set-threshold', 'Free shipping from (₹)', 'freeShippingThreshold', 'Orders at or above this subtotal ship free. Enter 0 to ship everything free.', { required: true })}
          {field('set-fee', 'Shipping fee (₹)', 'shippingFee', 'Charged on smaller orders.', { required: true })}
        </div>
        <p className="text-[11px] text-charcoal-600">
          Customers will see: free shipping on orders of {formatINR(Number(form.freeShippingThreshold) || 0)} or more, otherwise {formatINR(Number(form.shippingFee) || 0)}.
        </p>
      </section>

      <section aria-labelledby="settings-orders" className="space-y-4">
        <h4 id="settings-orders" className="text-[11px] uppercase tracking-widest font-bold text-charcoal-700">Orders and returns</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {field('set-expiry', 'Hold unpaid orders for (minutes)', 'orderExpiryMinutes', 'Between 5 and 1440. After this the pairs go back on sale.', { required: true, min: 5, max: 1440 })}
          {field('set-window', 'Return window (days)', 'returnWindowDays', 'Days after delivery that a return or exchange can be requested (1 to 60).', { required: true, min: 1, max: 60 })}
        </div>
      </section>

      <section aria-labelledby="settings-banner" className="space-y-4">
        <h4 id="settings-banner" className="text-[11px] uppercase tracking-widest font-bold text-charcoal-700">Announcement bar</h4>
        <label className="flex items-center gap-2 text-xs text-charcoal-700 cursor-pointer">
          <input type="checkbox" checked={form.enabled} disabled={isReadOnly} onChange={(e) => set('enabled', e.target.checked)} />
          Show the bar at the top of every page
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label htmlFor="set-label" className="block text-xs font-semibold text-charcoal-700 mb-1">Label</label>
            <input id="set-label" className={inputClass} maxLength={40} disabled={isReadOnly} value={form.label} onChange={(e) => set('label', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="set-message" className="block text-xs font-semibold text-charcoal-700 mb-1">Message</label>
            <input id="set-message" className={inputClass} maxLength={160} disabled={isReadOnly} value={form.message} onChange={(e) => set('message', e.target.value)} />
            <p className="text-[11px] text-charcoal-500 mt-1">Write <code className="font-mono">{'{code}'}</code> where the coupon code should appear.</p>
          </div>
          <div>
            <label htmlFor="set-code" className="block text-xs font-semibold text-charcoal-700 mb-1">Coupon code</label>
            <input id="set-code" className={`${inputClass} uppercase`} maxLength={24} disabled={isReadOnly} value={form.code} onChange={(e) => set('code', e.target.value)} />
          </div>
        </div>
        <div className="bg-charcoal-950 text-ivory-100 text-xs py-2.5 px-4 rounded-xs text-center" aria-label="Preview of the announcement bar">
          {form.enabled ? (
            <>
              {form.label && <span className="text-sand-300 font-medium mr-1.5">{form.label}</span>}
              {before}
              {after !== undefined && form.code && <span className="font-semibold text-white tracking-widest bg-charcoal-800 px-1.5 py-0.5 rounded-xs">{form.code.toUpperCase()}</span>}
              {after}
            </>
          ) : (
            <span className="text-charcoal-400">The bar is hidden.</span>
          )}
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-ivory-200">
        <Button type="button" variant="outline" size="sm" disabled={isReadOnly} onClick={() => setForm(toForm(DEFAULT_SETTINGS))}>Fill in the starting values</Button>
        <Button type="submit" variant="primary" size="sm" isLoading={saving} disabled={isReadOnly}>Save settings</Button>
      </div>
    </form>
  );
};
