import React from 'react';
import { Link } from 'react-router-dom';
import { formatINR } from '@/lib/utils';
import { useRecentStore } from '@/store/useRecentStore';

/** A row of styles the visitor looked at before this one. Renders nothing until there is something to show. */
export const RecentlyViewed: React.FC<{ excludeId?: string }> = ({ excludeId }) => {
  const items = useRecentStore((s) => s.items).filter((i) => i.id !== excludeId).slice(0, 4);
  const clear = useRecentStore((s) => s.clear);
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="recently-viewed-heading" className="mt-16 pt-10 border-t border-ivory-300">
      <div className="flex items-end justify-between mb-5">
        <h2 id="recently-viewed-heading" className="font-serif text-2xl font-medium text-charcoal-950">
          Recently viewed
        </h2>
        <button onClick={clear} className="text-[11px] text-charcoal-500 underline hover:text-charcoal-900 py-2">
          Clear
        </button>
      </div>
      <ul className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((item) => (
          <li key={item.id}>
            <Link to={`/product/${item.slug}`} className="group block">
              <div className="aspect-[4/5] overflow-hidden rounded-xs bg-ivory-200 border border-ivory-300">
                <img
                  src={item.image}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <p className="mt-2 text-xs font-semibold text-charcoal-900 line-clamp-1">{item.name}</p>
              <p className="text-xs text-charcoal-600">{formatINR(item.price)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};
