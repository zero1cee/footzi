import React, { useState, useEffect } from 'react';
import { Truck, MapPin, CheckCircle2, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { formatINR } from '@/lib/utils';

export interface PincodeEstimate {
  pincode: string;
  city: string;
  state: string;
  zone: 'Local' | 'NCR/North' | 'Metro Air' | 'Rest of India';
  daysMin: number;
  daysMax: number;
  deliveryDateStr: string;
  isExpress: boolean;
  courier: string;
}

const PINCODE_MAP: { prefix: RegExp; city: string; state: string; zone: PincodeEstimate['zone']; daysMin: number; daysMax: number; isExpress: boolean }[] = [
  { prefix: /^282/, city: 'Agra', state: 'Uttar Pradesh', zone: 'Local', daysMin: 1, daysMax: 1, isExpress: true },
  { prefix: /^(201|202|203|204|281|283)/, city: 'Western UP / Mathura / Aligarh', state: 'Uttar Pradesh', zone: 'Local', daysMin: 1, daysMax: 2, isExpress: true },
  { prefix: /^110/, city: 'Delhi NCR', state: 'Delhi', zone: 'NCR/North', daysMin: 1, daysMax: 2, isExpress: true },
  { prefix: /^(121|122|201301|201302|201303|201304)/, city: 'Gurugram / Noida', state: 'NCR', zone: 'NCR/North', daysMin: 1, daysMax: 2, isExpress: true },
  { prefix: /^(226|208)/, city: 'Lucknow / Kanpur', state: 'Uttar Pradesh', zone: 'NCR/North', daysMin: 1, daysMax: 2, isExpress: true },
  { prefix: /^302/, city: 'Jaipur', state: 'Rajasthan', zone: 'NCR/North', daysMin: 2, daysMax: 3, isExpress: true },
  { prefix: /^160/, city: 'Chandigarh', state: 'Punjab', zone: 'NCR/North', daysMin: 2, daysMax: 3, isExpress: true },
  { prefix: /^(400|401)/, city: 'Mumbai', state: 'Maharashtra', zone: 'Metro Air', daysMin: 2, daysMax: 3, isExpress: true },
  { prefix: /^560/, city: 'Bengaluru', state: 'Karnataka', zone: 'Metro Air', daysMin: 2, daysMax: 3, isExpress: true },
  { prefix: /^500/, city: 'Hyderabad', state: 'Telangana', zone: 'Metro Air', daysMin: 2, daysMax: 3, isExpress: true },
  { prefix: /^600/, city: 'Chennai', state: 'Tamil Nadu', zone: 'Metro Air', daysMin: 3, daysMax: 4, isExpress: true },
  { prefix: /^700/, city: 'Kolkata', state: 'West Bengal', zone: 'Metro Air', daysMin: 3, daysMax: 4, isExpress: true },
  { prefix: /^380/, city: 'Ahmedabad', state: 'Gujarat', zone: 'Metro Air', daysMin: 2, daysMax: 3, isExpress: true },
  { prefix: /^411/, city: 'Pune', state: 'Maharashtra', zone: 'Metro Air', daysMin: 2, daysMax: 3, isExpress: true },
];

export const calculateEstimate = (pincode: string): PincodeEstimate | null => {
  const clean = pincode.trim();
  if (!/^[1-9][0-9]{5}$/.test(clean)) return null;

  const match = PINCODE_MAP.find((m) => m.prefix.test(clean));

  const now = new Date();
  // Cutoff 2:00 PM: orders after 2 PM ship the next day
  const cutoffPassed = now.getHours() >= 14;
  const dispatchDelay = cutoffPassed ? 1 : 0;

  if (match) {
    const arrival = new Date(now);
    arrival.setDate(now.getDate() + match.daysMax + dispatchDelay);
    const dateStr = arrival.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    return {
      pincode: clean,
      city: match.city,
      state: match.state,
      zone: match.zone,
      daysMin: match.daysMin + dispatchDelay,
      daysMax: match.daysMax + dispatchDelay,
      deliveryDateStr: dateStr,
      isExpress: match.isExpress,
      courier: 'Delhivery Express',
    };
  }

  // Broad state resolution from 1st digit for rest of India
  const firstDigit = clean[0];
  let daysMin = 3;
  let daysMax = 5;
  let state = 'India';

  if (firstDigit === '1' || firstDigit === '2') {
    state = 'North India';
    daysMin = 2;
    daysMax = 3;
  } else if (firstDigit === '3' || firstDigit === '4') {
    state = 'West / Central India';
    daysMin = 3;
    daysMax = 4;
  } else if (firstDigit === '5' || firstDigit === '6') {
    state = 'South India';
    daysMin = 3;
    daysMax = 4;
  } else if (firstDigit === '7' || firstDigit === '8') {
    state = 'East / North-East India';
    daysMin = 4;
    daysMax = 5;
  }

  const arrival = new Date(now);
  arrival.setDate(now.getDate() + daysMax + dispatchDelay);
  const dateStr = arrival.toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return {
    pincode: clean,
    city: `${state} Hub`,
    state,
    zone: 'Rest of India',
    daysMin: daysMin + dispatchDelay,
    daysMax: daysMax + dispatchDelay,
    deliveryDateStr: dateStr,
    isExpress: false,
    courier: 'Delhivery Express',
  };
};

export const PincodeEstimator: React.FC = () => {
  const [pincode, setPincode] = useState('');
  const [estimate, setEstimate] = useState<PincodeEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const freeThreshold = useSettingsStore((s) => s.settings.freeShippingThreshold);

  useEffect(() => {
    const saved = localStorage.getItem('footzi_shipping_pincode');
    if (saved && /^[1-9][0-9]{5}$/.test(saved)) {
      setPincode(saved);
      const est = calculateEstimate(saved);
      if (est) setEstimate(est);
    }
  }, []);

  const handleCheck = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    const clean = pincode.trim();

    if (!clean) {
      setError('Please enter a 6-digit PIN code');
      setEstimate(null);
      return;
    }

    if (!/^[1-9][0-9]{5}$/.test(clean)) {
      setError('Please enter a valid 6-digit Indian postal code');
      setEstimate(null);
      return;
    }

    const est = calculateEstimate(clean);
    if (est) {
      setEstimate(est);
      try {
        localStorage.setItem('footzi_shipping_pincode', clean);
      } catch {
        // ignore
      }
    }
  };

  const handleReset = () => {
    setEstimate(null);
    setPincode('');
    try {
      localStorage.removeItem('footzi_shipping_pincode');
    } catch {
      // ignore
    }
  };

  return (
    <div className="bg-white p-4 rounded-xs border border-ivory-300 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider font-bold text-charcoal-800 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-sand-600" />
          Delivery & Atelier Serviceability
        </span>
        {estimate && (
          <button
            type="button"
            onClick={handleReset}
            className="text-[10px] text-sand-600 hover:text-charcoal-900 font-medium underline uppercase tracking-wider"
          >
            Change PIN
          </button>
        )}
      </div>

      {!estimate ? (
        <form onSubmit={handleCheck} className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setPincode(val);
                  if (error) setError(null);
                }}
                placeholder="Enter 6-digit Indian PIN code"
                aria-label="Enter PIN code for delivery estimate"
                className="w-full bg-ivory-50 border border-ivory-300 px-3 py-2 text-xs text-charcoal-900 font-mono tracking-wider rounded-xs focus:outline-none focus:border-charcoal-900"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-charcoal-900 hover:bg-charcoal-800 text-white text-[11px] font-semibold tracking-wider uppercase rounded-xs transition-colors"
            >
              Check
            </button>
          </div>
          {error && (
            <p className="text-[11px] text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" /> {error}
            </p>
          )}
          <p className="text-[10px] text-charcoal-500 font-light">
            Crafted and dispatched directly from Agra, Uttar Pradesh. Same-day dispatch on orders before 2:00 PM.
          </p>
        </form>
      ) : (
        <div className="space-y-2.5 pt-1">
          <div className="p-3 bg-ivory-100/90 rounded-xs border border-ivory-300">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-charcoal-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Estimated Delivery by{' '}
                  <span className="font-bold text-charcoal-950 underline decoration-sand-400">
                    {estimate.deliveryDateStr}
                  </span>
                </p>
                <p className="text-[11px] text-charcoal-600 mt-1">
                  Delivering to <strong className="text-charcoal-800">{estimate.city}</strong> ({estimate.pincode})
                </p>
              </div>
              <span className="text-[9px] uppercase tracking-wider font-bold bg-sand-100 text-sand-800 px-2 py-0.5 rounded-xs border border-sand-300 shrink-0">
                {estimate.zone === 'Local' ? '⚡ 24H Atelier' : estimate.isExpress ? '🚀 Air Express' : 'Standard'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] text-charcoal-600 pt-1">
            <div className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-sand-600 shrink-0" />
              <span>Fulfilled by {estimate.courier}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sand-600 shrink-0" />
              <span>Orders before 2 PM ship today</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-sand-600 shrink-0" />
              <span>{freeThreshold > 0 ? `Free shipping over ${formatINR(freeThreshold)}` : 'Complimentary shipping'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 ml-1" />
              <span className="text-emerald-700 font-medium">Cash on Delivery & Prepaid</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
