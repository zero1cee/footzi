import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Truck,
  Package,
  ShieldCheck,
  Copy,
  ExternalLink,
  MapPin,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

export interface OrderTrackingProps {
  orderStatus: string;
  paymentStatus: string;
  trackingNumber?: string;
  carrier?: string;
  destinationCity?: string;
  createdAt?: string;
}

interface Step {
  id: string;
  title: string;
  subtitle: string;
  location: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const OrderTrackingStepper: React.FC<OrderTrackingProps> = ({
  orderStatus,
  paymentStatus,
  trackingNumber,
  carrier = 'Delhivery Express',
  destinationCity = 'Destination',
  createdAt,
}) => {
  const [copied, setCopied] = useState(false);

  const copyTracking = () => {
    if (!trackingNumber) return;
    navigator.clipboard.writeText(trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const isCancelled = orderStatus === 'cancelled';

  // Determine stage progression (0 to 4)
  const getActiveStepIndex = (): number => {
    if (orderStatus === 'delivered') return 4;
    if (orderStatus === 'shipped') return 3;
    if (orderStatus === 'processing') return 2;
    if (orderStatus === 'confirmed' || paymentStatus === 'paid') return 1;
    return 0; // pending_payment
  };

  const activeIndex = getActiveStepIndex();

  const steps: Step[] = [
    {
      id: 'placed',
      title: 'Order Placed',
      subtitle: createdAt
        ? `Logged at Taj Crafts Enclave • ${new Date(createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
        : 'Verified & logged at Taj Crafts Enclave',
      location: 'Agra Atelier Privé',
      icon: Sparkles,
    },
    {
      id: 'confirmed',
      title: 'Guild Accepted',
      subtitle: 'Full-grain certified leather hide allocated',
      location: 'Agra Master Shoemaker Guild',
      icon: CheckCircle2,
    },
    {
      id: 'crafting',
      title: 'Artisan Hand-Crafting',
      subtitle: 'Blake-stitch sole & bespoke lasting in progress',
      location: 'Agra Workshop Station',
      icon: ShieldCheck,
    },
    {
      id: 'dispatched',
      title: 'Dispatched via Delhivery',
      subtitle: 'Waybill scanned and routed through express logistics',
      location: 'Delhivery Agra Logistics Hub',
      icon: Truck,
    },
    {
      id: 'delivered',
      title: 'Doorstep Handover',
      subtitle: 'Delivered in signature debossed footwear box',
      location: `${destinationCity} Hub`,
      icon: Package,
    },
  ];

  if (isCancelled) {
    return (
      <div className="p-4 bg-red-50/70 border border-red-200 rounded-xs space-y-2">
        <div className="flex items-center gap-2 text-red-800 font-semibold text-xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>Order Cancelled</span>
        </div>
        <p className="text-xs text-red-700 leading-relaxed">
          This order was cancelled. Any debited amount has been released and initiated back to your original payment method.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Delhivery Express AWB Tracking Header Card */}
      {trackingNumber && (
        <div className="p-4 bg-ivory-100/90 border border-ivory-300 rounded-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ivory-300/80 pb-3">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-sand-700 block">
                Primary Logistics Partner
              </span>
              <p className="text-sm font-serif font-medium text-charcoal-900 flex items-center gap-1.5 mt-0.5">
                <Truck className="w-4 h-4 text-sand-600" /> {carrier}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase tracking-wider font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-xs">
                Live Waybill
              </span>
              <span className="text-[9px] uppercase tracking-wider font-bold bg-sand-100 text-sand-800 border border-sand-300 px-2 py-0.5 rounded-xs">
                Express Air / Surface
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[11px] text-charcoal-500 block">Delhivery Waybill (AWB):</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-xs font-bold text-charcoal-950 bg-white px-2 py-1 rounded-xs border border-ivory-300">
                  {trackingNumber}
                </span>
                <button
                  type="button"
                  onClick={copyTracking}
                  aria-label="Copy Delhivery Waybill"
                  className="p-1.5 bg-white hover:bg-ivory-200 border border-ivory-300 rounded-xs text-charcoal-700 transition-colors"
                  title="Copy Waybill"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                {copied && <span className="text-[10px] text-emerald-600 font-medium">Copied!</span>}
              </div>
            </div>

            <a
              href={`https://www.delhivery.com/track/package/${encodeURIComponent(trackingNumber)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-charcoal-900 hover:bg-charcoal-800 text-white text-[11px] font-medium rounded-xs flex items-center gap-1.5 transition-colors self-end"
            >
              <span>Track on Delhivery.com</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <p className="text-[10px] text-charcoal-500 font-light flex items-center gap-1 pt-1 border-t border-ivory-200">
            <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
            Tamper-evident seal & OTP-verified doorstep handover on arrival.
          </p>
        </div>
      )}

      {/* Luxury Milestone Progress Track */}
      <div>
        <h3 className="text-[11px] uppercase tracking-widest font-bold text-charcoal-700 mb-4 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-sand-600" />
          Atelier Crafting & Logistics Milestones
        </h3>

        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-ivory-300">
          {steps.map((step, idx) => {
            const isCompleted = idx < activeIndex;
            const isCurrent = idx === activeIndex;
            const StepIcon = step.icon;

            return (
              <div key={step.id} className="relative group">
                {/* Node icon / indicator */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? 'bg-emerald-600 text-white border-2 border-emerald-600 shadow-xs'
                      : isCurrent
                        ? 'bg-charcoal-900 text-sand-300 ring-4 ring-sand-200 border-2 border-charcoal-900'
                        : 'bg-white text-charcoal-400 border-2 border-ivory-300'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <StepIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  )}
                </div>

                {/* Content */}
                <div className={`text-xs pl-2.5 ${isCurrent ? 'opacity-100' : isCompleted ? 'opacity-90' : 'opacity-50'}`}>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <p className={`font-semibold ${isCurrent ? 'text-charcoal-950 font-serif text-sm' : 'text-charcoal-800'}`}>
                      {step.title}
                    </p>
                    {isCurrent && (
                      <span className="text-[9px] uppercase tracking-wider font-bold bg-sand-200 text-sand-900 px-1.5 py-0.2 rounded-xs">
                        Current Status
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-charcoal-600 mt-0.5">{step.subtitle}</p>

                  <p className="text-[10px] text-charcoal-400 flex items-center gap-1 mt-1">
                    <MapPin className="w-2.5 h-2.5 text-sand-500" />
                    <span>{step.location}</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
