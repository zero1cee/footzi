import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, MapPin, Truck, XCircle } from 'lucide-react';
import { useOrderAccess } from '@/hooks/useOrderAccess';
import { orderService } from '@/services/orderService';
import { formatINR } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useSettingsStore } from '@/store/useSettingsStore';

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Awaiting payment',
  confirmed: 'Order confirmed',
  processing: 'Being crafted in Agra',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  return_requested: 'Return requested',
  returned: 'Returned',
};

const label = (status: string) => STATUS_LABELS[status] ?? status.replace(/_/g, ' ');

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Mirrors the server: paid orders can be cancelled until they ship, unpaid ones any time before they expire. */
const canCancel = (order: any) =>
  order.orderStatus === 'pending_payment' ||
  (order.paymentStatus === 'paid' && ['confirmed', 'processing'].includes(order.orderStatus));

interface Props {
  /** 'account' inside the signed-in area; 'guest' for the private link in a guest's order email. */
  mode?: 'account' | 'guest';
}

export const OrderDetailPage: React.FC<Props> = ({ mode = 'account' }) => {
  const { returnWindowDays, orderExpiryMinutes } = useSettingsStore((s) => s.settings);
  useDocumentMeta({ title: 'Order details — Footzi', noindex: true });
  const { id } = useParams<{ id: string }>();
  const { auth, bearer, orderToken } = useOrderAccess(id, mode);
  const navigate = useNavigate();
  const [isClaiming, setIsClaiming] = useState(false);
  const base = mode === 'guest' ? '/order' : '/account/orders';

  const [order, setOrder] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    if (!auth) {
      setError('This order link is incomplete. Use the link from your order email, or request a new one.');
      setIsLoading(false);
      return;
    }
    let active = true;
    setIsLoading(true);
    orderService
      .getOrderById(id, auth)
      .then((data) => active && setOrder(data))
      .catch((err) => active && setError(err.message || 'Order not found'))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [id, bearer, orderToken]);

  const handleCancel = async () => {
    if (!id || !auth) return;
    setCancelError(null);
    setIsCancelling(true);
    try {
      const result = await orderService.cancelOrder(id, 'Cancelled by customer from order page', auth);
      setNotice(result.message);
      setOrder(await orderService.getOrderById(id, auth));
      setConfirmingCancel(false);
    } catch (err: any) {
      setCancelError(err.message || 'This order could not be cancelled.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleClaim = async () => {
    if (!id || !bearer || !orderToken) return;
    setCancelError(null);
    setIsClaiming(true);
    try {
      await orderService.claimOrder(id, orderToken, bearer);
      navigate(`/account/orders/${id}`, { replace: true });
    } catch (err: any) {
      setCancelError(err.message || 'Could not add this order to your account.');
    } finally {
      setIsClaiming(false);
    }
  };

  if (isLoading) {
    return <div role="status" className="py-24 text-center text-xs text-charcoal-500">Loading your order…</div>;
  }

  if (error || !order) {
    return (
      <div className="py-24 text-center">
        <h1 className="font-serif text-2xl text-charcoal-900">We couldn't find that order</h1>
        <p className="text-xs text-charcoal-500 mt-2">
          {error}
          {mode === 'guest' && ' If you added this order to an account, sign in to see it there.'}
        </p>
        {mode === 'guest' ? (
          <div className="mt-4 flex flex-wrap justify-center gap-x-6">
            <Link to="/track-order" className="inline-block py-2 text-xs uppercase tracking-widest font-semibold text-sand-600 underline">
              Email me my order link
            </Link>
            <Link to="/login" className="inline-block py-2 text-xs uppercase tracking-widest font-semibold text-sand-600 underline">
              Sign in
            </Link>
          </div>
        ) : (
          <Link to="/account/orders" className="mt-4 inline-block text-xs uppercase tracking-widest font-semibold text-sand-600 underline">
            Back to my orders
          </Link>
        )}
      </div>
    );
  }

  const supplier = order.supplierOrderId && typeof order.supplierOrderId === 'object' ? order.supplierOrderId : null;
  const trackingNumber = order.trackingNumber || supplier?.trackingNumber;
  const events: any[] = [...(supplier?.shipmentEvents ?? [])].reverse();
  const refunded: number = order.refundedAmount || 0;
  const history: any[] = order.statusHistory ?? [];

  return (
    <div className="py-10 md:py-14 bg-ivory-100 min-h-[85vh]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <Link
          to={mode === 'guest' ? '/shop' : '/account/orders'}
          className="inline-flex items-center gap-1 text-[11px] text-charcoal-500 hover:text-charcoal-900 mb-5 py-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {mode === 'guest' ? 'Continue shopping' : 'My orders'}
        </Link>

        {mode === 'guest' && order.isGuest && (
          <div className="mb-5 p-4 bg-sand-50 border border-sand-300 rounded-xs text-xs text-charcoal-700 space-y-2">
            <p>
              <strong>This order isn't in an account.</strong> Keep your order email: its link is how you come back here. To
              request an exchange or return later, add the order to an account.
            </p>
            {bearer ? (
              <Button variant="primary" size="sm" isLoading={isClaiming} onClick={handleClaim}>
                Add this order to my account
              </Button>
            ) : (
              <p>
                <Link to="/login" state={{ from: { pathname: `/order/${order._id}`, hash: `#t=${orderToken ?? ''}` } }} className="font-semibold text-charcoal-900 underline">
                  Sign in
                </Link>{' '}
                or{' '}
                <Link to="/register" state={{ from: { pathname: `/order/${order._id}`, hash: `#t=${orderToken ?? ''}` } }} className="font-semibold text-charcoal-900 underline">
                  create an account
                </Link>
                , then come back to this page to add it.
              </p>
            )}
          </div>
        )}

        {notice && (
          <div className="mb-5 p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xs flex items-center gap-2" role="status">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        <div className="bg-white p-6 sm:p-8 rounded-xs border border-ivory-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-5 border-b border-ivory-200">
            <div>
              <h1 className="font-serif text-2xl font-medium text-charcoal-950">Order #{order.orderNumber}</h1>
              <p className="text-xs text-charcoal-500 mt-1">Placed {formatDateTime(order.createdAt)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={order.orderStatus === 'cancelled' ? 'default' : 'sand'}>{label(order.orderStatus)}</Badge>
              <Badge variant="default">
                {order.paymentStatus === 'refunded'
                  ? 'Refunded'
                  : order.paymentStatus === 'paid' && refunded > 0
                    ? 'Partly refunded'
                    : order.paymentStatus === 'paid'
                      ? 'Paid'
                      : order.paymentStatus === 'failed'
                        ? 'Payment failed'
                        : 'Unpaid'}
              </Badge>
            </div>
          </div>

          {/* Items */}
          <div className="py-5 border-b border-ivory-200 space-y-4">
            {order.items.map((item: any) => (
              <div key={`${item.sku}`} className="flex items-center gap-4">
                <img decoding="async" loading="lazy" src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-xs border border-ivory-300" />
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-sm font-semibold text-charcoal-900">{item.name}</p>
                  <p className="text-xs text-charcoal-500">
                    {item.size} • {item.color} • Qty {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-semibold text-charcoal-900">{formatINR(item.lineTotal)}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-5">
            {/* Totals + address */}
            <div className="space-y-6">
              <dl className="text-xs space-y-1.5">
                <div className="flex justify-between">
                  <dt className="text-charcoal-500">Subtotal</dt>
                  <dd>{formatINR(order.subtotal)}</dd>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <dt>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
                    <dd>−{formatINR(order.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-charcoal-500">Shipping</dt>
                  <dd>{order.shippingFee > 0 ? formatINR(order.shippingFee) : 'Free'}</dd>
                </div>
                <div className="flex justify-between pt-2 border-t border-ivory-200 text-sm font-semibold text-charcoal-950">
                  <dt>Total</dt>
                  <dd>{formatINR(order.total)}</dd>
                </div>
                {refunded > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <dt>Refunded to original payment method</dt>
                    <dd>{formatINR(refunded)}</dd>
                  </div>
                )}
              </dl>

              <div>
                <h2 className="text-[11px] uppercase tracking-widest font-bold text-charcoal-700 mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-sand-600" /> Delivering to
                </h2>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  {order.shippingAddress.name}
                  <br />
                  {order.shippingAddress.addressLine}
                  <br />
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}
                  <br />
                  Mobile: {order.shippingAddress.phone}
                </p>
              </div>
            </div>

            {/* Tracking + timeline */}
            <div className="space-y-6">
              <div>
                <h2 className="text-[11px] uppercase tracking-widest font-bold text-charcoal-700 mb-2 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-sand-600" /> Shipment
                </h2>
                {trackingNumber ? (
                  <p className="text-xs text-charcoal-600">
                    {order.carrier || supplier?.carrier || 'BlueDart Air Express'} •{' '}
                    <strong className="font-mono text-charcoal-900">{trackingNumber}</strong>
                  </p>
                ) : (
                  <p className="text-xs text-charcoal-500">A tracking number appears here once your order is confirmed.</p>
                )}
                {events.length > 0 && (
                  <ol className="mt-3 space-y-2 border-l border-ivory-300 pl-4">
                    {events.map((event, index) => (
                      <li key={`${event.timestamp}-${index}`} className="text-xs relative">
                        <Circle className="w-2.5 h-2.5 text-sand-600 fill-sand-400 absolute -left-[1.4rem] top-1" />
                        <p className="font-semibold text-charcoal-800 capitalize">{String(event.status).toLowerCase()}</p>
                        <p className="text-charcoal-500">{event.location}</p>
                        <p className="text-[10px] text-charcoal-400">{formatDateTime(event.timestamp)}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              <div>
                <h2 className="text-[11px] uppercase tracking-widest font-bold text-charcoal-700 mb-2">Order history</h2>
                <ol className="space-y-2.5">
                  {[...history].reverse().map((entry, index) => (
                    <li key={`${entry.timestamp}-${index}`} className="text-xs flex gap-2">
                      {entry.status === 'cancelled' ? (
                        <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <p className="font-semibold text-charcoal-800">{label(entry.status)}</p>
                        {entry.note && <p className="text-charcoal-500">{entry.note}</p>}
                        <p className="text-[10px] text-charcoal-400">{formatDateTime(entry.timestamp)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 pt-5 border-t border-ivory-200">
            {(order.paymentStatus === 'paid' || order.paymentStatus === 'refunded') && (
              <p className="text-xs text-charcoal-600 mb-3">
                <Link to={`${base}/${order._id}/receipt`} className="font-semibold text-charcoal-900 underline">
                  View or print your receipt
                </Link>
              </p>
            )}
            {order.orderStatus === 'pending_payment' && (
              <p className="text-xs text-charcoal-500 mb-3">
                This order is waiting for payment and is released automatically if it isn't paid within {orderExpiryMinutes} minutes.
              </p>
            )}
            {order.orderStatus === 'delivered' && (
              <p className="text-xs text-charcoal-600">
                Not the right fit?{' '}
                {mode === 'guest' ? (
                  <>Add this order to an account (above) to request an exchange or return within {returnWindowDays} days of delivery.</>
                ) : (
                  <>
                    <Link to="/account/orders" className="font-semibold text-charcoal-900 underline">
                      Request an exchange or return
                    </Link>{' '}
                    from your orders list within {returnWindowDays} days of delivery.
                  </>
                )}
              </p>
            )}

            {cancelError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xs" role="alert">
                {cancelError}
              </div>
            )}

            {canCancel(order) &&
              (confirmingCancel ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <p className="text-xs text-charcoal-700">
                    {order.paymentStatus === 'paid'
                      ? `Cancel this order? ${formatINR(order.total)} will be refunded to your original payment method.`
                      : 'Cancel this order and release your pairs?'}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="primary" size="sm" isLoading={isCancelling} onClick={handleCancel}>
                      Yes, cancel order
                    </Button>
                    <Button variant="outline" size="sm" disabled={isCancelling} onClick={() => setConfirmingCancel(false)}>
                      Keep order
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setConfirmingCancel(true)}>
                  Cancel order
                </Button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
