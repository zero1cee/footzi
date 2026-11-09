import React from 'react';
import { Truck, ShieldCheck, Sparkles } from 'lucide-react';

export const AnnouncementBar: React.FC = () => {
  return (
    <div className="bg-charcoal-950 text-ivory-100 text-[11px] py-2 px-4 border-b border-charcoal-800">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="hidden md:flex items-center gap-4 text-charcoal-400">
          <span className="flex items-center gap-1.5">
            <Truck className="w-3 h-3 text-sand-400" />
            Pan-India Express Delivery
          </span>
          <span className="text-charcoal-700">•</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-sand-400" />
            7-Day Seamless Size Exchanges
          </span>
        </div>

        <div className="flex-1 md:flex-initial text-center text-xs tracking-wider font-light">
          <span className="text-sand-300 font-medium mr-1.5">Festive Privilege:</span>
          Use code <span className="font-semibold text-white tracking-widest bg-charcoal-800 px-1.5 py-0.5 rounded-xs">AGRAFIRST</span> for 15% off first order
        </div>

        <div className="hidden lg:flex items-center gap-4 text-charcoal-400 text-[11px]">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-sand-400" />
            Agra Master Shoemakers
          </span>
          <span className="text-charcoal-700">•</span>
          <span className="text-ivory-300 font-medium">₹ INR</span>
        </div>
      </div>
    </div>
  );
};
