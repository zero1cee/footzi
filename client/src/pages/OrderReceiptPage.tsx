import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { orderService } from '@/services/orderService';
import { formatINR } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

const formatDate = (value: string) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/** A clean, printable record of a paid order. Print it, or choose "Save as PDF" in the print window. */
export const OrderReceiptPage: React.FC = () => {
  useDocumentMeta({ title: 'Order receipt — Footzi', noindex: true });
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.token);
  const [order, setOrder] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !token) return;
    let active = true;
    orderService
      .getOrderById(id, token)
      .then((data) => active && setOrder(data))
      .catch((err) => active && setError(err.message || 'Order not found'));
    return () => {
      active = false;
    };
  }, [id, token]);

  if (error) {
    return (
      <div className="py-24 text-center">
        <h1 className="font-serif text-2xl text-charcoal-900">We couldn't find that order</h1>
        <p className="text-xs text-charcoal-500 mt-2">{error}</p>
        <Link to="/account/orders" className="mt-4 inline-block text-xs uppercase tracking-widest font-semibold text-sand-600 underline">
          Back to my orders
        </Link>
      </div>
    );
  }
  if (!order) return <div role="status" className="py-24 text-center text-xs text-charcoal-500">Loading your receipt…</div>;

  const paid = order.paymentStatus === 'paid' || order.paymentStatus === 'refunded';
  const paidAt = order.paymentDetails?.paidAt || order.createdAt;

  return (
    <div className="py-10 bg-ivory-100 min-h-[80vh] print:bg-white print:py-0">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-5 print:hidden">
          <Link to={`/account/orders/${order._id}`} className="inline-flex items-center gap-1 text-[11px] text-charcoal-500 hover:text-charcoal-900 py-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to order
          </Link>
          {paid && (
            <Button variant="primary" size="sm" onClick={() => window.print()} className="gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Print or save as PDF
            </Button>
          )}
        </div>

        {!paid ? (
          <div className="bg-white p-8 border border-ivory-200 rounded-xs text-center">
            <h1 className="font-serif text-2xl text-charcoal-900">No receipt yet</h1>
            <p className="text-xs text-charcoal-500 mt-2">A receipt is available once an order has been paid.</p>
          </div>
        ) : (
          <article className="bg-white p-8 sm:p-10 border border-ivory-200 rounded-xs shadow-sm print:shadow-none print:border-0 print:p-0">
            <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-ivory-300">
              <div>
                <p className="font-serif text-2xl font-semibold tracking-wide text-charcoal-950">FOOTZI</p>
                <p className="text-xs text-charcoal-500 mt-1">Footzi Atelier, Agra, Uttar Pradesh, India</p>
              </div>
              <div className="sm:text-right">
                <h1 className="text-sm uppercase tracking-widest font-bold text-charcoal-900">Order receipt</h1>
                <p className="font-mono text-xs text-charcoal-700 mt-1">#{order.orderNumber}</p>
                <p className="text-xs text-charcoal-500">{formatDate(paidAt)}</p>
              </div>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 text-xs border-b border-ivory-300">
              <div>
                <h2 className="uppercase tracking-widest text-[10px] font-bold text-charcoal-700 mb-1.5">Billed and shipped to</h2>
                <p className="text-charcoal-700 leading-relaxed">
                  {order.shippingAddress.name}
                  <br />
                  {order.shippingAddress.addressLine}
                  <br />
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}
                  <br />
                  {order.customerEmail}
                </p>
              </div>
              <div>
                <h2 className="uppercase tracking-widest text-[10px] font-bold text-charcoal-700 mb-1.5">Payment</h2>
                <p className="text-charcoal-700 leading-relaxed">
                  Paid online (Razorpay)
                  {order.paymentDetails?.gatewayPaymentId && (
                    <>
                      <br />
                      <span className="font-mono text-[11px] text-charcoal-500">{order.paymentDetails.gatewayPaymentId}</span>
                    </>
                  )}
                </p>
              </div>
            </section>

            <table className="w-full text-xs mt-6">
              <caption className="sr-only">Items in order {order.orderNumber}</caption>
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-charcoal-500 border-b border-ivory-300">
                  <th scope="col" className="py-2 pr-2 font-semibold">Item</th>
                  <th scope="col" className="py-2 px-2 font-semibold text-right">Qty</th>
                  <th scope="col" className="py-2 px-2 font-semibold text-right">Price</th>
                  <th scope="col" className="py-2 pl-2 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-200">
                {order.items.map((item: any) => (
                  <tr key={item.sku}>
                    <td className="py-3 pr-2">
                      <p className="font-semibold text-charcoal-900">{item.name}</p>
                      <p className="text-[11px] text-charcoal-500">
                        {item.size} • {item.color} • {item.sku}
                      </p>
                    </td>
                    <td className="py-3 px-2 text-right">{item.quantity}</td>
                    <td className="py-3 px-2 text-right">{formatINR(item.unitPrice)}</td>
                    <td className="py-3 pl-2 text-right font-semibold">{formatINR(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <dl className="mt-6 ml-auto w-full sm:w-64 text-xs space-y-1.5">
              <div className="flex justify-between">
                <dt className="text-charcoal-500">Subtotal</dt>
                <dd>{formatINR(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-charcoal-500">Discount{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
                  <dd>−{formatINR(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-charcoal-500">Shipping</dt>
                <dd>{order.shippingFee > 0 ? formatINR(order.shippingFee) : 'Free'}</dd>
              </div>
              <div className="flex justify-between pt-2 border-t border-ivory-300 text-sm font-bold text-charcoal-950">
                <dt>Total paid</dt>
                <dd>{formatINR(order.total)}</dd>
              </div>
              {(order.refundedAmount || 0) > 0 && (
                <div className="flex justify-between text-charcoal-700">
                  <dt>Refunded</dt>
                  <dd>−{formatINR(order.refundedAmount)}</dd>
                </div>
              )}
            </dl>

            <p className="mt-8 pt-4 border-t border-ivory-200 text-[10px] text-charcoal-400 leading-relaxed">
              This is a receipt of your purchase. It is not a GST tax invoice. Prices are in Indian rupees. Questions about this order? Reply to your
              order confirmation email and quote the order number above.
            </p>
          </article>
        )}
      </div>
    </div>
  );
};

export default OrderReceiptPage;
