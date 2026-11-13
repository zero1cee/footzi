import React from 'react';

export interface BarPoint {
  label: string;
  value: number;
}

interface Props {
  data: BarPoint[];
  /** Describes what the bars show, for the chart's accessible name. */
  title: string;
  format: (value: number) => string;
  height?: number;
}

const W = 640;
const PAD = { top: 12, right: 8, bottom: 26, left: 56 };

/** Rounds the top of the scale to a friendly number so the gridlines read as 0, 5k, 10k and so on. */
const niceMax = (max: number): number => {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  const n = max / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
};

/**
 * A small bar chart drawn as SVG, with no charting library to download. It is labelled for screen readers
 * and every bar carries its own value as a tooltip; the page also offers the same numbers as a table.
 */
export const BarChart: React.FC<Props> = ({ data, title, format, height = 220 }) => {
  const H = height;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const top = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const slot = data.length > 0 ? innerW / data.length : innerW;
  const barW = Math.max(1, slot * 0.7);
  const ticks = [0, 0.5, 1].map((f) => top * f);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const best = data.reduce((a, b) => (b.value > a.value ? b : a), data[0] ?? { label: '', value: 0 });
  const description = data.length === 0 ? 'No data.' : `${format(total)} in total across ${data.length} bars. Highest: ${best.label}, ${format(best.value)}.`;
  const every = Math.max(1, Math.ceil(data.length / 6));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}. ${description}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {ticks.map((t) => {
        const y = PAD.top + innerH - (t / top) * innerH;
        return (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="currentColor" strokeOpacity={0.12} />
            <text x={PAD.left - 6} y={y + 3} textAnchor="end" fontSize="10" fill="currentColor" fillOpacity={0.6}>
              {format(t)}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const h = (d.value / top) * innerH;
        const x = PAD.left + i * slot + (slot - barW) / 2;
        return (
          <g key={`${d.label}-${i}`}>
            <rect x={x} y={PAD.top + innerH - h} width={barW} height={Math.max(h, d.value > 0 ? 1 : 0)} rx={1} className="fill-sand-500">
              <title>{`${d.label}: ${format(d.value)}`}</title>
            </rect>
            {i % every === 0 && (
              <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity={0.6}>
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};
