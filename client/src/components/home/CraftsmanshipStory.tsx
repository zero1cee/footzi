import React from 'react';
import { Layers, Feather, Footprints, ShieldCheck } from 'lucide-react';

const STEPS = [
  {
    icon: Layers,
    number: '01',
    title: 'Certified Full-Grain Hides',
    description:
      'Only the top 5% of vegetable-tanned calfskin is hand-selected. Never corrected-grain or plastic-coated leather.',
  },
  {
    icon: Footprints,
    number: '02',
    title: 'Indian Anatomical Last',
    description:
      'Custom wooden shoe lasts engineered with generous instep and ball width to eradicate pinching common with European lasts.',
  },
  {
    icon: Feather,
    number: '03',
    title: 'Triple-Density Footbed',
    description:
      'High-resilience latex foam fused with open-cell memory foam and natural cork filling that adapts to your arch imprint.',
  },
  {
    icon: ShieldCheck,
    number: '04',
    title: 'Channel Blake Stitching',
    description:
      'Direct lockstitch joining upper, insole, and outsole for ultra-flexible roll-off and permanent mechanical integrity.',
  },
];

export const CraftsmanshipStory: React.FC = () => {
  return (
    <section className="py-20 bg-ivory-100 border-b border-ivory-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-[11px] uppercase tracking-widest text-sand-600 font-semibold block mb-2">
            Engineering & Ergonomics
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-medium text-charcoal-950">
            Anatomy of a Footzi Silhouette
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-600 mt-3 font-light leading-relaxed">
            Every millimeter is mathematically considered to balance architectural poise with sneakers-level everyday comfort.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="bg-white/80 backdrop-blur-sm p-6 sm:p-8 rounded-xs border border-ivory-200 shadow-sm relative group hover:border-sand-400 hover:shadow-card transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-xs bg-sand-100 text-charcoal-900 flex items-center justify-center group-hover:bg-sand-400 group-hover:text-charcoal-950 transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="font-serif text-3xl font-light text-charcoal-300">
                      {step.number}
                    </span>
                  </div>

                  <h3 className="font-serif text-lg font-medium text-charcoal-950 mb-2">
                    {step.title}
                  </h3>

                  <p className="text-xs text-charcoal-600 leading-relaxed font-light">
                    {step.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-ivory-100 flex items-center text-[10px] uppercase tracking-widest text-sand-600 font-medium">
                  Artisan Standard
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
