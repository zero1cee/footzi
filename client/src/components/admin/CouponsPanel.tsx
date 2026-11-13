import React, { useCallback, useEffect, useState } from 'react';
import { adminService } from '@/services/adminService';
import { formatINR } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

const inputClass = 'w-full bg-white border border-ivory-300 px-3 py-2 rounded-xs text-xs focus:outline-none focus:border-charcoal-900';

const blank = {
  code: '',
  description: '',
  type: 'percent' as 'percent' | 'flat',
  value: '10',
  minOrderValue: '',
  maxDiscount: '',
  usageLimit: '',
  perUserLimit: '',
  expiresAt: '',
  firstOrderOnly: false,
};

const describe = (c: any) => (c.type === 'percent' ? `${c.value}% off${c.maxDiscount ? ` (max ${formatINR(c.maxDiscount)})` : ''}` : `${formatINR(c.value)} off`);
const num = (v: string) => (v.trim() === '' ? undefined : Number(v));

interface Props {
  token: string;
  isReadOnly: boolean;
  onMessage: (message: string) => void;
}

export const CouponsPanel: React.FC<Props> = ({ token, isReadOnly, onMessage }) => {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<any | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      setCoupons(await adminService.getCoupons(token));
    } catch (err: any) {
      setLoadError(err.message || 'Could not load coupons');
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(blank);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({
      code: c.code,
      description: c.description || '',
      type: c.type,
      value: String(c.value),
      minOrderValue: c.minOrderValue ? String(c.minOrderValue) : '',
      maxDiscount: c.maxDiscount ? String(c.maxDiscount) : '',
      usageLimit: c.usageLimit ? String(c.usageLimit) : '',
      perUserLimit: c.perUserLimit ? String(c.perUserLimit) : '',
      expiresAt: c.expiresAt ? String(c.expiresAt).slice(0, 10) : '',
      firstOrderOnly: Boolean(c.firstOrderOnly),
    });
    setFormError(null);
    setFormOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    // Empty optional fields are sent as null so that clearing a limit really removes it
    const orNull = (v: string) => num(v) ?? null;
    const body: Record<string, unknown> = {
      description: form.description.trim(),
      type: form.type,
      value: Number(form.value),
      minOrderValue: num(form.minOrderValue) ?? 0,
      maxDiscount: form.type === 'percent' ? orNull(form.maxDiscount) : null,
      usageLimit: orNull(form.usageLimit),
      perUserLimit: orNull(form.perUserLimit),
      expiresAt: form.expiresAt || null,
      firstOrderOnly: form.firstOrderOnly,
    };
    try {
      if (editing) {
        const res = await adminService.updateCoupon(editing._id, body, token);
        onMessage(res.message);
      } else {
        const res = await adminService.createCoupon({ ...body, code: form.code.trim() }, token);
        onMessage(res.message);
      }
      setFormOpen(false);
      await load();
    } catch (err: any) {
      setFormError(err.message || 'Could not save the coupon');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (c: any) => {
    try {
      await adminService.updateCoupon(c._id, { isActive: !c.isActive }, token);
      onMessage(`${c.code} is now ${c.isActive ? 'switched off' : 'active'}`);
      await load();
    } catch (err: any) {
      onMessage(err.message || 'Could not change the coupon');
    }
  };

  const status = (c: any) => {
    if (!c.isActive) return 'Off';
    if (c.expiresAt && new Date(c.expiresAt).getTime() < Date.now()) return 'Expired';
    if (c.usageLimit && c.used >= c.usageLimit) return 'Used up';
    return 'Live';
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xs border border-ivory-200 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ivory-200 pb-4">
        <div>
          <h3 className="font-serif text-xl font-medium text-charcoal-950">Coupons ({coupons.length})</h3>
          <p className="text-xs text-charcoal-500 mt-0.5">Shoppers' codes are checked by the server every time. A cancelled order gives its use back.</p>
        </div>
        <Button variant="primary" size="sm" onClick={openCreate} disabled={isReadOnly}>New coupon</Button>
      </div>

      {loadError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xs" role="alert">{loadError}</div>}

      {formOpen && (
        <form onSubmit={save} className="p-5 bg-ivory-50 border border-ivory-300 rounded-xs space-y-4 text-xs">
          <h4 className="font-serif text-base font-medium text-charcoal-950">{editing ? `Edit ${editing.code}` : 'New coupon'}</h4>
          {formError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xs" role="alert">{formError}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="coupon-code" className="block font-semibold text-charcoal-700 mb-1">Code</label>
              <input id="coupon-code" className={`${inputClass} uppercase`} required disabled={Boolean(editing)} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="DIWALI20" />
              {editing && <p className="text-[10px] text-charcoal-500 mt-1">A code can't be renamed.</p>}
            </div>
            <div>
              <label htmlFor="coupon-type" className="block font-semibold text-charcoal-700 mb-1">Type</label>
              <select id="coupon-type" className={inputClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'percent' | 'flat' })}>
                <option value="percent">Percent off</option>
                <option value="flat">Flat ₹ off</option>
              </select>
            </div>
            <div>
              <label htmlFor="coupon-value" className="block font-semibold text-charcoal-700 mb-1">{form.type === 'percent' ? 'Percent (1-90)' : 'Rupees off'}</label>
              <input id="coupon-value" type="number" min={1} required className={inputClass} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </div>
          </div>

          <div>
            <label htmlFor="coupon-desc" className="block font-semibold text-charcoal-700 mb-1">Description (shown to the shopper)</label>
            <input id="coupon-desc" className={inputClass} maxLength={120} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="20% off for Diwali" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label htmlFor="coupon-min" className="block font-semibold text-charcoal-700 mb-1">Minimum order ₹</label>
              <input id="coupon-min" type="number" min={0} className={inputClass} value={form.minOrderValue} onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })} placeholder="None" />
            </div>
            <div>
              <label htmlFor="coupon-max" className="block font-semibold text-charcoal-700 mb-1">Max discount ₹</label>
              <input id="coupon-max" type="number" min={1} disabled={form.type === 'flat'} className={inputClass} value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} placeholder="No cap" />
            </div>
            <div>
              <label htmlFor="coupon-total" className="block font-semibold text-charcoal-700 mb-1">Total uses</label>
              <input id="coupon-total" type="number" min={1} className={inputClass} value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} placeholder="Unlimited" />
            </div>
            <div>
              <label htmlFor="coupon-peruser" className="block font-semibold text-charcoal-700 mb-1">Uses per customer</label>
              <input id="coupon-peruser" type="number" min={1} className={inputClass} value={form.perUserLimit} onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })} placeholder="Unlimited" />
            </div>
            <div>
              <label htmlFor="coupon-expiry" className="block font-semibold text-charcoal-700 mb-1">Expires on</label>
              <input id="coupon-expiry" type="date" className={inputClass} value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-charcoal-700 cursor-pointer">
            <input type="checkbox" checked={form.firstOrderOnly} onChange={(e) => setForm({ ...form, firstOrderOnly: e.target.checked })} />
            First order only
          </label>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" isLoading={saving}>{editing ? 'Save changes' : 'Create coupon'}</Button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-ivory-300 text-charcoal-500 uppercase tracking-wider text-[10px]">
              <th className="p-3">Code</th>
              <th className="p-3">Offer</th>
              <th className="p-3">Rules</th>
              <th className="p-3">Used</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ivory-200 text-charcoal-800">
            {coupons.map((c) => (
              <tr key={c._id}>
                <td className="p-3 font-mono font-bold text-charcoal-900">{c.code}</td>
                <td className="p-3">{describe(c)}{c.description && <span className="block text-[11px] text-charcoal-500">{c.description}</span>}</td>
                <td className="p-3 text-[11px] text-charcoal-600 space-y-0.5">
                  {c.minOrderValue > 0 && <span className="block">Min order {formatINR(c.minOrderValue)}</span>}
                  {c.firstOrderOnly && <span className="block">First order only</span>}
                  {c.perUserLimit && <span className="block">{c.perUserLimit} per customer</span>}
                  {c.expiresAt && <span className="block">Until {new Date(c.expiresAt).toLocaleDateString('en-GB')}</span>}
                  {!c.minOrderValue && !c.firstOrderOnly && !c.perUserLimit && !c.expiresAt && <span>None</span>}
                </td>
                <td className="p-3">{c.used}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td>
                <td className="p-3"><Badge variant={status(c) === 'Live' ? 'sand' : 'outline'}>{status(c)}</Badge></td>
                <td className="p-3 text-right space-x-3 whitespace-nowrap">
                  <button disabled={isReadOnly} onClick={() => openEdit(c)} className="font-semibold text-charcoal-800 underline disabled:opacity-40 disabled:no-underline">Edit</button>
                  <button disabled={isReadOnly} onClick={() => toggle(c)} className="font-semibold text-charcoal-800 underline disabled:opacity-40 disabled:no-underline">{c.isActive ? 'Switch off' : 'Switch on'}</button>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && !loadError && (
              <tr><td colSpan={6} className="p-6 text-center text-charcoal-500">No coupons yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
