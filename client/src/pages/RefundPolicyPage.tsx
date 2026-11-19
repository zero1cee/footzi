import React from 'react';
import { RefreshCw, RotateCcw, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useSettingsStore } from '@/store/useSettingsStore';

export const RefundPolicyPage: React.FC = () => {
  const returnWindowDays = useSettingsStore((s) => s.settings.returnWindowDays) || 7;

  useDocumentMeta({
    title: 'Return, Exchange & Refund Policy — Footzi',
    description: `Footzi offers a complimentary ${returnWindowDays}-day doorstep size exchange and refund policy with reverse pickup via Delhivery.`,
  });

  return (
    <div className="py-12 md:py-20 bg-ivory-100 min-h-[85vh]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <div className="text-center space-y-3 border-b border-ivory-300 pb-8">
          <span className="text-[11px] uppercase tracking-ultra text-sand-600 font-semibold block">
            Hassle-Free Doorstep Service
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-medium text-charcoal-950">
            Return, Exchange & Refund Policy
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-600 max-w-xl mx-auto font-light leading-relaxed">
            Confidence in every step. Enjoy our {returnWindowDays}-day door-to-door size exchange with reverse pickup powered by Delhivery.
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white p-6 sm:p-10 rounded-xs border border-ivory-200 shadow-sm space-y-8 text-xs sm:text-sm text-charcoal-700 leading-relaxed">
          <section className="space-y-3">
            <h2 className="font-serif text-lg sm:text-xl font-semibold text-charcoal-950 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-sand-600" />
              1. Complimentary {returnWindowDays}-Day Size Exchange
            </h2>
            <p>
              Footwear fit is intensely personal. If your chosen silhouette feels tight or loose across the instep, we offer a <strong>100% complimentary doorstep size exchange</strong> within <strong>{returnWindowDays} calendar days</strong> of receiving your delivery.
            </p>
            <p>
              Our reverse courier partner, <strong>Delhivery</strong>, will arrive at your address with a fresh replacement box and collect the existing pair in a seamless single-visit swap.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg sm:text-xl font-semibold text-charcoal-950 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-sand-600" />
              2. Eligibility Criteria for Returns & Exchanges
            </h2>
            <p>
              Because fine leather moulds permanently to the foot during wear, returned items must satisfy the following condition standards upon quality audit:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-charcoal-600">
              <li><strong>Pristine Outsoles:</strong> Shoes must be tried on indoors on clean carpeted surfaces. Outsoles showing pavement abrasion, gravel indentations, or outdoor dirt cannot be accepted.</li>
              <li><strong>Uncreased Vamps:</strong> Full-grain leather uppers must not display deep walking creases.</li>
              <li><strong>Complete Original Packaging:</strong> Pair must be returned in the original Footzi magnetic rigid box with original cloth dust bags, cedar paper wrap, and brand care cards intact.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg sm:text-xl font-semibold text-charcoal-950 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-sand-600" />
              3. Refund Processing & Timelines
            </h2>
            <p>
              Once your returned footwear arrives at our Agra Atelier and completes physical quality inspection (typically within 48 hours of intake), your refund is immediately initiated:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="bg-ivory-50 p-4 border border-ivory-200 rounded-xs space-y-1">
                <p className="font-semibold text-charcoal-900 text-xs">Prepaid Orders (Razorpay)</p>
                <p className="text-xs text-charcoal-600">
                  Credited directly back to your original payment source (UPI, Credit/Debit card, NetBanking). Reflects in your bank account within <strong>3 to 5 business days</strong>.
                </p>
              </div>

              <div className="bg-ivory-50 p-4 border border-ivory-200 rounded-xs space-y-1">
                <p className="font-semibold text-charcoal-900 text-xs">Cash on Delivery Orders</p>
                <p className="text-xs text-charcoal-600">
                  Refunded via direct instant bank transfer (IMPS / NEFT) or UPI transfer to the customer&rsquo;s verified bank details, or issued as instant lifetime Footzi Store Credit.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg sm:text-xl font-semibold text-charcoal-950 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-sand-600" />
              4. How to Request an Exchange or Return
            </h2>
            <p>
              You can initiate a return or exchange in under 60 seconds with no customer service friction:
            </p>
            <ol className="list-decimal pl-5 space-y-1.5 text-charcoal-600">
              <li>Log in to your account and navigate to <strong>My Orders &rarr; Request Return / Exchange</strong>.</li>
              <li>If you placed the order as a guest, simply visit <a href="/track-order" className="text-sand-600 font-semibold underline">Track Order</a> and enter your order number and phone number.</li>
              <li>Select your replacement size or refund preference. A Delhivery reverse pickup AWB (e.g. <code>DLV-REV-XXXXXX</code>) will be scheduled automatically.</li>
            </ol>
          </section>

          <section className="space-y-3 border-t border-ivory-200 pt-6">
            <h2 className="font-serif text-lg sm:text-xl font-semibold text-charcoal-950 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-sand-600" />
              5. Order Cancellations
            </h2>
            <p>
              You may cancel an order free of charge at any point prior to Delhivery courier dispatch directly from your account page. Once dispatched, the order cannot be cancelled in transit, but can be exchanged or returned upon doorstep delivery.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default RefundPolicyPage;
