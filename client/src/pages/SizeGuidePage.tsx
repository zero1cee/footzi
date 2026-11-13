import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Ruler, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

const SIZE_CHART = [
  { uk: 'UK 6', eu: 'EU 40', us: 'US 7', cm: 24.5 },
  { uk: 'UK 7', eu: 'EU 41', us: 'US 8', cm: 25.4 },
  { uk: 'UK 8', eu: 'EU 42', us: 'US 9', cm: 26.2 },
  { uk: 'UK 9', eu: 'EU 43', us: 'US 10', cm: 27.1 },
  { uk: 'UK 10', eu: 'EU 44', us: 'US 11', cm: 27.9 },
  { uk: 'UK 11', eu: 'EU 45', us: 'US 12', cm: 28.8 },
];

export const SizeGuidePage: React.FC = () => {
  useDocumentMeta({
    title: 'Size Guide — Footzi',
    description: 'Find your UK size with the Footzi size guide: foot length chart, fit notes for every silhouette and how to measure at home.',
  });
  const [footLengthCm, setFootLengthCm] = useState<string>('');

  const parsedCm = parseFloat(footLengthCm);
  const recommendedSize =
    !isNaN(parsedCm) && parsedCm >= 23 && parsedCm <= 31
      ? SIZE_CHART.find((row) => parsedCm <= row.cm + 0.3) || SIZE_CHART[SIZE_CHART.length - 1]
      : null;

  return (
    <div className="py-12 md:py-20 bg-ivory-100 min-h-[85vh]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center space-y-3 border-b border-ivory-300 pb-8">
          <span className="text-[11px] uppercase tracking-ultra text-sand-600 font-semibold block">
            Agra Last Calibration
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-medium text-charcoal-950">
            Indian Shoe Size & Fit Guide
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-600 max-w-xl mx-auto font-light leading-relaxed">
            Every Footzi silhouette is sculpted on anatomical Indian lasts accounting for natural forefoot width and high-instep comfort.
          </p>
        </div>

        {/* Quick Foot Length Finder */}
        <div className="bg-white p-6 sm:p-8 rounded-xs border border-ivory-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-charcoal-950">
            <Ruler className="w-5 h-5 text-sand-600" />
            <h2 className="font-serif text-xl font-medium">Find Your UK Size by Foot Length</h2>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="flex-1">
              <label htmlFor="foot-cm" className="block text-[11px] uppercase tracking-wider font-semibold text-charcoal-700 mb-1.5">
                Heel-to-Toe Length (cm)
              </label>
              <input
                id="foot-cm"
                type="number"
                step="0.1"
                min="23"
                max="31"
                placeholder="e.g. 26.2"
                value={footLengthCm}
                onChange={(e) => setFootLengthCm(e.target.value)}
                className="w-full bg-ivory-50 border border-ivory-300 px-4 py-2.5 text-sm text-charcoal-900 rounded-xs focus:outline-none focus:border-charcoal-900"
              />
            </div>

            <div className="sm:w-64 p-4 bg-ivory-100 border border-ivory-300 rounded-xs text-center">
              <span className="text-[10px] uppercase tracking-widest text-charcoal-500 block">
                Recommended Fit
              </span>
              {recommendedSize ? (
                <div className="mt-1">
                  <span className="font-serif text-2xl font-bold text-charcoal-950">
                    {recommendedSize.uk}
                  </span>
                  <span className="text-[11px] text-charcoal-600 block">
                    ({recommendedSize.eu} • {recommendedSize.us})
                  </span>
                </div>
              ) : (
                <span className="text-xs text-charcoal-500 mt-1 block">
                  Enter 23.0 – 31.0 cm
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Full Conversion Matrix */}
        <div className="bg-white rounded-xs border border-ivory-300 overflow-hidden shadow-sm">
          <table className="w-full text-xs sm:text-sm text-left">
            <thead className="bg-charcoal-900 text-ivory-50 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="p-4">India / UK</th>
                <th className="p-4">Europe (EU)</th>
                <th className="p-4">US Men</th>
                <th className="p-4">Foot Length</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-200 text-charcoal-800">
              {SIZE_CHART.map((row) => (
                <tr
                  key={row.uk}
                  className={`transition-colors ${
                    recommendedSize?.uk === row.uk ? 'bg-sand-100/70 font-semibold' : 'hover:bg-ivory-100'
                  }`}
                >
                  <td className="p-4 font-bold text-charcoal-950">{row.uk}</td>
                  <td className="p-4 text-charcoal-600">{row.eu}</td>
                  <td className="p-4 text-charcoal-600">{row.us}</td>
                  <td className="p-4 font-mono text-sand-700">{row.cm.toFixed(1)} cm</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Measuring Ritual + Fit Advice */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xs border border-ivory-200 space-y-3 text-xs text-charcoal-600">
            <h3 className="font-serif text-lg font-medium text-charcoal-950 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Measuring at Home
            </h3>
            <ol className="space-y-2 list-decimal list-inside leading-relaxed">
              <li>Measure late afternoon when feet are at natural full volume.</li>
              <li>Stand barefoot on an A4 sheet with your heel flush against a wall.</li>
              <li>Mark the tip of your longest toe on both feet and use the longer measurement.</li>
              <li>Compare against our chart above in centimeters.</li>
            </ol>
          </div>

          <div className="bg-white p-6 rounded-xs border border-ivory-200 space-y-3 text-xs text-charcoal-600">
            <h3 className="font-serif text-lg font-medium text-charcoal-950 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sand-600" />
              Silhouette Fit Notes
            </h3>
            <ul className="space-y-2 leading-relaxed">
              <li><strong>Sneakers & Runners:</strong> True to UK size with anatomical arch padding.</li>
              <li><strong>Loafers & Driving Mocs:</strong> True to size; supple calfskin molds 2–3mm after 2 wears.</li>
              <li><strong>Chelsea & Ankle Boots:</strong> Between sizes? Take the larger UK size to accommodate dress socks.</li>
            </ul>
          </div>
        </div>

        {/* Bottom Guarantee CTA */}
        <div className="bg-charcoal-900 text-ivory-100 p-6 sm:p-8 rounded-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-serif text-xl font-medium text-ivory-50">
              7-Day Free Doorstep Size Exchange
            </h3>
            <p className="text-xs text-charcoal-300 mt-1">
              If your pair feels snug or loose, schedule a complimentary reverse pickup directly from your Patron Account.
            </p>
          </div>
          <Link to="/shop" className="shrink-0">
            <Button variant="sand" size="md" className="gap-2">
              Shop Footwear <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
