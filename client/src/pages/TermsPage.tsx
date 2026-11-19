import React from 'react';
import { Scale, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

export const TermsPage: React.FC = () => {
  useDocumentMeta({
    title: 'Terms of Service — Footzi',
    description: 'Read the official terms and conditions governing the purchase, crafting, and delivery of handcrafted luxury footwear from Footzi.',
  });

  return (
    <div className="py-12 md:py-20 bg-ivory-100 min-h-[85vh]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <div className="text-center space-y-3 border-b border-ivory-300 pb-8">
          <span className="text-[11px] uppercase tracking-ultra text-sand-600 font-semibold block">
            Customer Agreement
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-medium text-charcoal-950">
            Terms of Service
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-600 max-w-xl mx-auto font-light leading-relaxed">
            Governing your access to footzi.in and transactions with FOOTZI LUXURY FOOTWEAR PRIVATE LIMITED.
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white p-6 sm:p-10 rounded-xs border border-ivory-200 shadow-sm space-y-8 text-xs sm:text-sm text-charcoal-700 leading-relaxed">
          <section className="space-y-3">
            <h2 className="font-serif text-lg sm:text-xl font-semibold text-charcoal-950 flex items-center gap-2">
              <Scale className="w-5 h-5 text-sand-600" />
              1. Commercial Relationship & Scope
            </h2>
            <p>
              By accessing, browsing, or placing an order on <strong>footzi.in</strong>, you enter into a legally binding contract with <strong>FOOTZI LUXURY FOOTWEAR PRIVATE LIMITED</strong>, an enterprise incorporated under the Companies Act with its artisanal operations located in Agra, Uttar Pradesh, India.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg sm:text-xl font-semibold text-charcoal-950 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sand-600" />
              2. Artisanal Leather Craftsmanship & Natural Variations
            </h2>
            <p>
              Footzi silhouettes are handcrafted in Agra utilizing 100% genuine full-grain leather, vegetable-tanned crusts, and butter-soft Italian nappa hides.
            </p>
            <div className="bg-amber-50/70 p-4 border border-amber-200/60 rounded-xs text-amber-900 text-xs space-y-1.5">
              <p className="font-medium flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                Natural Leather Characteristic Notice:
              </p>
              <p>
                Full-grain leather retains the natural grain, subtle pore texture, fat wrinkles, and hand-burnished patina of authentic hides. These organic variations are the indelible hallmark of genuine heritage leatherwork and are not classified as manufacturing defects.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg sm:text-xl font-semibold text-charcoal-950 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-sand-600" />
              3. Pricing, GST & Payment Terms
            </h2>
            <p>
              All listed product prices on footzi.in are denominated in <strong>Indian Rupees (INR / ₹)</strong> and are inclusive of statutory <strong>18% Goods and Services Tax (GST)</strong> under footwear Harmonized System of Nomenclature code <strong>HSN 6403</strong> (Leather Footwear).
            </p>
            <p>
              Payments can be completed via <strong>Razorpay</strong> (UPI, Credit/Debit Cards, NetBanking, RuPay) or through <strong>Cash on Delivery (COD)</strong> when eligible. We reserve the right to decline or cancel orders if fraud or unauthorized card use is suspected.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg sm:text-xl font-semibold text-charcoal-950">
              4. Order Acceptance & Atelier Dispatch
            </h2>
            <p>
              Your receipt of an electronic order confirmation does not signify our final acceptance of your order. In the rare event of sudden stock depletion, inaccurate pricing listings, or logistics restrictions to unserviceable pincodes, Footzi reserves the right to cancel the order with a 100% full immediate refund to the source account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg sm:text-xl font-semibold text-charcoal-950">
              5. Intellectual Property
            </h2>
            <p>
              All visual trademarks, brand signatures, architectural footwear designs, high-resolution photography, text descriptions, and styling layouts displayed on footzi.in are the sole proprietary intellectual property of FOOTZI LUXURY FOOTWEAR PRIVATE LIMITED. Unauthorized reproduction or commercial exploitation is strictly prohibited under Indian copyright and trademark law.
            </p>
          </section>

          <section className="space-y-3 border-t border-ivory-200 pt-6">
            <h2 className="font-serif text-lg sm:text-xl font-semibold text-charcoal-950">
              6. Governing Law & Jurisdiction
            </h2>
            <p>
              These Terms shall be interpreted and governed in accordance with the laws of the Republic of India. Any disputes arising out of or related to purchases on footzi.in shall be subject to the exclusive jurisdiction of the competent courts in <strong>Agra, Uttar Pradesh</strong>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
