import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { adminService } from '@/services/adminService';
import { formatINR } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

const STATUSES = ['all', 'pending_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'return_requested', 'returned'];
const label = (s: string) => (s === 'all' ? 'All orders' : s.replace(/_/g, ' '));
const when = (v: string) => new Date(v).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** A cancelled order that is still marked paid has had its stock returned but not its money. */
const needsRefund = (o: any) => o.orderStatus === 'cancelled' && o.paymentStatus === 'paid' && (o.refundedAmount || 0) < o.total;

interface Props {
  token: string;
  isReadOnly: boolean;
  onMessage: (message: string) => void;
}

export const OrdersPanel: React.FC<Props> = ({ token, isReadOnly, onMessage }) => {
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ orders: any[]; total: number; totalPages: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await adminService.getOrders({ status, search: submittedSearch, page }, token));
    } catch (err: any) {
      setError(err.message || 'Could not load orders');
    }
  }, [status, submittedSearch, page, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const refund = async (order: any) => {
    setRefundingId(order._id);
    try {
      const res = await adminService.refundCancelledOrder(order._id, token);
      onMessage(res.message);
      await load();
    } catch (err: any) {
      onMessage(err.message || 'The refund could not be issued');
    } finally {
      setRefundingId(null);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xs border border-ivory-200 shadow-sm space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-ivory-200 pb-4">
        <div>
          <h3 className="font-serif text-xl font-medium text-charcoal-950">Customer Orders {data ? `(${data.total})` : ''}</h3>
          <p className="text-xs text-charcoal-500 mt-0.5">Search by order number, customer name or email. Open a row for the full picture.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setSubmittedSearch(search.trim());
            }}
          >
            <div className="relative">
              <input
                aria-label="Search orders"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search orders"
                className="bg-ivory-50 border border-ivory-300 pl-8 pr-3 py-2 text-xs rounded-xs focus:outline-none focus:border-charcoal-900 w-56"
              />
              <Search className="w-3.5 h-3.5 text-charcoal-400 absolute left-2.5 top-2.5" />
            </div>
            <Button type="submit" variant="secondary" size="sm">Search</Button>
          </form>
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="bg-ivory-50 border border-ivory-300 px-3 py-2 text-xs rounded-xs capitalize"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{label(s)}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xs" role="alert">{error}</div>}

      {data && data.orders.length === 0 && <p className="text-xs text-charcoal-500 py-8 text-center">No orders match.</p>}

      <div className="divide-y divide-ivory-200">
        {data?.orders.map((order) => {
          const open = openId === order._id;
          return (
            <div key={order._id}>
              <button
                onClick={() => setOpenId(open ? null : order._id)}
                aria-expanded={open}
                className="w-full flex items-center gap-3 py-3 text-left hover:bg-ivory-50/60 px-1"
              >
                {open ? <ChevronDown className="w-4 h-4 text-charcoal-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-charcoal-400 shrink-0" />}
                <span className="font-mono text-xs font-bold text-charcoal-900 w-36 shrink-0">#{order.orderNumber}</span>
                <span className="text-xs text-charcoal-600 flex-1 truncate">{order.customerName}</span>
                <span className="text-[11px] text-charcoal-400 hidden md:block w-40">{when(order.createdAt)}</span>
                <Badge variant="sand">{label(order.orderStatus)}</Badge>
                <span className="text-xs font-semibold text-charcoal-900 w-20 text-right">{formatINR(order.total)}</span>
                {needsRefund(order) && <Badge variant="outline">Refund due</Badge>}
              </button>

              {open && (
                <div className="pb-5 pl-8 pr-2 grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
                  <div className="space-y-2">
                    <h4 className="uppercase tracking-widest text-[10px] font-bold text-charcoal-700">Items</h4>
                    {order.items.map((item: any) => (
                      <div key={item.sku} className="flex items-center gap-2">
                        <img decoding="async" loading="lazy" src={item.image} alt="" className="w-9 h-9 object-cover rounded-xs border border-ivory-300" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-charcoal-900 truncate">{item.name}</p>
                          <p className="text-[11px] text-charcoal-500">{item.size} • {item.color} × {item.quantity}</p>
                        </div>
                        <span>{formatINR(item.lineTotal)}</span>
                      </div>
                    ))}
                    <dl className="pt-2 border-t border-ivory-200 space-y-1">
                      <div className="flex justify-between"><dt className="text-charcoal-500">Subtotal</dt><dd>{formatINR(order.subtotal)}</dd></div>
                      {order.discount > 0 && <div className="flex justify-between text-emerald-700"><dt>Coupon {order.couponCode}</dt><dd>−{formatINR(order.discount)}</dd></div>}
                      <div className="flex justify-between"><dt className="text-charcoal-500">Shipping</dt><dd>{order.shippingFee > 0 ? formatINR(order.shippingFee) : 'Free'}</dd></div>
                      <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{formatINR(order.total)}</dd></div>
                    </dl>
                  </div>

                  <div className="space-y-2">
                    <h4 className="uppercase tracking-widest text-[10px] font-bold text-charcoal-700">Customer & payment</h4>
                    <p className="text-charcoal-700 leading-relaxed">
                      {order.customerName}<br />{order.customerEmail}<br />{order.customerPhone}
                    </p>
                    <p className="text-charcoal-600 leading-relaxed">
                      {order.shippingAddress.addressLine}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}
                    </p>
                    <p className="text-charcoal-600">
                      Payment: <strong className="capitalize">{order.paymentStatus}</strong>
                      {order.paymentDetails?.gatewayPaymentId && <span className="font-mono text-[10px] text-charcoal-400"> {order.paymentDetails.gatewayPaymentId}</span>}
                    </p>
                    {(order.refundedAmount || 0) > 0 && <p className="text-emerald-700 font-medium">Refunded {formatINR(order.refundedAmount)}</p>}
                    {order.trackingNumber && <p className="text-charcoal-600">Tracking: <span className="font-mono">{order.trackingNumber}</span></p>}

                    {needsRefund(order) && (
                      <div className="p-3 bg-amber-50 border border-amber-300 rounded-xs space-y-2">
                        <p className="text-amber-900">This order was cancelled and its stock returned, but the refund has not gone through.</p>
                        <Button size="sm" variant="primary" isLoading={refundingId === order._id} disabled={isReadOnly} onClick={() => refund(order)}>
                          Retry refund of {formatINR(order.total - (order.refundedAmount || 0))}
                        </Button>
                        {isReadOnly && <p className="text-[11px] text-amber-800">The read-only demo cannot issue refunds.</p>}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="uppercase tracking-widest text-[10px] font-bold text-charcoal-700">History</h4>
                    <ol className="space-y-2">
                      {[...order.statusHistory].reverse().map((h: any, i: number) => (
                        <li key={i}>
                          <p className="font-semibold text-charcoal-800 capitalize">{String(h.status).replace(/_/g, ' ')}</p>
                          {h.note && <p className="text-charcoal-500">{h.note}</p>}
                          <p className="text-[10px] text-charcoal-400">{when(h.timestamp)}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs">
          <span className="text-charcoal-500">Page {data.totalPages ? page : 1} of {data.totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
};
