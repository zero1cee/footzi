import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Droplets, Shield, Wind, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

export const LeatherCarePage: React.FC = () => {
  useDocumentMeta({
    title: 'Leather Care Guide — Footzi',
    description: 'How to clean, condition and store full-grain leather footwear so your Footzi pair keeps its patina for years.',
  });
  const rituals = [
    {
      title: 'Full-Grain & Burnished Calfskin',
      subtitle: 'Loafers, Oxfords & Dress Silhouettes',
      icon: Sparkles,
      steps: [
        'Dust off surface particulates after each wear with a soft horsehair brush.',
        'Condition every 10–12 wears using a neutral beeswax cream to preserve the hand-burnished Agra patina.',
        'Buff gently with a cotton flannel cloth for a warm, architectural satin luster.',
      ],
    },
    {
      title: 'Brushed Split Suede & Corduroy',
      subtitle: 'Retro Runners & Terrace Sneakers',
      icon: Wind,
      steps: [
        'Never soak suede or corduroy in water; spot-clean stains dry with a crepe suede eraser.',
        'Brush gently in a single direction with a brass/nylon nap brush to lift compressed fibers.',
        'Apply a light hydrophobic protector spray before monsoon or dusty commutes.',
      ],
    },
    {
      title: 'Monsoon & Moisture Care',
      subtitle: 'Indian Climate Protection',
      icon: Droplets,
      steps: [
        'If caught in heavy rain, wipe excess water immediately and stuff interiors with unprinted kraft paper.',
        'Air dry at room temperature away from direct sunlight or heaters to avoid leather cracking.',
        'Apply cedar shoe trees once dry to pull remaining moisture and preserve silhouette shape.',
      ],
    },
    {
      title: 'Outsole & Arch Longevity',
      subtitle: 'Blake Welt & Gum Cupsoles',
      icon: Shield,
      steps: [
        'Allow leather-lined pairs 24 hours of rest between consecutive wears so inner sheepskin ventilates.',
        'Use a horn shoehorn when putting on stiff heels to preserve internal counter structure.',
        'Clean natural honey gum and EVA midsoles with a damp microfiber cloth and mild soap.',
      ],
    },
  ];

  return (
    <div className="py-12 md:py-20 bg-ivory-100 min-h-[85vh]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center space-y-3 border-b border-ivory-300 pb-8">
          <span className="text-[11px] uppercase tracking-ultra text-sand-600 font-semibold block">
            Longevity & Preservation
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-medium text-charcoal-950">
            Leather & Material Care Rituals
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-600 max-w-2xl mx-auto font-light leading-relaxed">
            Architectural footwear is designed to age with distinction. Following these Agra atelier rituals ensures your calfskin, suede, and corduroy silhouettes gather character over years of wear.
          </p>
        </div>

        {/* Care Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rituals.map((ritual) => {
            const Icon = ritual.icon;
            return (
              <div
                key={ritual.title}
                className="bg-white p-6 sm:p-8 rounded-xs border border-ivory-200 shadow-sm space-y-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-sand-100 border border-sand-200 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-sand-700" />
                  </div>
                  <div>
                    <h2 className="font-serif text-xl font-medium text-charcoal-950">
                      {ritual.title}
                    </h2>
                    <p className="text-[11px] uppercase tracking-wider text-sand-700 font-semibold">
                      {ritual.subtitle}
                    </p>
                  </div>
                </div>

                <ul className="space-y-2.5 text-xs text-charcoal-600 leading-relaxed pt-2 border-t border-ivory-200">
                  {ritual.steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-sand-500 mt-1.5 shrink-0" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="bg-charcoal-900 text-ivory-100 p-6 sm:p-8 rounded-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-serif text-xl font-medium text-ivory-50">
              Need Resoling or Atelier Conditioning?
            </h3>
            <p className="text-xs text-charcoal-300 mt-1">
              Reach our Agra Concierge at <strong>concierge@footzi.in</strong> for workshop refurbishments.
            </p>
          </div>
          <Link to="/shop" className="shrink-0">
            <Button variant="sand" size="md" className="gap-2">
              Explore Footwear <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
