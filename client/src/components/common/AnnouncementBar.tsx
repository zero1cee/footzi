import React from 'react';
import { Truck, ShieldCheck, Sparkles } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';

export const AnnouncementBar: React.FC = () => {
  const { announcement, returnWindowDays } = useSettingsStore((s) => s.settings);

  // "{code}" in the message becomes the highlighted coupon code
  const [before, after] = announcement.message.split('{code}');

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
            {returnWindowDays}-Day Seamless Size Exchanges
          </span>
        </div>

        <div className="flex-1 md:flex-initial text-center text-xs tracking-wider font-light">
          {announcement.enabled && (
            <>
              {announcement.label && <span className="text-sand-300 font-medium mr-1.5">{announcement.label}</span>}
              {before}
              {after !== undefined && announcement.code && (
                <span className="font-semibold text-white tracking-widest bg-charcoal-800 px-1.5 py-0.5 rounded-xs">{announcement.code}</span>
              )}
              {after}
            </>
          )}
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
