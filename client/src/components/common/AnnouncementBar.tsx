import React, { useState } from 'react';
import { Truck, ShieldCheck, Sparkles, Copy, Check } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { toast } from '@/store/useToastStore';

export const AnnouncementBar: React.FC = () => {
  const { announcement, returnWindowDays } = useSettingsStore((s) => s.settings);
  const [copied, setCopied] = useState(false);

  // "{code}" in the message becomes the highlighted coupon code
  const [before, after] = announcement.message.split('{code}');

  const copyCoupon = () => {
    if (!announcement.code) return;
    navigator.clipboard.writeText(announcement.code);
    setCopied(true);
    toast.success(`Privilege Code "${announcement.code}" copied to clipboard!`);
    setTimeout(() => setCopied(false), 2500);
  };

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
                <button
                  type="button"
                  onClick={copyCoupon}
                  className="inline-flex items-center gap-1 font-semibold text-white tracking-widest bg-charcoal-800 hover:bg-sand-500 hover:text-charcoal-950 px-2 py-0.5 rounded-xs transition-colors ml-1 cursor-pointer select-none"
                  title="Click to copy coupon code"
                  aria-label={`Copy privilege code ${announcement.code}`}
                >
                  <span>{announcement.code}</span>
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-sand-400" />
                  )}
                </button>
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
