import React, { useEffect, useMemo, useState } from 'react';
import { adminService } from '@/services/adminService';
import { formatINR } from '@/lib/utils';
import { BarChart, BarPoint } from '@/components/admin/BarChart';

const PERIODS = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '1 year' },
];

const compact = (n: number): string =>
  n >= 10_000_000 ? `₹${(n / 10_000_000).toFixed(1)}Cr` : n >= 100_000 ? `₹${(n / 100_000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : `₹${Math.round(n)}`;

const shortDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

interface Props {
  token: string;
}

export const SalesPanel: React.FC<Props> = ({ token }) => {
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    let active = true;
    setError(null);
    adminService
      .getSalesReport(days, token)
      .then((data) => active && setReport(data))
      .catch((err) => active && setError(err.message || 'Could not load the report'));
    return () => {
      active = false;
    };
  }, [days, token]);

  // A year of daily bars is unreadable, so long periods are shown a week at a time
  const points: BarPoint[] = useMemo(() => {
    if (!report) return [];
    const series: { date: string; revenue: number }[] = report.series;
    if (series.length <= 90) return series.map((d) => ({ label: shortDate(d.date), value: d.revenue }));
    const weeks: BarPoint[] = [];
    for (let i = 0; i < series.length; i += 7) {
      const chunk = series.slice(i, i + 7);
      weeks.push({ label: shortDate(chunk[0].date), value: chunk.reduce((sum, d) => sum + d.revenue, 0) });
    }
    return weeks;
  }, [report]);

  const tile = (label: string, value: string, hint?: string) => (
    <div className="bg-ivory-50 border border-ivory-200 rounded-xs p-4">
      <p className="text-[10px] uppercase tracking-widest font-bold text-charcoal-500">{label}</p>
      <p className="font-serif text-2xl font-medium text-charcoal-950 mt-1">{value}</p>
      {hint && <p className="text-[11px] text-charcoal-500 mt-0.5">{hint}</p>}
    </div>
  );

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xs border border-ivory-200 shadow-sm space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ivory-200 pb-4">
        <div>
          <h3 className="font-serif text-xl font-medium text-charcoal-950">Sales</h3>
          <p className="text-xs text-charcoal-500 mt-0.5">Money kept: what customers paid, minus refunds. Days follow Indian time.</p>
        </div>
        <div role="group" aria-label="Period" className="flex gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              aria-pressed={days === p.days}
              className={`px-3 py-2 text-[11px] uppercase tracking-wider font-semibold rounded-xs border ${
                days === p.days ? 'bg-charcoal-900 text-ivory-50 border-charcoal-900' : 'bg-white text-charcoal-700 border-ivory-300 hover:border-charcoal-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xs">
          {error}
        </div>
      )}
      {!report && !error && <p role="status" className="text-xs text-charcoal-500 py-10 text-center">Loading the report…</p>}

      {report && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {tile('Revenue kept', formatINR(report.totals.revenue), `${formatINR(report.totals.refunded)} refunded`)}
            {tile('Paid orders', String(report.totals.orders))}
            {tile('Average order', formatINR(report.totals.averageOrderValue), 'before refunds')}
            {tile('Paid of started', `${report.funnel.conversionPercent}%`, `${report.funnel.paid} of ${report.funnel.started} · ${report.funnel.abandoned} abandoned · ${report.funnel.guestOrders} guest`)}
          </div>

          <figure className="text-charcoal-700">
            <figcaption className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-widest font-bold text-charcoal-700">
                Revenue {report.series.length > 90 ? 'by week' : 'by day'}
              </span>
              <button onClick={() => setShowTable((v) => !v)} aria-expanded={showTable} className="text-[11px] font-semibold text-charcoal-800 underline py-2">
                {showTable ? 'Hide table' : 'View as table'}
              </button>
            </figcaption>
            <BarChart data={points} title={`Revenue kept over the last ${days} days`} format={compact} />
            {showTable && (
              <div className="mt-3 max-h-64 overflow-auto border border-ivory-200 rounded-xs">
                <table className="w-full text-xs">
                  <caption className="sr-only">Revenue kept per {report.series.length > 90 ? 'week' : 'day'}</caption>
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-charcoal-500 border-b border-ivory-200">
                      <th scope="col" className="p-2">{report.series.length > 90 ? 'Week of' : 'Day'}</th>
                      <th scope="col" className="p-2 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ivory-100">
                    {points.map((p, i) => (
                      <tr key={`${p.label}-${i}`}>
                        <th scope="row" className="p-2 text-left font-normal">{p.label}</th>
                        <td className="p-2 text-right">{formatINR(p.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </figure>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section aria-labelledby="top-products">
              <h4 id="top-products" className="text-[11px] uppercase tracking-widest font-bold text-charcoal-700 mb-2">Best sellers</h4>
              {report.topProducts.length === 0 ? (
                <p className="text-xs text-charcoal-500">No sales in this period.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-charcoal-500 border-b border-ivory-200">
                      <th scope="col" className="py-2 pr-2">Style</th>
                      <th scope="col" className="py-2 px-2 text-right">Pairs</th>
                      <th scope="col" className="py-2 pl-2 text-right">Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ivory-100">
                    {report.topProducts.map((p: any) => (
                      <tr key={`${p.productId}-${p.name}`}>
                        <td className="py-2 pr-2 font-medium text-charcoal-900">{p.name}</td>
                        <td className="py-2 px-2 text-right">{p.units}</td>
                        <td className="py-2 pl-2 text-right">{formatINR(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section aria-labelledby="coupon-results">
              <h4 id="coupon-results" className="text-[11px] uppercase tracking-widest font-bold text-charcoal-700 mb-2">Coupons</h4>
              {report.coupons.length === 0 ? (
                <p className="text-xs text-charcoal-500">No coupons were used in this period.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-charcoal-500 border-b border-ivory-200">
                      <th scope="col" className="py-2 pr-2">Code</th>
                      <th scope="col" className="py-2 px-2 text-right">Uses</th>
                      <th scope="col" className="py-2 px-2 text-right">Discount given</th>
                      <th scope="col" className="py-2 pl-2 text-right">Order value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ivory-100">
                    {report.coupons.map((c: any) => (
                      <tr key={c.code}>
                        <td className="py-2 pr-2 font-mono font-bold text-charcoal-900">{c.code}</td>
                        <td className="py-2 px-2 text-right">{c.uses}</td>
                        <td className="py-2 px-2 text-right">{formatINR(c.discountGiven)}</td>
                        <td className="py-2 pl-2 text-right">{formatINR(c.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
};

