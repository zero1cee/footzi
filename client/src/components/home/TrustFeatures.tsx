import React from 'react';
import { Star, CheckCircle, PackageCheck, Truck, RefreshCcw, ShieldCheck } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';

const REVIEWS = [
  {
    author: 'Vikramaditya S.',
    location: 'Bengaluru, Karnataka',
    rating: 5,
    title: 'Surpassed European Luxury Loafers',
    content:
      'The Belgravia Penny Loafer in Vintage Tan is genuinely magnificent. The burnished patina and leather sole look like an 18,000 INR Italian pair, yet cost a fraction. Wore them to a 3-day tech conference without a single blister.',
    productName: 'The Agra Belgravia Penny Loafer',
    verified: true,
  },
  {
    author: 'Ananya Mehra',
    location: 'New Delhi',
    rating: 5,
    title: 'The Monolith Sneaker is Flawless',
    content:
      'The butter-soft Italian nappa leather is sublime. Clean silhouette with zero tacky logos. The dropshipping fulfillment took only 3 days from Agra to South Delhi with precise SMS tracking.',
    productName: 'The Monolith Minimalist Court',
    verified: true,
  },
  {
    author: 'Rohan Deshmukh',
    location: 'Mumbai, Maharashtra',
    rating: 5,
    title: 'Agra Leather Craftsmanship at its Finest',
    content:
      'Bought the Taj Double Monk in Cognac Amber. The solid brass hardware and chiselled toe profile turn heads in boardroom meetings. Incredibly proud that this level of craft comes from Agra artisans.',
    productName: 'The Taj Double Monk Strap',
    verified: true,
  },
];

export const TrustFeatures: React.FC = () => {
  const returnWindowDays = useSettingsStore((s) => s.settings.returnWindowDays);
  return (
    <section className="py-20 bg-ivory-50 border-b border-ivory-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-[11px] uppercase tracking-widest text-sand-600 font-semibold block mb-1">
            Voices of Patrons
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-medium text-charcoal-950">
            Trusted by Connoisseurs Across India
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-600 mt-2 font-light">
            Real feedback from discerning customers across metropolitan India.
          </p>
        </div>

        {/* 3 Testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {REVIEWS.map((review, i) => (
            <div
              key={i}
              className="bg-white p-7 rounded-xs border border-ivory-200 shadow-sm flex flex-col justify-between hover:border-sand-300 transition-colors"
            >
              <div>
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(review.rating)].map((_, r) => (
                    <Star key={r} className="w-3.5 h-3.5 fill-sand-400 text-sand-400" />
                  ))}
                </div>

                <h3 className="font-serif text-base font-semibold text-charcoal-900 mb-2">
                  "{review.title}"
                </h3>

                <p className="text-xs text-charcoal-600 leading-relaxed font-light mb-6">
                  {review.content}
                </p>
              </div>

              <div className="pt-4 border-t border-ivory-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-charcoal-900">{review.author}</span>
                    {review.verified && (
                      <span title="Verified Buyer">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-charcoal-500">{review.location}</span>
                </div>
                <span className="text-[10px] text-sand-600 font-medium max-w-[100px] text-right truncate">
                  {review.productName}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Dropship Assurance Banner */}
        <div className="mt-16 bg-charcoal-900 text-ivory-50 p-8 sm:p-10 rounded-xs border border-charcoal-800">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-2">
              <span className="text-[10px] uppercase tracking-widest text-sand-400 font-semibold block">
                The Footzi Direct Fulfillment Model
              </span>
              <h3 className="font-serif text-2xl font-medium text-ivory-50">
                Direct from Agra Workshops. Zero Middlemen Markup.
              </h3>
              <p className="text-xs text-charcoal-400 font-light leading-relaxed">
                By coordinating our direct dropship supplier fulfillment network in Agra, your footwear is dispatched fresh from the craftsman’s workshop with triple QA inspection and guaranteed authenticity.
              </p>
            </div>

            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="bg-charcoal-800/80 p-4 rounded-xs border border-charcoal-700">
                <PackageCheck className="w-6 h-6 text-sand-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-ivory-100">Workshop QA</p>
                <p className="text-[10px] text-charcoal-400 mt-1">Inspected in Agra</p>
              </div>
              <div className="bg-charcoal-800/80 p-4 rounded-xs border border-charcoal-700">
                <Truck className="w-6 h-6 text-sand-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-ivory-100">Simulated Dispatch</p>
                <p className="text-[10px] text-charcoal-400 mt-1">Live tracking updates</p>
              </div>
              <div className="bg-charcoal-800/80 p-4 rounded-xs border border-charcoal-700">
                <RefreshCcw className="w-6 h-6 text-sand-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-ivory-100">Doorstep Exchange</p>
                <p className="text-[10px] text-charcoal-400 mt-1">Size swap in {returnWindowDays} days</p>
              </div>
              <div className="bg-charcoal-800/80 p-4 rounded-xs border border-charcoal-700">
                <ShieldCheck className="w-6 h-6 text-sand-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-ivory-100">Razorpay Secured</p>
                <p className="text-[10px] text-charcoal-400 mt-1">UPI, Cards & NetBanking</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
