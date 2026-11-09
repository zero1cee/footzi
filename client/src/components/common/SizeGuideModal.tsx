import React from 'react';
import { X, Ruler, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SizeGuideModal: React.FC<SizeGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const sizeChart = [
    { uk: 'UK 6', eu: 'EU 40', us: 'US 7', cm: '24.5 cm' },
    { uk: 'UK 7', eu: 'EU 41', us: 'US 8', cm: '25.4 cm' },
    { uk: 'UK 8', eu: 'EU 42', us: 'US 9', cm: '26.2 cm' },
    { uk: 'UK 9', eu: 'EU 43', us: 'US 10', cm: '27.1 cm' },
    { uk: 'UK 10', eu: 'EU 44', us: 'US 11', cm: '27.9 cm' },
    { uk: 'UK 11', eu: 'EU 45', us: 'US 12', cm: '28.8 cm' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-charcoal-950/70 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative bg-ivory-50 max-w-xl w-full rounded-xs shadow-2xl border border-ivory-300 p-6 sm:p-8 z-10 animate-fade-in">
        <div className="flex items-center justify-between pb-4 border-b border-ivory-200">
          <div className="flex items-center gap-2">
            <Ruler className="w-5 h-5 text-sand-600" />
            <h2 className="font-serif text-xl font-medium text-charcoal-950">
              Indian Shoe Size Conversion & Fit Guide
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-charcoal-500 hover:text-charcoal-900 transition-colors"
            aria-label="Close size guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <p className="text-xs text-charcoal-600 leading-relaxed font-light">
            Footzi silhouettes are calibrated to standard <strong>Indian (UK) sizing</strong>. Because our lasts are custom-built for Indian foot ball and instep widths, there is no need to size up for standard loafers and sneakers.
          </p>

          {/* Size Comparison Table */}
          <div className="border border-ivory-300 rounded-xs overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-charcoal-900 text-ivory-50 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="p-3">India / UK</th>
                  <th className="p-3">Euro (EU)</th>
                  <th className="p-3">US Men</th>
                  <th className="p-3">Foot Length</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-200 bg-white text-charcoal-800">
                {sizeChart.map((row) => (
                  <tr key={row.uk} className="hover:bg-ivory-100 transition-colors">
                    <td className="p-3 font-bold text-charcoal-950">{row.uk}</td>
                    <td className="p-3 text-charcoal-600">{row.eu}</td>
                    <td className="p-3 text-charcoal-600">{row.us}</td>
                    <td className="p-3 font-mono text-sand-700">{row.cm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* How to measure tips */}
          <div className="bg-white p-4 rounded-xs border border-ivory-200 text-xs text-charcoal-600 space-y-2">
            <p className="font-semibold text-charcoal-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              How to Measure at Home:
            </p>
            <p className="leading-relaxed">
              1. Place a blank sheet of paper against a wall on a flat floor.<br />
              2. Step on the paper with your heel firmly touching the wall.<br />
              3. Mark the tip of your longest toe and measure the distance to the edge in centimeters.<br />
              4. If you fall between two sizes, choose the larger size for boots or thick socks, or smaller size for unlined driving loafers.
            </p>
          </div>

          {/* Guarantee banner */}
          <div className="flex items-center gap-2 p-3 bg-sand-100/80 border border-sand-300 rounded-xs text-xs text-sand-900 font-medium">
            <ShieldCheck className="w-4 h-4 text-sand-700 shrink-0" />
            <span>
              Unsure about fit? Every pair comes with a <strong>7-Day Free Doorstep Size Exchange</strong> guarantee.
            </span>
          </div>

          <div className="pt-2 text-right">
            <Button variant="primary" size="sm" onClick={onClose}>
              Got It
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
