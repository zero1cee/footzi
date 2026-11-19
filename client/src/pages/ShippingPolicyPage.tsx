import React from 'react';
import { Truck, Clock, MapPin, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

export const ShippingPolicyPage: React.FC = () => {
  useDocumentMeta({
    title: 'Shipping & Delivery Policy — Footzi',
    description: 'Learn about Footzi pan-India express delivery powered by Delhivery, 24-hour dispatch, shipping fees, and live AWB tracking.',
  });

  return (
    <div className="py-12 md:py-20 bg-ivory-100 min-h-[85vh]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <div className="text-center space-y-3 border-b border-ivory-300 pb-8">
          <span className="text-[11px] uppercase tracking-ultra text-sand-600 font-semibold block">
            Pan-India Express Logistics
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-medium text-charcoal-950">
            Shipping & Delivery Policy
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-600 max-w-xl mx-auto font-light leading-relaxed">
            Delivering artisanal Agra craftsmanship across 27,000+ Indian postal pincodes with Delhivery Express.
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white p-6 sm:p-10 rounded-xs border border-ivory-200 shadow-sm space-y-8 text-xs sm:text-sm text-charcoal-700 leading-relaxed">
          <section className="space-y-3">
            <h2 className="font-serif text-lg sm:text-xl font-semibold text-charcoal-950 flex items-center gap-2">
              <Truck className="w-5 h-5 text-sand-600" />
              1. Logistics Partner & Courier Routing
            </h2>
            <p>
              Footzi partners exclusively with <strong>Delhivery Express Logistics</strong>, India&rsquo;s leading supply chain network, to guarantee rapid, insured, and tracked transit from our central atelier in Agra directly to your residence or workplace.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg sm:text-xl font-semibold text-charcoal-950 flex items-center gap-2">
              <Clock className="w-5 h-5 text-sand-600" />
              2. Dispatch SLA & Delivery Timelines
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="bg-ivory-50 p-4 border border-ivory-200 rounded-xs space-y-1.5">
                <p className="font-semibold text-charcoal-950 text-xs uppercase tracking-wider text-sand-700">
                  Tier 1 Metros & NCR
                </p>
                <p className="font-serif text-2xl font-medium text-charcoal-900">2 to 4 Days</p>
                <p className="text-xs text-charcoal-600">
                  Delhi NCR, Mumbai, Bengaluru, Hyderabad, Chennai, Kolkata, Pune & Ahmedabad.
                </p>
              </div>

              <div className="bg-ivory-50 p-4 border border-ivory-200 rounded-xs space-y-1.5">
                <p className="font-semibold text-charcoal-950 text-xs uppercase tracking-wider text-sand-700">
                  Tier 2, Tier 3 & Rest of India
                </p>
                <p className="font-serif text-2xl font-medium text-charcoal-900">3 to 6 Days</p>
                <p className="text-xs text-charcoal-600">
                  State capitals, regional districts, and peripheral pin codes across all 28 states & 8 UTs.
                </p>
              </div>
            </div>
            <p className="text-xs text-charcoal-500 italic mt-2">
              *All verified orders are packaged in museum-grade double-corrugated protective boxing and dispatched from Agra within 24 to 48 hours of order confirmation.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg sm:text-xl font-semibold text-charcoal-950 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-sand-600" />
              3. Shipping Charges & Free Delivery Threshold
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-charcoal-600">
              <li>
                <strong>Orders Above ₹1,999:</strong> 100% <strong>COMPLIMENTARY FREE SHIPPING</strong> across all serviceable pincodes in India.
              </li>
              <li>
                <strong>Orders Below ₹1,999:</strong> A nominal flat logistics fee of <strong>₹99</strong> is applied at checkout to cover express air-freight packaging.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg sm:text-xl font-semibold text-charcoal-950 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-sand-600" />
              4. Live AWB Tracking & Delivery Notifications
            </h2>
            <p>
              The moment your package is inducted into the Delhivery hub, an official Air Waybill (e.g. <code>DLV-AGR-XXXXXXXX</code>) is assigned. You will receive an immediate SMS and email notification containing your direct Delhivery tracking link.
            </p>
            <p>
              You can also track your shipment at any hour by navigating to our dedicated <a href="/track-order" className="text-sand-600 font-semibold underline">Track Order Portal</a> or directly on <a href="https://www.delhivery.com" target="_blank" rel="noopener noreferrer" className="text-sand-600 font-semibold underline">Delhivery.com</a>.
            </p>
          </section>

          <section className="space-y-3 border-t border-ivory-200 pt-6">
            <h2 className="font-serif text-lg sm:text-xl font-semibold text-charcoal-950 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-sand-600" />
              5. Delivery Attempts & Address Correction
            </h2>
            <p>
              Delhivery will make up to three consecutive delivery attempts. Before each attempt, you will receive an automated OTP or dispatch alert. If you anticipate being unavailable, you can reschedule delivery directly through the Delhivery SMS link.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ShippingPolicyPage;
