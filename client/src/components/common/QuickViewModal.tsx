import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Star, Check, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { formatINR } from '@/lib/utils';
import { ShoeSize } from '@/types';
import { Button } from '@/components/ui/Button';

export const QuickViewModal: React.FC = () => {
  const { quickViewProduct, setQuickViewProduct, addItem } = useCartStore();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<ShoeSize | null>(null);
  const [selectedColor, setSelectedColor] = useState<{ name: string; hex: string } | null>(null);
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    if (quickViewProduct) {
      setSelectedImageIndex(0);
      setSelectedSize(quickViewProduct.sizes[0] || null);
      if (quickViewProduct.colors.length > 0) {
        setSelectedColor({
          name: quickViewProduct.colors[0].name,
          hex: quickViewProduct.colors[0].hex,
        });
      }
      setIsAdded(false);
    }
  }, [quickViewProduct]);

  if (!quickViewProduct) return null;

  const currentVariant = quickViewProduct.variants.find(
    (v) => v.size === selectedSize && (!selectedColor || v.color === selectedColor.name)
  );

  const availableStock = currentVariant ? currentVariant.stock : 0;
  const isOutOfStock = availableStock <= 0;

  const handleAddToCart = () => {
    if (!selectedSize || !selectedColor) return;
    addItem(quickViewProduct, selectedSize, selectedColor.name, selectedColor.hex, 1);
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
      setQuickViewProduct(null);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal-950/70 backdrop-blur-sm transition-opacity"
        onClick={() => setQuickViewProduct(null)}
      />

      {/* Modal Dialog */}
      <div className="relative bg-ivory-100 max-w-3xl w-full rounded-sm shadow-2xl border border-ivory-300 overflow-hidden z-10 animate-fade-in">
        {/* Close Button */}
        <button
          onClick={() => setQuickViewProduct(null)}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-ivory-200/90 hover:bg-ivory-300 text-charcoal-800 flex items-center justify-center transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Product Gallery */}
          <div className="bg-ivory-200/60 p-6 flex flex-col justify-between">
            <div className="aspect-[4/5] w-full rounded-xs overflow-hidden bg-white shadow-inner">
              <img
                src={quickViewProduct.images[selectedImageIndex] || quickViewProduct.images[0]}
                alt={quickViewProduct.name}
                className="w-full h-full object-cover object-center transition-all duration-300"
              />
            </div>

            {quickViewProduct.images.length > 1 && (
              <div className="flex gap-2 mt-4 justify-center">
                {quickViewProduct.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`w-14 h-14 rounded-xs overflow-hidden border-2 transition-all ${
                      selectedImageIndex === idx
                        ? 'border-charcoal-900 shadow-sm'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details & Selection */}
          <div className="p-6 md:p-8 flex flex-col justify-between bg-ivory-50">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-sand-600 font-semibold mb-1">
                <span>{quickViewProduct.category}</span>
                <span>•</span>
                <span className="text-charcoal-500 font-normal">Agra Atelier</span>
              </div>

              <h2 className="font-serif text-2xl font-medium text-charcoal-900 leading-tight">
                {quickViewProduct.name}
              </h2>

              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center text-xs text-charcoal-800 font-medium">
                  <Star className="w-3.5 h-3.5 fill-sand-400 text-sand-400 mr-1" />
                  {quickViewProduct.rating}
                </div>
                <span className="text-charcoal-400 text-xs">
                  ({quickViewProduct.reviewCount} reviews)
                </span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3 my-4">
                <span className="text-xl font-bold text-charcoal-950 font-sans">
                  {formatINR(quickViewProduct.price)}
                </span>
                {quickViewProduct.originalPrice > quickViewProduct.price && (
                  <span className="text-sm text-charcoal-400 line-through">
                    {formatINR(quickViewProduct.originalPrice)}
                  </span>
                )}
                {quickViewProduct.discountPercent > 0 && (
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-xs">
                    Save {quickViewProduct.discountPercent}%
                  </span>
                )}
              </div>

              <p className="text-xs text-charcoal-600 line-clamp-3 leading-relaxed mb-5">
                {quickViewProduct.description}
              </p>

              {/* Color Selector */}
              {quickViewProduct.colors.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs uppercase tracking-wider text-charcoal-700 font-medium mb-2 flex justify-between">
                    <span>Color: <strong>{selectedColor?.name}</strong></span>
                  </div>
                  <div className="flex gap-2">
                    {quickViewProduct.colors.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => {
                          setSelectedColor({ name: c.name, hex: c.hex });
                          setSelectedImageIndex(c.imageIndex);
                        }}
                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                          selectedColor?.name === c.name
                            ? 'border-charcoal-900 ring-2 ring-sand-400/50 scale-105'
                            : 'border-white hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      >
                        {selectedColor?.name === c.name && (
                          <Check className="w-3 h-3 text-white drop-shadow" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Selector */}
              <div className="mb-6">
                <div className="text-xs uppercase tracking-wider text-charcoal-700 font-medium mb-2 flex justify-between">
                  <span>Shoe Size: <strong>{selectedSize}</strong></span>
                  <span className="text-[11px] text-sand-600 underline cursor-pointer">
                    Indian Fit Guide
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {quickViewProduct.sizes.map((size) => {
                    const variantForSize = quickViewProduct.variants.find(
                      (v) => v.size === size && (!selectedColor || v.color === selectedColor.name)
                    );
                    const isAvailable = variantForSize ? variantForSize.stock > 0 : true;

                    return (
                      <button
                        key={size}
                        disabled={!isAvailable}
                        onClick={() => setSelectedSize(size)}
                        className={`py-2 text-xs font-semibold rounded-xs border transition-all ${
                          selectedSize === size
                            ? 'bg-charcoal-900 text-white border-charcoal-900 shadow-sm'
                            : isAvailable
                            ? 'bg-white text-charcoal-800 border-ivory-300 hover:border-charcoal-700'
                            : 'bg-ivory-200 text-charcoal-400 border-ivory-200 line-through cursor-not-allowed opacity-50'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
                {availableStock > 0 && availableStock <= 5 && (
                  <p className="text-[11px] text-amber-700 font-medium mt-1.5">
                    Only {availableStock} pairs remaining in this size!
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-4 border-t border-ivory-200">
              <Button
                variant="primary"
                size="md"
                disabled={isOutOfStock || !selectedSize}
                onClick={handleAddToCart}
                className="w-full flex items-center justify-center gap-2"
              >
                {isAdded ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    Added to Bag!
                  </>
                ) : isOutOfStock ? (
                  'Out of Stock'
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    Add to Bag
                  </>
                )}
              </Button>

              <Link
                to={`/product/${quickViewProduct.slug}`}
                onClick={() => setQuickViewProduct(null)}
                className="text-xs uppercase tracking-widest text-charcoal-700 hover:text-charcoal-950 font-medium flex items-center justify-center gap-1.5 py-1 text-center"
              >
                View Full Product Details & Craft Notes <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
