import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Eye, Star } from 'lucide-react';
import { Product } from '@/types';
import { formatINR } from '@/lib/utils';
import { useCartStore } from '@/store/useCartStore';
import { Badge } from './Badge';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const { toggleWishlist, isInWishlist, setQuickViewProduct } = useCartStore();
  const wishlisted = isInWishlist(product.id);

  // If there is a secondary image and card is hovered (and color isn't manually switched), show secondary image
  const displayImage =
    isHovered && product.images.length > 1 && selectedImageIndex === 0
      ? product.images[1]
      : product.images[selectedImageIndex] || product.images[0];

  return (
    <div
      className="group relative flex flex-col bg-ivory-50 border border-ivory-200/90 rounded-sm overflow-hidden transition-all duration-300 hover:border-sand-300 hover:shadow-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image container */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-ivory-200/50">
        <Link to={`/product/${product.slug}`} className="block w-full h-full">
          <img
            src={displayImage}
            alt={product.name}
            className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
            loading="lazy"
          />
        </Link>

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {product.badge && (
            <Badge variant={product.badge === 'Artisan Heritage' ? 'sand' : 'default'}>
              {product.badge}
            </Badge>
          )}
          {product.discountPercent > 0 && (
            <span className="text-[10px] font-semibold tracking-wider text-white bg-charcoal-900 px-2 py-0.5 rounded-xs w-max">
              -{product.discountPercent}%
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-charcoal-700 hover:text-red-600 hover:bg-white transition-colors duration-200 shadow-sm"
        >
          <Heart
            className={`w-4 h-4 transition-transform duration-200 ${
              wishlisted ? 'fill-red-600 text-red-600 scale-110' : 'text-charcoal-800'
            }`}
          />
        </button>

        {/* Quick View Button (desktop hover slide-up) */}
        <div className="absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setQuickViewProduct(product);
            }}
            className="w-full py-2.5 px-3 bg-white/95 hover:bg-charcoal-900 hover:text-white backdrop-blur-md text-charcoal-900 text-[11px] font-medium tracking-widest uppercase transition-all duration-200 rounded-xs flex items-center justify-center gap-1.5 shadow-md"
          >
            <Eye className="w-3.5 h-3.5" />
            Quick View
          </button>
        </div>
      </div>

      {/* Product Information */}
      <div className="flex flex-col flex-1 p-4">
        {/* Category & Rating */}
        <div className="flex items-center justify-between text-xs text-charcoal-500 mb-1">
          <span className="tracking-widest uppercase text-[10px] text-sand-600 font-semibold">
            {product.category}
          </span>
          <div className="flex items-center gap-1 text-[11px] text-charcoal-700">
            <Star className="w-3 h-3 fill-sand-400 text-sand-400" />
            <span>{product.rating}</span>
            <span className="text-charcoal-400">({product.reviewCount})</span>
          </div>
        </div>

        {/* Product Title */}
        <Link to={`/product/${product.slug}`} className="group-hover:text-sand-600 transition-colors duration-200">
          <h3 className="font-serif text-lg font-medium text-charcoal-900 leading-snug line-clamp-1">
            {product.name}
          </h3>
        </Link>
        <p className="text-[11px] text-charcoal-500 line-clamp-1 mb-3">
          {product.subtitle}
        </p>

        {/* Color swatches preview */}
        {product.colors.length > 0 && (
          <div className="flex items-center gap-1.5 mb-3">
            {product.colors.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setSelectedImageIndex(c.imageIndex)}
                className={`w-3.5 h-3.5 rounded-full border transition-all ${
                  selectedImageIndex === c.imageIndex
                    ? 'ring-1 ring-charcoal-900 ring-offset-1 scale-110'
                    : 'border-charcoal-300 hover:scale-105'
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
            <span className="text-[10px] text-charcoal-400 ml-1">
              {product.colors.length} {product.colors.length > 1 ? 'shades' : 'shade'}
            </span>
          </div>
        )}

        {/* Footer: Price & Sizes */}
        <div className="mt-auto pt-3 border-t border-ivory-200/80 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-sans font-semibold text-charcoal-900 text-sm">
              {formatINR(product.price)}
            </span>
            {product.originalPrice > product.price && (
              <span className="text-xs text-charcoal-400 line-through">
                {formatINR(product.originalPrice)}
              </span>
            )}
          </div>

          <div className="text-[10px] uppercase tracking-wider text-charcoal-500 font-medium">
            {product.sizes.length} Sizes
          </div>
        </div>
      </div>
    </div>
  );
};
