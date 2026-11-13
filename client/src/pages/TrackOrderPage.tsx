import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Mail } from 'lucide-react';
import { orderService } from '@/services/orderService';
import { Button } from '@/components/ui/Button';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

/** For customers without an account (or who lost the email): asks for a link back to the order by email. */
export const TrackOrderPage: React.FC = () => {
  useDocumentMeta({ title: 'Find your order — Footzi', noindex: true });
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      setMessage(await orderService.requestOrderLink(orderNumber.trim(), email.trim()));
    } catch (err: any) {
      setError(err.message || 'Could not send the link');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="py-12 md:py-20 bg-ivory-100 min-h-[80vh] flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="bg-white p-8 sm:p-10 rounded-xs border border-ivory-200 shadow-elevated">
          <h1 className="font-serif text-2xl font-medium text-charcoal-950">Find your order</h1>
          <p className="text-xs text-charcoal-500 mt-1 mb-6">
            Enter your order number and the email you used at checkout. We'll email you a private link to the order.
            Have an account? <Link to="/login" className="font-semibold text-charcoal-900 underline">Sign in</Link> to see all your orders.
          </p>

          {message ? (
            <div role="status" className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p>{message}</p>
                <p className="mt-1 text-emerald-700">Check your spam folder if it doesn't arrive within a few minutes.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {error && (
                <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xs">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="track-number" className="block text-xs font-semibold text-charcoal-700 mb-1">Order number</label>
                <input
                  id="track-number"
                  required
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="FTZ-AGR-123456"
                  autoComplete="off"
                  className="w-full bg-ivory-50 border border-ivory-300 px-3 py-2.5 text-xs text-charcoal-900 uppercase placeholder:normal-case rounded-xs focus:outline-none focus:border-charcoal-900"
                />
              </div>
              <div>
                <label htmlFor="track-email" className="block text-xs font-semibold text-charcoal-700 mb-1">Email address</label>
                <div className="relative">
                  <input
                    id="track-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-ivory-50 border border-ivory-300 px-3 py-2.5 pl-9 text-xs text-charcoal-900 rounded-xs focus:outline-none focus:border-charcoal-900"
                  />
                  <Mail className="w-4 h-4 text-charcoal-400 absolute left-2.5 top-3" aria-hidden="true" />
                </div>
              </div>
              <Button type="submit" variant="primary" size="lg" isLoading={sending} className="w-full">
                Email me the link
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackOrderPage;
