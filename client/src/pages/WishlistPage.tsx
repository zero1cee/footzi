import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Loader2, ArrowRight } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { useProducts } from '@/hooks/useProducts';
import { MOCK_PRODUCTS } from '@/data/mockProducts';
import { ProductCard } from '@/components/ui/ProductCard';
import { Button } from '@/components/ui/Button';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

export const WishlistPage: React.FC = () => {
  useDocumentMeta({ title: 'Your Wishlist — Footzi', noindex: true });
  const { wishlist } = useCartStore();
  const { data, isLoading } = useProducts({ limit: 100 });

  const catalog = data?.products && data.products.length > 0 ? data.products : MOCK_PRODUCTS;
  const wishlistedProducts = catalog.filter((p) => wishlist.includes(p.id));

  return (
    <div className="py-12 md:py-16 bg-ivory-100 min-h-[80vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-ivory-300 pb-6 mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-[11px] uppercase tracking-ultra text-sand-600 font-semibold block mb-1">
              Personal Curation
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-medium text-charcoal-950">
              Your Wishlist ({wishlistedProducts.length})
            </h1>
          </div>
          <Link to="/shop">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              Explore Collection <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {isLoading && !data ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-sand-500" />
          </div>
        ) : wishlistedProducts.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xs border border-ivory-200 max-w-xl mx-auto shadow-sm">
            <Heart className="w-10 h-10 text-charcoal-300 mx-auto mb-3" />
            <h2 className="font-serif text-xl font-medium text-charcoal-900">
              Your wishlist is currently empty
            </h2>
            <p className="text-xs text-charcoal-500 mt-1.5 mb-5 leading-relaxed">
              Tap the heart icon on any handcrafted loafer, sneaker, or oxford to save your favorite silhouettes here.
            </p>
            <Link to="/shop">
              <Button variant="primary" size="md">
                Browse Footwear
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {wishlistedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
