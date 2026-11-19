import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, ShieldCheck } from 'lucide-react';
import { useOrderAccess } from '@/hooks/useOrderAccess';
import { orderService } from '@/services/orderService';
import { formatINR, numberToIndianWords, getIndianStateCode } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

const formatDate = (value: string | Date) =>
  new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const ATELIER_SUPPLIER = {
  companyName: 'FOOTZI LUXURY ATELIER PVT. LTD.',
  tradeName: 'Footzi Atelier',
  addressLine1: 'Plot 14, Taj Crafts Enclave, Fatehabad Road',
  city: 'Agra',
  state: 'Uttar Pradesh',
  pincode: '282001',
  country: 'India',
  gstin: '09AAACF4198L1Z2',
  stateCode: '09',
  pan: 'AAACF4198L',
  cin: 'U19201UP2026PTC184920',
  email: 'patron@footzi.in',
  phone: '+91 562 284 1122',
};

const HSN_CODE = '6403'; // Footwear with outer soles of rubber/plastics/leather and uppers of leather
const GST_RATE = 18; // 18% standard GST rate for luxury leather footwear (> ₹1,000)

export const OrderReceiptPage: React.FC<{ mode?: 'account' | 'guest' }> = ({ mode = 'account' }) => {
  useDocumentMeta({ title: 'GST Tax Invoice & Receipt — Footzi', noindex: true });
  const { id } = useParams<{ id: string }>();
  const { auth, bearer, orderToken } = useOrderAccess(id, mode);
  const base = mode === 'guest' ? '/order' : '/account/orders';
  const [order, setOrder] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'invoice' | 'receipt'>('receipt');

  useEffect(() => {
    if (!id) return;
    if (!auth) {
      setError('This order link is incomplete. Use the link from your order email.');
      return;
    }
    let active = true;
    orderService
      .getOrderById(id, auth)
      .then((data) => active && setOrder(data))
      .catch((err) => active && setError(err.message || 'Order not found'));
    return () => {
      active = false;
    };
  }, [id, bearer, orderToken]);

  if (error) {
    return (
      <div className="py-24 text-center">
        <h1 className="font-serif text-2xl text-charcoal-900">We couldn't find that order</h1>
        <p className="text-xs text-charcoal-500 mt-2">{error}</p>
        <Link
          to={mode === 'guest' ? '/track-order' : '/account/orders'}
          className="mt-4 inline-block text-xs uppercase tracking-widest font-semibold text-sand-600 underline"
        >
          {mode === 'guest' ? 'Email me my order link' : 'Back to my orders'}
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div role="status" className="py-24 text-center text-xs text-charcoal-500">
        Loading your tax invoice…
      </div>
    );
  }

  const paid = order.paymentStatus === 'paid' || order.paymentStatus === 'refunded';
  const paidAt = order.paymentDetails?.paidAt || order.createdAt;
  const invoiceNumber = `INV/2026-27/FTZ-${order.orderNumber.replace(/[^0-9]/g, '').slice(-6) || '100001'}`;

  // Indian GST Calculations
  const buyerState = order.shippingAddress.state || 'Uttar Pradesh';
  const buyerStateCode = getIndianStateCode(buyerState);
  const isIntraState = buyerStateCode === '09' || buyerState.toLowerCase().includes('uttar pradesh');

  // Items Tax Calculation (Prices in India are GST-inclusive)
  const itemsTaxData = (order.items || []).map((item: any) => {
    const grossTotal = item.lineTotal;
    const taxableValue = Math.round((grossTotal / (1 + GST_RATE / 100)) * 100) / 100;
    const totalGst = Math.round((grossTotal - taxableValue) * 100) / 100;
    const cgst = isIntraState ? Math.round((totalGst / 2) * 100) / 100 : 0;
    const sgst = isIntraState ? Math.round((totalGst / 2) * 100) / 100 : 0;
    const igst = isIntraState ? 0 : totalGst;

    return {
      ...item,
      hsn: HSN_CODE,
      taxableValue,
      totalGst,
      cgst,
      sgst,
      igst,
      grossTotal,
    };
  });

  const totalTaxable = itemsTaxData.reduce((sum: number, i: any) => sum + i.taxableValue, 0);
  const totalCgst = itemsTaxData.reduce((sum: number, i: any) => sum + i.cgst, 0);
  const totalSgst = itemsTaxData.reduce((sum: number, i: any) => sum + i.sgst, 0);
  const totalIgst = itemsTaxData.reduce((sum: number, i: any) => sum + i.igst, 0);

  return (
    <div className="py-8 sm:py-12 bg-ivory-100 min-h-[85vh] print:bg-white print:py-0">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Top Navigation & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 print:hidden">
          <Link
            to={`${base}/${order._id}`}
            className="inline-flex items-center gap-1.5 text-xs text-charcoal-600 hover:text-charcoal-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to order
          </Link>

          <div className="flex items-center gap-2">
            {/* View Selector */}
            <div className="bg-ivory-200/80 p-0.5 rounded-xs flex text-xs">
              <button
                type="button"
                onClick={() => setActiveView('invoice')}
                className={`px-3 py-1.5 rounded-xs font-medium transition-all ${
                  activeView === 'invoice'
                    ? 'bg-white text-charcoal-950 shadow-xs'
                    : 'text-charcoal-600 hover:text-charcoal-900'
                }`}
              >
                Tax Invoice (GST)
              </button>
              <button
                type="button"
                onClick={() => setActiveView('receipt')}
                className={`px-3 py-1.5 rounded-xs font-medium transition-all ${
                  activeView === 'receipt'
                    ? 'bg-white text-charcoal-950 shadow-xs'
                    : 'text-charcoal-600 hover:text-charcoal-900'
                }`}
              >
                Atelier Receipt
              </button>
            </div>

            {paid && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.print()}
                className="gap-1.5 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" /> Print or save as PDF
              </Button>
            )}
          </div>
        </div>

        {!paid ? (
          <div className="bg-white p-8 border border-ivory-200 rounded-xs text-center shadow-sm">
            <h1 className="font-serif text-2xl text-charcoal-900">No receipt yet</h1>
            <p className="text-xs text-charcoal-500 mt-2">
              A receipt and tax invoice are available once an order has been successfully paid.
            </p>
          </div>
        ) : activeView === 'invoice' ? (
          /* =========================================================================
             FORMAL INDIAN GST TAX INVOICE (Rule 46 of CGST Rules, 2017)
             ========================================================================= */
          <article className="bg-white p-6 sm:p-10 border border-charcoal-200 rounded-xs shadow-elevated print:shadow-none print:border print:p-8 text-charcoal-900 text-xs">
            {/* Header: Legal Banner & Title */}
            <div className="border-b-2 border-charcoal-900 pb-4 mb-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <span className="font-serif text-2xl sm:text-3xl font-bold tracking-widest text-charcoal-950 uppercase">
                    FOOTZI
                  </span>
                  <span className="block text-[10px] tracking-widest uppercase text-sand-600 font-semibold mt-0.5">
                    AGRA ATELIER PRIVÉ
                  </span>
                </div>
                <div className="text-left sm:text-right">
                  <span className="inline-block bg-charcoal-900 text-white font-mono text-[11px] font-bold px-3 py-1 uppercase tracking-widest rounded-xs">
                    TAX INVOICE
                  </span>
                  <p className="text-[10px] text-charcoal-500 mt-1">
                    (Issued under Section 31 of CGST Act, 2017 r/w Rule 46)
                  </p>
                </div>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-ivory-300 rounded-xs p-4 bg-ivory-50/50 mb-6">
              <div className="space-y-1">
                <p className="text-[11px] text-charcoal-600">
                  <strong className="text-charcoal-900">Invoice Number:</strong>{' '}
                  <span className="font-mono font-bold text-charcoal-950">{invoiceNumber}</span>
                </p>
                <p className="text-[11px] text-charcoal-600">
                  <strong className="text-charcoal-900">Order Reference:</strong> #{order.orderNumber}
                </p>
                <p className="text-[11px] text-charcoal-600">
                  <strong className="text-charcoal-900">Invoice Date:</strong> {formatDate(paidAt)}
                </p>
                <p className="text-[11px] text-charcoal-600">
                  <strong className="text-charcoal-900">Reverse Charge:</strong> No (Standard Forward Charge)
                </p>
              </div>
              <div className="space-y-1 sm:text-right">
                <p className="text-[11px] text-charcoal-600">
                  <strong className="text-charcoal-900">Place of Supply (POS):</strong>{' '}
                  {buyerState} (State Code: {buyerStateCode})
                </p>
                <p className="text-[11px] text-charcoal-600">
                  <strong className="text-charcoal-900">Tax Payable On Reverse Charge:</strong> N/A
                </p>
                <p className="text-[11px] text-charcoal-600">
                  <strong className="text-charcoal-900">Logistics Carrier:</strong> Delhivery Express
                </p>
                <p className="text-[11px] text-charcoal-600">
                  <strong className="text-charcoal-900">AWB Tracking:</strong>{' '}
                  <span className="font-mono">{order.trackingNumber || 'DLV-EXP-AGR-IN'}</span>
                </p>
              </div>
            </div>

            {/* Parties: Seller vs Buyer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-ivory-300 mb-6">
              {/* Seller / Supplier */}
              <div className="p-3.5 bg-white border border-ivory-300 rounded-xs space-y-1">
                <p className="text-[10px] uppercase font-bold tracking-wider text-sand-600 border-b border-ivory-200 pb-1 mb-2">
                  SUPPLIER / CONSIGNOR (AGRA ATELIER)
                </p>
                <p className="font-bold text-charcoal-950">{ATELIER_SUPPLIER.companyName}</p>
                <p className="text-charcoal-600 leading-relaxed text-[11px]">
                  {ATELIER_SUPPLIER.addressLine1}
                  <br />
                  {ATELIER_SUPPLIER.city}, {ATELIER_SUPPLIER.state} - {ATELIER_SUPPLIER.pincode}
                </p>
                <div className="pt-1.5 font-mono text-[11px] space-y-0.5 text-charcoal-700">
                  <p>
                    <strong>GSTIN:</strong> {ATELIER_SUPPLIER.gstin}
                  </p>
                  <p>
                    <strong>PAN:</strong> {ATELIER_SUPPLIER.pan} | <strong>State:</strong> UP ({ATELIER_SUPPLIER.stateCode})
                  </p>
                  <p className="text-[10px] text-charcoal-500">
                    <strong>CIN:</strong> {ATELIER_SUPPLIER.cin}
                  </p>
                </div>
              </div>

              {/* Buyer / Consignee */}
              <div className="p-3.5 bg-white border border-ivory-300 rounded-xs space-y-1">
                <p className="text-[10px] uppercase font-bold tracking-wider text-sand-600 border-b border-ivory-200 pb-1 mb-2">
                  RECIPIENT / BILLED & SHIPPED TO
                </p>
                <p className="font-bold text-charcoal-950">{order.shippingAddress.name}</p>
                <p className="text-charcoal-600 leading-relaxed text-[11px]">
                  {order.shippingAddress.addressLine}
                  <br />
                  {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                </p>
                <div className="pt-1.5 text-[11px] space-y-0.5 text-charcoal-700">
                  <p>
                    <strong>Contact Phone:</strong> {order.shippingAddress.phone || order.customerPhone}
                  </p>
                  <p>
                    <strong>Email:</strong> {order.customerEmail}
                  </p>
                  <p>
                    <strong>State & Code:</strong> {buyerState} ({buyerStateCode})
                  </p>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-[11px] border-collapse border border-charcoal-200">
                <thead>
                  <tr className="bg-ivory-100 text-charcoal-800 font-bold uppercase tracking-wider text-[10px]">
                    <th className="border border-charcoal-200 py-2.5 px-2 text-center w-8">#</th>
                    <th className="border border-charcoal-200 py-2.5 px-3 text-left">Description of Goods</th>
                    <th className="border border-charcoal-200 py-2.5 px-2 text-center w-16">HSN</th>
                    <th className="border border-charcoal-200 py-2.5 px-2 text-center w-10">Qty</th>
                    <th className="border border-charcoal-200 py-2.5 px-3 text-right">Taxable Val</th>
                    {isIntraState ? (
                      <>
                        <th className="border border-charcoal-200 py-2.5 px-2 text-right">CGST (9%)</th>
                        <th className="border border-charcoal-200 py-2.5 px-2 text-right">SGST (9%)</th>
                      </>
                    ) : (
                      <th className="border border-charcoal-200 py-2.5 px-2 text-right">IGST (18%)</th>
                    )}
                    <th className="border border-charcoal-200 py-2.5 px-3 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ivory-200">
                  {itemsTaxData.map((item: any, idx: number) => (
                    <tr key={item.sku} className="hover:bg-ivory-50/50">
                      <td className="border border-charcoal-200 py-3 px-2 text-center font-mono text-charcoal-500">
                        {idx + 1}
                      </td>
                      <td className="border border-charcoal-200 py-3 px-3">
                        <strong className="text-charcoal-950 font-medium block">{item.name}</strong>
                        <span className="text-[10px] text-charcoal-500 font-mono">
                          Size: {item.size} • Color: {item.color} • SKU: {item.sku}
                        </span>
                      </td>
                      <td className="border border-charcoal-200 py-3 px-2 text-center font-mono">{item.hsn}</td>
                      <td className="border border-charcoal-200 py-3 px-2 text-center font-bold">{item.quantity}</td>
                      <td className="border border-charcoal-200 py-3 px-3 text-right font-mono">
                        {formatINR(item.taxableValue)}
                      </td>
                      {isIntraState ? (
                        <>
                          <td className="border border-charcoal-200 py-3 px-2 text-right font-mono text-charcoal-600">
                            {formatINR(item.cgst)}
                          </td>
                          <td className="border border-charcoal-200 py-3 px-2 text-right font-mono text-charcoal-600">
                            {formatINR(item.sgst)}
                          </td>
                        </>
                      ) : (
                        <td className="border border-charcoal-200 py-3 px-2 text-right font-mono text-charcoal-600">
                          {formatINR(item.igst)}
                        </td>
                      )}
                      <td className="border border-charcoal-200 py-3 px-3 text-right font-bold font-mono">
                        {formatINR(item.grossTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations & Total Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 pb-6 border-b border-ivory-300">
              {/* Left Column: Tax Summary Breakdown */}
              <div className="space-y-3">
                <p className="text-[10px] uppercase font-bold tracking-wider text-charcoal-700">
                  GST TAX STRUCTURE ANALYSIS (HSN 6403)
                </p>
                <div className="p-3 bg-ivory-50 border border-ivory-300 rounded-xs space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-charcoal-600">Total Taxable Value:</span>
                    <span>{formatINR(totalTaxable)}</span>
                  </div>
                  {isIntraState ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-charcoal-600">Central Tax (CGST @ 9%):</span>
                        <span>{formatINR(totalCgst)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-charcoal-600">State Tax (SGST @ 9%):</span>
                        <span>{formatINR(totalSgst)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-charcoal-600">Integrated Tax (IGST @ 18%):</span>
                      <span>{formatINR(totalIgst)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-ivory-300 font-bold">
                    <span>Total GST Amount:</span>
                    <span>{formatINR(totalCgst + totalSgst + totalIgst)}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-[10px] uppercase font-bold text-charcoal-700 mb-0.5">Amount in Words:</p>
                  <p className="text-xs font-serif italic text-charcoal-800 bg-ivory-100/60 p-2.5 rounded-xs border border-ivory-200">
                    {numberToIndianWords(order.total)}
                  </p>
                </div>
              </div>

              {/* Right Column: Invoice Grand Total */}
              <div className="sm:ml-auto w-full sm:w-80 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-ivory-200">
                  <span className="text-charcoal-600">Subtotal (Inclusive of GST):</span>
                  <span className="font-mono font-medium">{formatINR(order.subtotal)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between py-1 border-b border-ivory-200 text-emerald-700">
                    <span>Atelier Privilege Discount{order.couponCode ? ` (${order.couponCode})` : ''}:</span>
                    <span className="font-mono">−{formatINR(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-ivory-200">
                  <span className="text-charcoal-600">Shipping & Handling:</span>
                  <span className="font-mono">
                    {order.shippingFee > 0 ? formatINR(order.shippingFee) : 'Complimentary'}
                  </span>
                </div>
                <div className="flex justify-between py-2 text-base font-bold text-charcoal-950 border-b-2 border-charcoal-900 bg-ivory-100/70 px-2 rounded-xs">
                  <span>Grand Total:</span>
                  <span className="font-mono text-lg">{formatINR(order.total)}</span>
                </div>
                <div className="pt-1 text-[11px] text-charcoal-600 space-y-0.5">
                  <p>
                    <strong>Payment Mode:</strong> Online (Razorpay)
                  </p>
                  {order.paymentDetails?.gatewayPaymentId && (
                    <p className="font-mono text-[10px]">
                      <strong>Txn ID:</strong> {order.paymentDetails.gatewayPaymentId}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Signatures & Certification */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 items-end">
              <div className="space-y-1 text-[10px] text-charcoal-500 leading-relaxed">
                <p className="font-bold text-charcoal-800 uppercase tracking-wider text-[11px]">Declaration:</p>
                <p>1. Certified that the particulars given above are true and correct.</p>
                <p>2. Goods once sold can be exchanged for size within 7 days of delivery.</p>
                <p>3. Disputes subject to Agra, Uttar Pradesh jurisdiction only.</p>
                <p className="pt-2 text-emerald-700 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Handcrafted in Agra • Authentic Full-Grain Leather
                </p>
              </div>

              <div className="text-left sm:text-right space-y-2">
                <div className="inline-block text-center border border-charcoal-300 rounded-xs p-3 bg-ivory-50/70 min-w-48">
                  <span className="block font-serif text-[11px] font-bold text-charcoal-900 tracking-wider">
                    FOOTZI LUXURY ATELIER PVT. LTD.
                  </span>
                  <div className="my-2 border-t border-dashed border-charcoal-300 w-32 mx-auto" />
                  <span className="block text-[9px] text-charcoal-500 uppercase tracking-widest">
                    Authorized Signatory
                  </span>
                  <span className="block text-[8px] text-emerald-700 font-mono mt-0.5">
                    [Digitally Authenticated]
                  </span>
                </div>
              </div>
            </div>
          </article>
        ) : (
          /* =========================================================================
             SIMPLIFIED ATELIER RECEIPT VIEW
             ========================================================================= */
          <article className="bg-white p-8 sm:p-10 border border-ivory-200 rounded-xs shadow-sm print:shadow-none print:border-0 print:p-0">
            <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-ivory-300">
              <div>
                <p className="font-serif text-2xl font-semibold tracking-wide text-charcoal-950">FOOTZI</p>
                <p className="text-xs text-charcoal-500 mt-1">Footzi Atelier, Agra, Uttar Pradesh, India</p>
              </div>
              <div className="sm:text-right">
                <h1 className="text-sm uppercase tracking-widest font-bold text-charcoal-900">Order Receipt</h1>
                <p className="font-mono text-xs text-charcoal-700 mt-1">#{order.orderNumber}</p>
                <p className="text-xs text-charcoal-500">{formatDate(paidAt)}</p>
              </div>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 text-xs border-b border-ivory-300">
              <div>
                <h2 className="uppercase tracking-widest text-[10px] font-bold text-charcoal-700 mb-1.5">
                  Billed and shipped to
                </h2>
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
                      <span className="font-mono text-[11px] text-charcoal-500">
                        {order.paymentDetails.gatewayPaymentId}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </section>

            <table className="w-full text-xs mt-6">
              <caption className="sr-only">Items in order {order.orderNumber}</caption>
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-charcoal-500 border-b border-ivory-300">
                  <th scope="col" className="py-2 pr-2 font-semibold">
                    Item
                  </th>
                  <th scope="col" className="py-2 px-2 font-semibold text-right">
                    Qty
                  </th>
                  <th scope="col" className="py-2 px-2 font-semibold text-right">
                    Price
                  </th>
                  <th scope="col" className="py-2 pl-2 font-semibold text-right">
                    Amount
                  </th>
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
              This is a receipt of your purchase. It is not a GST tax invoice. Switch to
              the &ldquo;Tax Invoice (GST)&rdquo; tab above for the statutory tax invoice.
            </p>
          </article>
        )}
      </div>
    </div>
  );
};

export default OrderReceiptPage;
