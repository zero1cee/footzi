import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Shield, Truck, RefreshCw, Award } from 'lucide-react';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer className="bg-charcoal-950 text-ivory-100 border-t border-charcoal-800">
      {/* Trust Pillars Bar */}
      <div className="border-b border-charcoal-800 py-10 bg-charcoal-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex items-start gap-3.5">
              <Award className="w-6 h-6 text-sand-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-serif text-base font-medium text-ivory-50">Agra Artisanal Heritage</h4>
                <p className="text-xs text-charcoal-400 mt-1 leading-relaxed">
                  Generational shoemakers crafting each pair with architectural balance.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <Shield className="w-6 h-6 text-sand-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-serif text-base font-medium text-ivory-50">100% Genuine Leathers</h4>
                <p className="text-xs text-charcoal-400 mt-1 leading-relaxed">
                  Certified full-grain, veg-tan calfskin and butter-soft Italian nappa.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <Truck className="w-6 h-6 text-sand-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-serif text-base font-medium text-ivory-50">Pan-India Express</h4>
                <p className="text-xs text-charcoal-400 mt-1 leading-relaxed">
                  Dispatched in 24 hours with end-to-end simulated tracking.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <RefreshCw className="w-6 h-6 text-sand-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-serif text-base font-medium text-ivory-50">Hassle-Free Exchanges</h4>
                <p className="text-xs text-charcoal-400 mt-1 leading-relaxed">
                  Complimentary 7-day doorstep size replacement across all pincodes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links & Newsletter */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand Philosophy */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="inline-block">
              <span className="font-serif text-3xl font-semibold tracking-widest text-ivory-50 uppercase">
                FOOTZI
              </span>
              <span className="block text-[10px] tracking-ultra text-sand-400 uppercase mt-0.5">
                Agra Atelier • Est. 2024
              </span>
            </Link>
            <p className="text-xs text-charcoal-400 leading-relaxed max-w-sm">
              Footzi bridges the timeless stone symmetry and 500-year leathercraft tradition of Agra with contemporary Indian minimalist footwear design. Every silhouette is calibrated for comfort and distinction.
            </p>
            <div className="pt-2 text-xs text-charcoal-400 space-y-1">
              <p><strong className="text-ivory-200">Atelier:</strong> Taj Nagari Phase II, Agra, Uttar Pradesh 282001</p>
              <p><strong className="text-ivory-200">Customer Care:</strong> concierge@footzi.in | +91 562 284 9000</p>
            </div>
          </div>

          {/* Footwear Categories */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-sand-400 mb-4">
              Collections
            </h4>
            <ul className="space-y-2.5 text-xs text-charcoal-400">
              <li>
                <Link to="/shop?category=Loafers" className="hover:text-ivory-100 transition-colors">
                  Artisanal Penny Loafers
                </Link>
              </li>
              <li>
                <Link to="/shop?category=Sneakers" className="hover:text-ivory-100 transition-colors">
                  Minimalist Court Sneakers
                </Link>
              </li>
              <li>
                <Link to="/shop?category=Oxfords" className="hover:text-ivory-100 transition-colors">
                  Double Monk & Oxfords
                </Link>
              </li>
              <li>
                <Link to="/shop?category=Boots" className="hover:text-ivory-100 transition-colors">
                  Sandstone Chelsea Boots
                </Link>
              </li>
              <li>
                <Link to="/shop?badge=Artisan+Heritage" className="hover:text-ivory-100 transition-colors">
                  The Agra Heritage Edit
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Concierge */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-sand-400 mb-4">
              Concierge & Care
            </h4>
            <ul className="space-y-2.5 text-xs text-charcoal-400">
              <li>
                <Link to="/account/orders" className="hover:text-ivory-100 transition-colors">
                  Track Your Shipment
                </Link>
              </li>
              <li>
                <Link to="/account/returns" className="hover:text-ivory-100 transition-colors">
                  Size Exchange & Returns
                </Link>
              </li>
              <li>
                <Link to="/size-guide" className="hover:text-ivory-100 transition-colors">
                  Indian Shoe Size Guide
                </Link>
              </li>
              <li>
                <Link to="/leather-care" className="hover:text-ivory-100 transition-colors">
                  Leather Care Rituals
                </Link>
              </li>
              <li>
                <Link to="/admin" className="text-sand-400 hover:text-sand-300 transition-colors">
                  Admin & Supplier Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter Signup */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-sand-400 mb-4">
              The Footzi Journal
            </h4>
            <p className="text-xs text-charcoal-400 leading-relaxed mb-4">
              Receive private invitations to limited artisan batch releases and footwear care chronicles.
            </p>

            {subscribed ? (
              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800 p-2.5 rounded-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Welcome to Footzi Privé. Check your inbox for 15% off.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full bg-charcoal-900 border border-charcoal-700 px-3 py-2 text-xs text-ivory-100 placeholder:text-charcoal-500 rounded-xs focus:outline-none focus:border-sand-400"
                  />
                  <button
                    type="submit"
                    className="absolute right-1 top-1 bottom-1 px-3 bg-sand-400 text-charcoal-950 hover:bg-sand-500 rounded-xs flex items-center justify-center transition-colors"
                    aria-label="Subscribe"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-charcoal-500">
                  By subscribing, you agree to our Privacy Policy. Never spammed.
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Bottom Bar: Copyright & Payment Badges */}
        <div className="mt-16 pt-8 border-t border-charcoal-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-charcoal-500">
          <div>
            <p>© {new Date().getFullYear()} FOOTZI LUXURY FOOTWEAR PRIVATE LIMITED. All rights reserved.</p>
            <p className="text-[11px] text-charcoal-600 mt-0.5">
              Architecturally Conceived in Agra • Hand-Finished in India.
            </p>
          </div>

          {/* Payment & Security Badges */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] tracking-wider uppercase text-charcoal-400">
              Secured with Razorpay
            </span>
            <div className="flex items-center gap-2 text-[10px] bg-charcoal-900 px-2.5 py-1 rounded-xs border border-charcoal-800 text-charcoal-300">
              <span>UPI</span>
              <span>•</span>
              <span>RuPay</span>
              <span>•</span>
              <span>Visa</span>
              <span>•</span>
              <span>Mastercard</span>
              <span>•</span>
              <span>NetBanking</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
