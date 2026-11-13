import React, { useState } from 'react';
import { BellRing, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { stockAlertService } from '@/services/stockAlertService';
import { Button } from '@/components/ui/Button';

/** Shown for a sold-out size: leave an email and we send one message when it returns. */
export const NotifyWhenBack: React.FC<{ sku: string; sizeLabel: string }> = ({ sku, sizeLabel }) => {
  const accountEmail = useAuthStore((s) => s.user?.email ?? '');
  const [email, setEmail] = useState(accountEmail);
  const [sending, setSending] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      setConfirmation(await stockAlertService.subscribe(email.trim(), sku));
    } catch (err: any) {
      setError(err.message || 'Could not save your request');
    } finally {
      setSending(false);
    }
  };

  if (confirmation) {
    return (
      <div role="status" className="mt-3 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xs flex items-start gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
        <span>{confirmation}</span>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-3 p-4 bg-ivory-50 border border-ivory-300 rounded-xs space-y-2">
      <label htmlFor={`notify-${sku}`} className="flex items-center gap-1.5 text-xs font-semibold text-charcoal-800">
        <BellRing className="w-3.5 h-3.5 text-sand-600" aria-hidden="true" />
        Tell me when {sizeLabel} is back
      </label>
      <div className="flex gap-2">
        <input
          id={`notify-${sku}`}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 min-w-0 bg-white border border-ivory-300 px-3 py-2.5 text-xs text-charcoal-900 rounded-xs focus:outline-none focus:border-charcoal-900"
        />
        <Button type="submit" variant="secondary" size="sm" isLoading={sending}>
          Notify me
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-[11px] text-red-700">
          {error}
        </p>
      )}
      <p className="text-[11px] text-charcoal-500">One email, only when this size returns. Nothing else.</p>
    </form>
  );
};
