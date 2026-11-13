import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const HeroSection: React.FC = () => {
  return (
    <section className="relative overflow-hidden bg-ivory-100 border-b border-ivory-200">
      {/* Subtle architectural background texture */}
      <div className="absolute inset-0 bg-marble-subtle pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 lg:py-24 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Editorial Copy */}
          <div className="lg:col-span-6 space-y-6 sm:space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-ivory-200/80 border border-ivory-300 rounded-full text-[11px] font-medium tracking-widest uppercase text-charcoal-700">
              <Sparkles className="w-3 h-3 text-sand-500" />
              <span>Agra Shoemaking Tradition • Contemporary Minimalist Design</span>
            </div>

            <div className="space-y-3">
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-charcoal-950 leading-[1.1]">
                The Architectural Shoe. Handcrafted in Agra, Designed for Now.
              </h1>
              <p className="text-sm sm:text-base text-charcoal-600 max-w-xl mx-auto lg:mx-0 leading-relaxed font-light">
                Infused with the geometric poise and marble-inlay precision of Agra’s artisanal legacy. Premium full-grain leathers, anatomic memory footbeds, and modern silhouettes made for discerning Indian lifestyles.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <Link to="/shop">
                <Button variant="primary" size="lg" className="w-full sm:w-auto shadow-md flex items-center gap-2">
                  Explore Footwear <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/shop?badge=Artisan+Heritage">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  The Agra Heritage Series
                </Button>
              </Link>
            </div>

            {/* Value Indicators */}
            <div className="pt-6 border-t border-ivory-300 grid grid-cols-3 gap-4 text-center lg:text-left">
              <div>
                <p className="font-serif text-2xl font-bold text-charcoal-900">100%</p>
                <p className="text-[11px] uppercase tracking-wider text-charcoal-500 mt-0.5">Full-Grain Leather</p>
              </div>
              <div>
                <p className="font-serif text-2xl font-bold text-charcoal-900">₹1,999+</p>
                <p className="text-[11px] uppercase tracking-wider text-charcoal-500 mt-0.5">Free Express Shipping</p>
              </div>
              <div>
                <p className="font-serif text-2xl font-bold text-charcoal-900">7 Days</p>
                <p className="text-[11px] uppercase tracking-wider text-charcoal-500 mt-0.5">Doorstep Exchange</p>
              </div>
            </div>
          </div>

          {/* Right Editorial Showcase Images */}
          <div className="lg:col-span-6 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Primary Main Image with architectural framing */}
              <div className="aspect-[4/5] rounded-sm overflow-hidden bg-ivory-300 shadow-elevated border border-ivory-200 relative group">
                <img decoding="async" ref={(el) => el?.setAttribute("fetchpriority", "high")}
                  src="https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=1200&q=85"
                  alt="The Agra Belgravia Penny Loafer"
                  className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-700"
                />

                {/* Subtle Floating Product Badge */}
                <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-md p-4 rounded-xs border border-ivory-200 shadow-lg flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-sand-600 font-semibold block">
                      Featured Masterpiece
                    </span>
                    <p className="font-serif text-base font-medium text-charcoal-900">
                      The Belgravia Penny Loafer
                    </p>
                    <p className="text-xs text-charcoal-500 font-sans">
                      Hand-Burnished Calfskin • ₹3,899
                    </p>
                  </div>
                  <Link
                    to="/product/agra-belgravia-penny-loafer"
                    className="p-2.5 rounded-full bg-charcoal-900 text-white hover:bg-sand-500 hover:text-charcoal-950 transition-colors"
                    aria-label="View Belgravia Loafer"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Secondary Offset Architectural Card */}
              <div className="hidden sm:block absolute -bottom-6 -left-8 w-44 bg-ivory-50 p-2 rounded-xs shadow-xl border border-ivory-300">
                <img decoding="async" loading="lazy"
                  src="https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=500&q=80"
                  alt="Minimal Court Sneaker"
                  className="w-full aspect-square object-cover rounded-xs"
                />
                <div className="p-1.5 text-center">
                  <p className="font-serif text-xs font-semibold text-charcoal-900">Monolith Court</p>
                  <p className="text-[10px] text-charcoal-500">Butter Italian Nappa</p>
                </div>
              </div>

              {/* Agra Heritage Stamp */}
              <div className="absolute -top-4 -right-4 bg-charcoal-900 text-ivory-50 px-3 py-2 rounded-xs shadow-md border border-charcoal-800 text-center">
                <p className="text-[9px] uppercase tracking-widest text-sand-300 font-semibold">Agra Origin</p>
                <p className="font-serif text-xs font-bold tracking-wider">MUGHAL ATELIER</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
