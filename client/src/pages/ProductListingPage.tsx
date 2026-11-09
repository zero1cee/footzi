import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  SlidersHorizontal,
  ArrowUpDown,
  X,
  Filter,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { ProductCard } from '@/components/ui/ProductCard';
import { ShoeSize } from '@/types';
import { Button } from '@/components/ui/Button';

const CATEGORIES = ['All', 'Loafers', 'Sneakers', 'Oxfords', 'Boots', 'Slip-ons'];
const BRANDS = ['All', 'Footzi Atelier', 'Footzi Studio', 'Footzi Performance'];
const SIZES: ShoeSize[] = ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'];

const COLOR_FILTERS = [
  { name: 'Vintage Tan', hex: '#8C4E28' },
  { name: 'Imperial Onyx', hex: '#1C1C1C' },
  { name: 'Warm Chalk', hex: '#FAF7F0' },
  { name: 'Cognac Amber', hex: '#8C3D15' },
  { name: 'Desert Camel', hex: '#A37C4C' },
  { name: 'Sand Beige', hex: '#D8C7B0' },
];

export const ProductListingPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const selectedCategory = searchParams.get('category') || 'All';
  const selectedBrand = searchParams.get('brand') || 'All';
  const searchQuery = searchParams.get('search') || '';
  const selectedBadge = searchParams.get('badge') || '';
  const sortBy = (searchParams.get('sort') as any) || 'featured';
  const selectedSize = (searchParams.get('size') as ShoeSize) || undefined;
  const selectedColor = searchParams.get('color') || undefined;
  const inStockOnly = searchParams.get('inStockOnly') === 'true';
  const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
  const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
  const currentPage = Number(searchParams.get('page')) || 1;

  // React Query Hook
  const { data, isLoading } = useProducts({
    category: selectedCategory,
    brand: selectedBrand,
    search: searchQuery,
    badge: selectedBadge,
    size: selectedSize,
    color: selectedColor,
    minPrice,
    maxPrice,
    inStockOnly,
    sort: sortBy,
    page: currentPage,
    limit: 6, // 6 items per page for clean pagination demonstration
  });

  const products = data?.products || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const updateParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(searchParams);
    if (value === undefined || value === 'All' || value === '') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    next.set('page', '1'); // reset page on filter change
    setSearchParams(next);
  };

  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', newPage.toString());
    setSearchParams(next);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const hasActiveFilters =
    selectedCategory !== 'All' ||
    selectedBrand !== 'All' ||
    searchQuery ||
    selectedBadge ||
    selectedSize ||
    selectedColor ||
    inStockOnly ||
    minPrice !== undefined ||
    maxPrice !== undefined ||
    sortBy !== 'featured';

  return (
    <div className="py-8 md:py-12 bg-ivory-100 min-h-[85vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb & Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-charcoal-400 mb-2">
            <Link to="/" className="hover:text-charcoal-900 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-charcoal-800 font-semibold">Footwear Catalog</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-widest text-sand-600 font-bold bg-sand-100 px-2 py-0.5 rounded-xs">
                  Agra Atelier Sourced
                </span>
                <span className="text-xs text-charcoal-500">
                  Showing {products.length} of {total} silhouettes
                </span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-medium text-charcoal-950">
                {selectedCategory !== 'All' ? `${selectedCategory} Collection` : 'All Handcrafted Footwear'}
              </h1>
            </div>

            {/* Mobile Filter Toggle & Sort Dropdown */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-2 bg-white border border-ivory-300 text-xs font-medium text-charcoal-800 rounded-xs shadow-sm"
              >
                <Filter className="w-3.5 h-3.5" /> Filters
              </button>

              <div className="flex items-center gap-2 bg-white border border-ivory-300 px-3 py-1.5 rounded-xs shadow-sm">
                <ArrowUpDown className="w-3.5 h-3.5 text-charcoal-400" />
                <span className="text-[11px] uppercase tracking-wider text-charcoal-500 hidden sm:inline">
                  Sort:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => updateParam('sort', e.target.value)}
                  aria-label="Sort products"
                  className="bg-transparent text-xs font-medium text-charcoal-900 focus:outline-none cursor-pointer"
                >
                  <option value="featured">Featured Edit</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="newest">Newest Releases</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Filter Badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-ivory-200">
              <span className="text-[11px] uppercase tracking-wider text-charcoal-500">Active Filters:</span>
              {selectedCategory !== 'All' && (
                <span className="inline-flex items-center gap-1 text-xs bg-white border border-ivory-300 px-2.5 py-0.5 rounded-xs">
                  Category: {selectedCategory}
                  <X className="w-3 h-3 cursor-pointer text-charcoal-400 hover:text-charcoal-800" onClick={() => updateParam('category', 'All')} />
                </span>
              )}
              {selectedBrand !== 'All' && (
                <span className="inline-flex items-center gap-1 text-xs bg-white border border-ivory-300 px-2.5 py-0.5 rounded-xs">
                  Brand: {selectedBrand}
                  <X className="w-3 h-3 cursor-pointer text-charcoal-400 hover:text-charcoal-800" onClick={() => updateParam('brand', 'All')} />
                </span>
              )}
              {selectedSize && (
                <span className="inline-flex items-center gap-1 text-xs bg-white border border-ivory-300 px-2.5 py-0.5 rounded-xs">
                  Size: {selectedSize}
                  <X className="w-3 h-3 cursor-pointer text-charcoal-400 hover:text-charcoal-800" onClick={() => updateParam('size', undefined)} />
                </span>
              )}
              {selectedColor && (
                <span className="inline-flex items-center gap-1 text-xs bg-white border border-ivory-300 px-2.5 py-0.5 rounded-xs">
                  Shade: {selectedColor}
                  <X className="w-3 h-3 cursor-pointer text-charcoal-400 hover:text-charcoal-800" onClick={() => updateParam('color', undefined)} />
                </span>
              )}
              {inStockOnly && (
                <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-0.5 rounded-xs">
                  In Stock Only
                  <X className="w-3 h-3 cursor-pointer text-emerald-600 hover:text-emerald-900" onClick={() => updateParam('inStockOnly', undefined)} />
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1 text-xs bg-white border border-ivory-300 px-2.5 py-0.5 rounded-xs">
                  Search: "{searchQuery}"
                  <X className="w-3 h-3 cursor-pointer text-charcoal-400 hover:text-charcoal-800" onClick={() => updateParam('search', undefined)} />
                </span>
              )}
              <button
                onClick={clearAllFilters}
                className="text-[11px] text-red-600 underline hover:text-red-800 ml-2"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block lg:col-span-1 space-y-6">
            
            {/* Silhouettes / Categories */}
            <div className="bg-white p-5 rounded-xs border border-ivory-200 shadow-sm">
              <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-charcoal-900 mb-3">
                Silhouettes
              </h3>
              <div className="space-y-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => updateParam('category', cat)}
                    className={`w-full text-left text-xs py-2 px-2.5 rounded-xs flex items-center justify-between transition-colors ${
                      selectedCategory === cat
                        ? 'bg-charcoal-900 text-white font-medium'
                        : 'text-charcoal-600 hover:bg-ivory-100 hover:text-charcoal-900'
                    }`}
                  >
                    <span>{cat}</span>
                    {selectedCategory === cat && <Check className="w-3 h-3 text-sand-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Indian Shoe Size Filter (UK) */}
            <div className="bg-white p-5 rounded-xs border border-ivory-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-charcoal-900">
                  Size (India / UK)
                </h3>
                {selectedSize && (
                  <button
                    onClick={() => updateParam('size', undefined)}
                    className="text-[10px] text-sand-600 underline"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {SIZES.map((size) => (
                  <button
                    key={size}
                    onClick={() => updateParam('size', selectedSize === size ? undefined : size)}
                    className={`py-2 text-xs font-semibold rounded-xs border transition-all ${
                      selectedSize === size
                        ? 'bg-charcoal-900 text-white border-charcoal-900'
                        : 'bg-ivory-50 text-charcoal-700 border-ivory-300 hover:border-charcoal-700'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Leather Shades & Colorways */}
            <div className="bg-white p-5 rounded-xs border border-ivory-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-charcoal-900">
                  Leather Shades
                </h3>
                {selectedColor && (
                  <button
                    onClick={() => updateParam('color', undefined)}
                    className="text-[10px] text-sand-600 underline"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                {COLOR_FILTERS.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => updateParam('color', selectedColor === c.name ? undefined : c.name)}
                    className={`w-full text-left text-xs py-1.5 px-2 rounded-xs flex items-center justify-between transition-colors ${
                      selectedColor === c.name
                        ? 'bg-ivory-200 text-charcoal-950 font-semibold'
                        : 'text-charcoal-600 hover:bg-ivory-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-charcoal-300"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span>{c.name}</span>
                    </div>
                    {selectedColor === c.name && <Check className="w-3 h-3 text-sand-600" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range Filter */}
            <div className="bg-white p-5 rounded-xs border border-ivory-200 shadow-sm">
              <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-charcoal-900 mb-3">
                Price Range
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min ₹"
                    value={minPrice || ''}
                    onChange={(e) => updateParam('minPrice', e.target.value ? e.target.value : undefined)}
                    className="w-1/2 bg-ivory-50 border border-ivory-300 p-2 text-xs rounded-xs focus:outline-none focus:border-charcoal-900"
                  />
                  <span className="text-charcoal-400">–</span>
                  <input
                    type="number"
                    placeholder="Max ₹"
                    value={maxPrice || ''}
                    onChange={(e) => updateParam('maxPrice', e.target.value ? e.target.value : undefined)}
                    className="w-1/2 bg-ivory-50 border border-ivory-300 p-2 text-xs rounded-xs focus:outline-none focus:border-charcoal-900"
                  />
                </div>
                <div className="flex justify-between text-[11px] text-charcoal-500 pt-1">
                  <span>₹2,499</span>
                  <span>₹5,500+</span>
                </div>
              </div>
            </div>

            {/* Brand / Atelier Line */}
            <div className="bg-white p-5 rounded-xs border border-ivory-200 shadow-sm">
              <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-charcoal-900 mb-3">
                Footzi Line
              </h3>
              <div className="space-y-1">
                {BRANDS.map((b) => (
                  <button
                    key={b}
                    onClick={() => updateParam('brand', b)}
                    className={`w-full text-left text-xs py-1.5 px-2 rounded-xs flex items-center justify-between transition-colors ${
                      selectedBrand === b
                        ? 'bg-ivory-200 text-charcoal-950 font-semibold'
                        : 'text-charcoal-600 hover:bg-ivory-100'
                    }`}
                  >
                    <span>{b}</span>
                    {selectedBrand === b && <Check className="w-3 h-3 text-sand-600" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Availability Toggle */}
            <div className="bg-white p-4 rounded-xs border border-ivory-200 shadow-sm flex items-center justify-between">
              <span className="text-xs font-medium text-charcoal-800">In-Stock Only</span>
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => updateParam('inStockOnly', e.target.checked ? 'true' : undefined)}
                className="w-4 h-4 rounded text-charcoal-900 focus:ring-sand-400 cursor-pointer"
              />
            </div>

          </aside>

          {/* Product Grid Area */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="aspect-[4/5] bg-ivory-200 animate-pulse rounded-xs" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white border border-ivory-200 rounded-xs p-12 text-center space-y-4 shadow-sm">
                <SlidersHorizontal className="w-10 h-10 text-charcoal-400 mx-auto" />
                <h3 className="font-serif text-xl font-medium text-charcoal-900">
                  No footwear matched your exact criteria
                </h3>
                <p className="text-xs text-charcoal-500 max-w-sm mx-auto leading-relaxed">
                  Try broadening your price range or clearing selected shoe sizes and leather shades.
                </p>
                <Button variant="primary" size="md" onClick={clearAllFilters}>
                  Reset All Filters
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-12 pt-6 border-t border-ivory-200 flex items-center justify-between">
                    <p className="text-xs text-charcoal-500">
                      Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                    </p>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="p-2 border border-ivory-300 bg-white rounded-xs text-charcoal-700 hover:bg-ivory-200 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      {[...Array(totalPages)].map((_, idx) => {
                        const pageNum = idx + 1;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`w-8 h-8 text-xs font-semibold rounded-xs border transition-all ${
                              currentPage === pageNum
                                ? 'bg-charcoal-900 text-white border-charcoal-900'
                                : 'bg-white text-charcoal-800 border-ivory-300 hover:border-charcoal-700'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        className="p-2 border border-ivory-300 bg-white rounded-xs text-charcoal-700 hover:bg-ivory-200 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                        aria-label="Next page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>

      {/* Mobile Filter Sliding Overlay */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden lg:hidden">
          <div className="absolute inset-0 bg-charcoal-950/60 backdrop-blur-sm" onClick={() => setMobileFilterOpen(false)} />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-xs bg-ivory-50 p-6 flex flex-col justify-between shadow-2xl">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-ivory-300">
                  <h3 className="font-serif text-lg font-medium text-charcoal-950">Refine Catalog</h3>
                  <button onClick={() => setMobileFilterOpen(false)}><X className="w-5 h-5 text-charcoal-600" /></button>
                </div>

                <div className="py-4 space-y-6 overflow-y-auto max-h-[75vh]">
                  {/* Category */}
                  <div>
                    <h4 className="text-xs uppercase font-semibold text-charcoal-800 mb-2">Silhouettes</h4>
                    <div className="space-y-1">
                      {CATEGORIES.map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            updateParam('category', c);
                            setMobileFilterOpen(false);
                          }}
                          className={`w-full text-left text-xs py-1.5 px-2 rounded-xs ${
                            selectedCategory === c ? 'bg-charcoal-900 text-white' : 'text-charcoal-700'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Size */}
                  <div>
                    <h4 className="text-xs uppercase font-semibold text-charcoal-800 mb-2">Indian Size (UK)</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {SIZES.map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            updateParam('size', selectedSize === s ? undefined : s);
                            setMobileFilterOpen(false);
                          }}
                          className={`py-1.5 text-xs font-semibold rounded-xs border ${
                            selectedSize === s ? 'bg-charcoal-900 text-white' : 'bg-white text-charcoal-800'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <Button variant="primary" size="md" className="w-full" onClick={() => setMobileFilterOpen(false)}>
                Show {total} Results
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
