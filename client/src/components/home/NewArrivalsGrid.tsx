import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { MOCK_PRODUCTS } from '@/data/mockProducts';
import { ProductCard } from '@/components/ui/ProductCard';
import { Button } from '@/components/ui/Button';

const CATEGORIES = ['All', 'Loafers', 'Sneakers', 'Oxfords', 'Boots'] as const;

export const NewArrivalsGrid: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const { data, isLoading } = useProducts({
    category: selectedCategory === 'All' ? undefined : selectedCategory,
    limit: 12,
  });

  const fallbackFiltered =
    selectedCategory === 'All'
      ? MOCK_PRODUCTS
      : MOCK_PRODUCTS.filter((p) => p.category === selectedCategory);

  const displayedProducts = (data && data.products && data.products.length > 0)
    ? data.products
    : fallbackFiltered;

  return (
    <section className="py-16 md:py-24 bg-ivory-100 border-b border-ivory-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header with Category Tabs */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <span className="text-[11px] uppercase tracking-widest text-sand-600 font-semibold block mb-1">
              Seasonal Releases
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-charcoal-950">
              The Curated Collection
            </h2>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b md:border-b-0 border-ivory-300 pb-2 md:pb-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 text-xs uppercase tracking-wider font-medium rounded-xs transition-all ${
                  selectedCategory === cat
                    ? 'bg-charcoal-900 text-ivory-50 shadow-sm'
                    : 'bg-ivory-200 text-charcoal-700 hover:bg-ivory-300 hover:text-charcoal-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        {isLoading && !data ? (
          <div className="py-20 flex justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin text-sand-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {displayedProducts.map((product) => (
              <ProductCard key={product.id || product.slug} product={product} />
            ))}
          </div>
        )}

        {/* View All Button */}
        <div className="mt-14 text-center">
          <Link to="/shop">
            <Button variant="outline" size="lg" className="gap-2">
              Explore All Footwear Styles <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
