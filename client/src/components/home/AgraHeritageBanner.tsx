import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Compass, Scissors, ShieldAlert, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const AgraHeritageBanner: React.FC = () => {
  return (
    <section id="heritage" className="py-20 md:py-28 bg-[#F4EFE6] relative overflow-hidden border-b border-ivory-300">
      {/* Background Jaali pattern */}
      <div className="absolute inset-0 bg-agra-jaali opacity-30 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left: Architectural Visual Composition */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-sm lg:max-w-none">
              {/* Primary Image with Agra Arch silhouette border */}
              <div className="aspect-[3/4] rounded-sm overflow-hidden shadow-2xl border-2 border-white/60 relative">
                <img
                  src="https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1000&q=80"
                  alt="Agra Handcrafted Leather Finishing"
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/70 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <span className="text-[10px] uppercase tracking-widest text-sand-300 font-semibold block">
                    Taj Nagari Quarter • Agra
                  </span>
                  <p className="font-serif text-lg font-medium">Master Artisans at the Last</p>
                </div>
              </div>

              {/* Inset Decorative Geometric Arch Card */}
              <div className="hidden sm:block absolute -top-6 -right-6 w-36 bg-white p-3 shadow-xl rounded-xs border border-ivory-300 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-sand-100 flex items-center justify-center text-sand-600 mb-2">
                  <Compass className="w-5 h-5" />
                </div>
                <p className="text-[10px] uppercase tracking-widest text-charcoal-500 font-semibold">
                  Precision
                </p>
                <p className="font-serif text-xs font-bold text-charcoal-900 mt-0.5">
                  1:1 Geometric Symmetry
                </p>
              </div>
            </div>
          </div>

          {/* Right: Narrative Editorial */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/70 border border-sand-300 rounded-full text-[11px] font-semibold tracking-widest uppercase text-sand-700">
              <Sparkles className="w-3.5 h-3.5 text-sand-500" />
              <span>Architectural Lineage</span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium text-charcoal-950 leading-[1.15]">
              Agra’s 500-Year Shoemaking Soul, Reimagined for the Modern Wardrobe.
            </h2>

            <p className="text-sm sm:text-base text-charcoal-700 leading-relaxed font-light">
              Long before industrial fast-fashion, the city of Agra served as the epicenter of global leathercraft, celebrated for its intricate marble inlays, balanced proportions, and leather artisans whose skills were passed from father to son across half a millennium.
            </p>

            <p className="text-sm sm:text-base text-charcoal-700 leading-relaxed font-light">
              At Footzi, we collaborate directly with Agra’s generational workshops. By bypassing traditional multi-tier retail markups through our curated direct-fulfillment dropshipping architecture, we deliver genuine artisanal calfskin footwear to your doorstep at unmatched fair prices.
            </p>

            {/* Micro Feature Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xs border border-ivory-300">
                <div className="flex items-center gap-2 text-charcoal-900 font-serif font-medium text-base">
                  <Scissors className="w-4 h-4 text-sand-600" />
                  <span>Blake-Stitched Longevity</span>
                </div>
                <p className="text-xs text-charcoal-600 mt-1 leading-relaxed">
                  Allows shoes to be resoled repeatedly, outlasting glued store pairs by years.
                </p>
              </div>

              <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xs border border-ivory-300">
                <div className="flex items-center gap-2 text-charcoal-900 font-serif font-medium text-base">
                  <ShieldAlert className="w-4 h-4 text-sand-600" />
                  <span>Vegetable-Tanned Patina</span>
                </div>
                <p className="text-xs text-charcoal-600 mt-1 leading-relaxed">
                  Organic tannins develop a deep, personalized luster the more you walk.
                </p>
              </div>
            </div>

            <div className="pt-4">
              <Link to="/brand-story">
                <Button variant="primary" size="lg" className="gap-2 shadow-md">
                  Read The Footzi Manifesto <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
