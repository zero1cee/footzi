import React, { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { formatINR } from '@/lib/utils';

interface Suggestion {
  id: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  category: string;
}

interface Props {
  /** Called after the visitor picks a result or closes the box. */
  onDone: () => void;
}

/** Search box with type-ahead, built as an accessible combobox: arrow keys, Enter and Escape all work. */
export const SearchSuggest: React.FC<Props> = ({ onDone }) => {
  const navigate = useNavigate();
  const listId = useId();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const [searched, setSearched] = useState(false);
  const abort = useRef<AbortController | null>(null);

  // Ask the server a moment after the visitor stops typing; a newer question cancels an older one
  useEffect(() => {
    const term = query.trim();
    abort.current?.abort();
    setActive(-1);
    if (term.length < 2) {
      setItems([]);
      setOpen(false);
      setSearched(false);
      return;
    }

    const controller = new AbortController();
    abort.current = controller;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/suggest?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        if (!res.ok) throw new Error('suggestions unavailable');
        const body = await res.json();
        setItems(Array.isArray(body.suggestions) ? body.suggestions : []);
        setSearched(true);
        setOpen(true);
      } catch (err: any) {
        // An unavailable server simply means no suggestions; the Search button still works
        if (err?.name !== 'AbortError') {
          setItems([]);
          setOpen(false);
        }
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const openProduct = (item: Suggestion) => {
    navigate(`/product/${item.slug}`);
    onDone();
  };

  const submitSearch = () => {
    if (!query.trim()) return;
    navigate(`/shop?search=${encodeURIComponent(query.trim())}`);
    onDone();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && items.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp' && items.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === 'Enter' && open && active >= 0) {
      e.preventDefault();
      openProduct(items[active]);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      if (open) setOpen(false);
      else onDone();
    }
  };

  const status = !searched ? '' : items.length === 0 ? `No styles match "${query.trim()}"` : `${items.length} suggestion${items.length === 1 ? '' : 's'} available`;

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        submitSearch();
      }}
      className="mt-3 pt-3 border-t border-ivory-300 flex items-center gap-2 animate-fade-in"
    >
      <div className="relative flex-1">
        <input
          type="text"
          role="combobox"
          aria-label="Search footwear"
          aria-autocomplete="list"
          aria-expanded={open && items.length > 0}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder="Search by model or style, e.g. Penny Loafer, Chelsea…"
          className="w-full bg-white border border-ivory-300 px-4 py-3 pl-10 text-xs text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:border-charcoal-800 rounded-xs"
        />
        <Search className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-3.5" aria-hidden="true" />

        {open && items.length > 0 && (
          <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-ivory-300 shadow-xl rounded-xs overflow-hidden">
            <ul id={listId} role="listbox" aria-label="Suggested styles">
              {items.map((item, index) => (
                <li
                  key={item.id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  // mousedown keeps focus in the input, so the click is not lost to the blur handler
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => openProduct(item)}
                  onMouseEnter={() => setActive(index)}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer ${index === active ? 'bg-ivory-200' : 'hover:bg-ivory-100'}`}
                >
                  <img src={item.image} alt="" loading="lazy" decoding="async" className="w-10 h-10 object-cover rounded-xs border border-ivory-300 shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-semibold text-charcoal-900 truncate">{item.name}</span>
                    <span className="block text-[11px] text-charcoal-500">{item.category}</span>
                  </span>
                  <span className="text-xs font-semibold text-charcoal-900">{formatINR(item.price)}</span>
                </li>
              ))}
            </ul>
            {/* Outside the listbox, which may only contain options */}
            <button
              type="submit"
              onMouseDown={(e) => e.preventDefault()}
              className="w-full text-left px-3 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-sand-700 hover:bg-ivory-100 border-t border-ivory-200"
            >
              See all results for "{query.trim()}"
            </button>
          </div>
        )}
        <div role="status" aria-live="polite" className="sr-only">
          {status}
        </div>
      </div>
      <button
        type="submit"
        className="px-4 py-3 bg-charcoal-900 text-ivory-50 text-xs uppercase tracking-wider font-medium rounded-xs hover:bg-charcoal-800"
      >
        Search
      </button>
      <button type="button" onClick={onDone} aria-label="Close search" className="p-3 text-charcoal-500 hover:text-charcoal-800">
        <X className="w-4 h-4" />
      </button>
    </form>
  );
};
