import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Star,
  Heart,
  ShoppingBag,
  Check,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ArrowRight,
  Minus,
  Plus,
  Ruler,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';
import { useProducts, useProductBySlug, useSubmitReview } from '@/hooks/useProducts';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { MOCK_PRODUCTS } from '@/data/mockProducts';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { formatINR } from '@/lib/utils';
import { Product, ShoeSize, ProductReview } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProductCard } from '@/components/ui/ProductCard';
import { SizeGuideModal } from '@/components/common/SizeGuideModal';
import { RecentlyViewed } from '@/components/ui/RecentlyViewed';
import { NotifyWhenBack } from '@/components/ui/NotifyWhenBack';
import { useRecentStore } from '@/store/useRecentStore';

const NotFound: React.FC = () => {
  useDocumentMeta({ title: 'Product not found — Footzi', noindex: true });
  return (
    <div className="py-24 text-center bg-ivory-100 min-h-[60vh]">
      <h1 className="font-serif text-3xl font-medium text-charcoal-900">This style is no longer available</h1>
      <p className="text-xs text-charcoal-500 mt-2">It may have been retired from the collection, or the link is mistyped.</p>
      <Link to="/shop" className="mt-4 inline-block text-xs uppercase tracking-widest font-semibold text-sand-600 underline">
        Browse the collection
      </Link>
    </div>
  );
};

/** Loads the product, and only then renders the page, so its form state starts from the real product. */
export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: product, isLoading } = useProductBySlug(slug);

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading product" className="py-20 text-center bg-ivory-100 min-h-[70vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-charcoal-900 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }
  if (!product) return <NotFound />;
  return <ProductDetailContent key={product.id} product={product} />;
};

const ProductDetailContent: React.FC<{ product: Product }> = ({ product }) => {
  const navigate = useNavigate();
  const { addItem, toggleWishlist, isInWishlist } = useCartStore();

  useDocumentMeta({
    title: `${product.name} — Footzi`,
    description: `${product.name}. ${product.description}`.replace(/\s+/g, ' ').slice(0, 160),
    image: product.images?.[0] ? new URL(product.images[0], window.location.origin).href : undefined,
    type: 'product',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description,
      image: (product.images || []).map((i) => new URL(i, window.location.origin).href),
      sku: product.variants?.[0]?.sku,
      category: product.category,
      brand: { '@type': 'Brand', name: product.brand || 'Footzi Atelier' },
      offers: {
        '@type': 'Offer',
        url: `${window.location.origin}/product/${product.slug}`,
        priceCurrency: 'INR',
        price: product.price,
        availability: (product.variants || []).some((v) => v.stock > 0) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
      },
      ...(product.reviewCount > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating, reviewCount: product.reviewCount } } : {}),
    },
  });

  const wishlisted = isInWishlist(product.id);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<ShoeSize>(product.sizes[0] || 'UK 8');
  const [selectedColor, setSelectedColor] = useState<{ name: string; hex: string }>(
    product.colors[0] || { name: 'Natural', hex: '#8C4E28' }
  );
  const [quantity, setQuantity] = useState(1);
  const [isAddedFeedback, setIsAddedFeedback] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>('specs');
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  // Review Form State
  const { isAuthenticated, user } = useAuthStore();
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewCity, setReviewCity] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewsList, setReviewsList] = useState<ProductReview[]>(product.reviews || []);

  const submitReviewMutation = useSubmitReview(product.id);

  useEffect(() => {
    if (product) {
      setSelectedSize(product.sizes[0] || 'UK 8');
      if (product.colors.length > 0) {
        setSelectedColor(product.colors[0]);
      }
      setActiveImageIndex(0);
      setReviewsList(product.reviews || []);
    }
  }, [product]);

  // Variant resolution
  const currentVariant = product.variants.find(
    (v) => v.size === selectedSize && v.color === selectedColor.name
  );
  const availableStock = currentVariant ? currentVariant.stock : 0;
  const isOutOfStock = availableStock <= 0;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addItem(product, selectedSize, selectedColor.name, selectedColor.hex, quantity);
    setIsAddedFeedback(true);
    setTimeout(() => setIsAddedFeedback(false), 2000);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    addItem(product, selectedSize, selectedColor.name, selectedColor.hex, quantity);
    navigate('/checkout');
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;
    setReviewError(null);

    try {
      const published = await submitReviewMutation.mutateAsync({
        rating: reviewRating,
        city: reviewCity || undefined,
        title: reviewTitle || undefined,
        comment: reviewComment,
        sizePurchased: selectedSize,
      });

      setReviewsList([published, ...reviewsList]);
      setReviewSubmitted(true);
      setReviewCity('');
      setReviewTitle('');
      setReviewComment('');
    } catch (err: any) {
      setReviewError(err.message || 'Could not publish your review. Please try again.');
    }
  };

  // Related styles come from the live catalogue (so prices and stock are current); the built-in
  // list is only a fallback for when the server cannot be reached.
  const { data: sameCategory } = useProducts({ category: product.category, limit: 6 });
  const relatedPool = sameCategory?.products?.length ? sameCategory.products : MOCK_PRODUCTS.filter((p) => p.category === product.category);
  const relatedProducts = relatedPool.filter((p) => p.id !== product.id).slice(0, 3);

  const rememberViewed = useRecentStore((s) => s.add);
  useEffect(() => {
    rememberViewed({ id: product.id, slug: product.slug, name: product.name, image: product.images?.[0] ?? '', price: product.price });
  }, [product.id, product.slug, product.name, product.price, rememberViewed]);

  return (
    <div className="py-8 md:py-12 bg-ivory-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-charcoal-400 mb-8">
          <Link to="/" className="hover:text-charcoal-900 transition-colors">Home</Link>
          <span>/</span>
          <Link to={`/shop?category=${product.category}`} className="hover:text-charcoal-900 transition-colors">
            {product.category}
          </Link>
          <span>/</span>
          <span className="text-charcoal-800 font-semibold truncate max-w-xs">{product.name}</span>
        </div>

        {/* Product Core Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          
          {/* Left Column: Gallery */}
          <div className="lg:col-span-7 space-y-4">
            {/* Primary High-Res Display */}
            <div className="aspect-[4/5] rounded-xs overflow-hidden bg-ivory-200 border border-ivory-300 shadow-sm relative group">
              <img decoding="async" ref={(el) => el?.setAttribute("fetchpriority", "high")}
                src={product.images[activeImageIndex] || product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />
              {product.badge && (
                <div className="absolute top-4 left-4">
                  <Badge variant={product.badge === 'Artisan Heritage' ? 'sand' : 'default'}>
                    {product.badge}
                  </Badge>
                </div>
              )}
            </div>

            {/* Thumbnail selector */}
            {product.images.length > 1 && (
              <div className="flex gap-3">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-20 h-24 rounded-xs overflow-hidden border-2 transition-all ${
                      activeImageIndex === idx
                        ? 'border-charcoal-900 shadow-sm'
                        : 'border-ivory-300 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img decoding="async" loading="lazy" src={img} alt={`${product.name}, view ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Buying Options & Details */}
          <div className="lg:col-span-5 flex flex-col justify-start space-y-6">
            <div>
              {/* Origin badge */}
              <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-sand-600 font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{product.craftsmanshipLocation}</span>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl font-medium text-charcoal-950 leading-tight">
                {product.name}
              </h1>
              <p className="text-xs text-charcoal-500 mt-1">{product.subtitle}</p>

              {/* Rating */}
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center text-xs text-charcoal-800 font-semibold">
                  <Star className="w-3.5 h-3.5 fill-sand-400 text-sand-400 mr-1" />
                  {product.rating}
                </div>
                <span className="text-xs text-charcoal-400">
                  • {reviewsList.length} patron chronicles
                </span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3 my-5">
                <span className="text-2xl font-bold text-charcoal-950 font-sans">
                  {formatINR(product.price)}
                </span>
                {product.originalPrice > product.price && (
                  <span className="text-sm text-charcoal-400 line-through">
                    {formatINR(product.originalPrice)}
                  </span>
                )}
                {product.discountPercent > 0 && (
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-xs">
                    Save {product.discountPercent}%
                  </span>
                )}
                <span className="text-[11px] text-charcoal-500 font-normal ml-auto">
                  Taxes Included
                </span>
              </div>

              <p className="text-xs text-charcoal-600 leading-relaxed font-light">
                {product.description}
              </p>
            </div>

            {/* Color Swatches */}
            {product.colors.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-ivory-200">
                <div className="flex items-center justify-between text-xs uppercase tracking-wider text-charcoal-700 font-medium">
                  <span>Selected Shade: <strong className="text-charcoal-900">{selectedColor.name}</strong></span>
                </div>
                <div className="flex gap-2.5">
                  {product.colors.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => {
                        setSelectedColor({ name: c.name, hex: c.hex });
                        setActiveImageIndex(c.imageIndex);
                      }}
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                        selectedColor.name === c.name
                          ? 'border-charcoal-900 ring-2 ring-sand-400/50 scale-105'
                          : 'border-white hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    >
                      {selectedColor.name === c.name && (
                        <Check className="w-3.5 h-3.5 text-white drop-shadow" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Shoe Size Selector */}
            <div className="space-y-2 pt-2 border-t border-ivory-200">
              <div className="flex items-center justify-between text-xs uppercase tracking-wider text-charcoal-700 font-medium">
                <span>Select Indian Size (UK): <strong className="text-charcoal-900">{selectedSize}</strong></span>
                <button
                  type="button"
                  onClick={() => setSizeGuideOpen(true)}
                  className="text-[11px] text-sand-600 underline flex items-center gap-1 hover:text-sand-800 py-2"
                >
                  <Ruler className="w-3 h-3" /> Indian Fit Guide
                </button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {product.sizes.map((size) => {
                  const variant = product.variants.find(
                    (v) => v.size === size && v.color === selectedColor.name
                  );
                  const isAvailable = variant ? variant.stock > 0 : true;

                  return (
                    <button
                      key={size}
                      // A sold-out size stays selectable: choosing it offers "tell me when it's back"
                      aria-label={isAvailable ? size : `${size}, sold out`}
                      aria-pressed={selectedSize === size}
                      onClick={() => setSelectedSize(size)}
                      className={`py-2.5 text-xs font-semibold rounded-xs border transition-all ${
                        selectedSize === size
                          ? 'bg-charcoal-900 text-white border-charcoal-900 shadow-sm'
                          : isAvailable
                          ? 'bg-white text-charcoal-800 border-ivory-300 hover:border-charcoal-700'
                          : 'bg-ivory-200 text-charcoal-500 border-ivory-200 line-through hover:border-charcoal-500'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>

              {/* Stock status indicator */}
              <div className="pt-1">
                {isOutOfStock ? (
                  <>
                    <span className="text-xs font-semibold text-red-600">
                      Currently out of stock for this size/color combination.
                    </span>
                    {currentVariant?.sku && <NotifyWhenBack key={currentVariant.sku} sku={currentVariant.sku} sizeLabel={selectedSize} />}
                  </>
                ) : availableStock <= 5 ? (
                  <span className="text-xs font-medium text-amber-700">
                    ⚡ Low Inventory Alert: Only {availableStock} pairs left in Agra warehouse!
                  </span>
                ) : (
                  <span className="text-xs text-emerald-700 flex items-center gap-1 font-medium">
                    <Check className="w-3.5 h-3.5" /> In Stock & Ready for Rapid Supplier Dispatch
                  </span>
                )}
              </div>
            </div>

            {/* Quantity and Purchase Buttons */}
            <div className="space-y-4 pt-3">
              <div className="flex items-center gap-4">
                <span className="text-xs uppercase tracking-wider text-charcoal-700 font-semibold">Quantity:</span>
                <div className="flex items-center border border-ivory-300 rounded-xs bg-white">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="p-3 text-charcoal-600 hover:text-charcoal-950 disabled:opacity-30"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-4 text-xs font-bold text-charcoal-900 select-none">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                    disabled={quantity >= availableStock}
                    className="p-3 text-charcoal-600 hover:text-charcoal-950 disabled:opacity-30"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  disabled={isOutOfStock}
                  onClick={handleAddToCart}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  {isAddedFeedback ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      Added to Bag!
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      Add to Bag
                    </>
                  )}
                </Button>

                <button
                  onClick={() => toggleWishlist(product.id)}
                  aria-label="Wishlist toggle"
                  className="w-13 h-13 rounded-xs border border-charcoal-300 hover:border-charcoal-900 bg-white flex items-center justify-center text-charcoal-800 transition-colors"
                >
                  <Heart
                    className={`w-5 h-5 ${
                      wishlisted ? 'fill-red-600 text-red-600' : 'text-charcoal-800'
                    }`}
                  />
                </button>
              </div>

              <Button
                variant="sand"
                size="lg"
                disabled={isOutOfStock}
                onClick={handleBuyNow}
                className="w-full flex items-center justify-center gap-2"
              >
                Instant Buy Now <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Trust Assurances */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-ivory-200 text-center">
              <div className="p-2.5 bg-white rounded-xs border border-ivory-200">
                <Truck className="w-4 h-4 text-sand-500 mx-auto mb-1" />
                <p className="text-[10px] font-semibold text-charcoal-900">Complimentary</p>
                <p className="text-[9px] text-charcoal-500">Pan-India Express</p>
              </div>
              <div className="p-2.5 bg-white rounded-xs border border-ivory-200">
                <RotateCcw className="w-4 h-4 text-sand-500 mx-auto mb-1" />
                <p className="text-[10px] font-semibold text-charcoal-900">7-Day Swap</p>
                <p className="text-[9px] text-charcoal-500">Doorstep Size Exchange</p>
              </div>
              <div className="p-2.5 bg-white rounded-xs border border-ivory-200">
                <ShieldCheck className="w-4 h-4 text-sand-500 mx-auto mb-1" />
                <p className="text-[10px] font-semibold text-charcoal-900">100% Genuine</p>
                <p className="text-[9px] text-charcoal-500">Agra Leather Certificate</p>
              </div>
            </div>

            {/* Accordion Sections: Specs, Delivery, Return */}
            <div className="space-y-2 pt-2 border-t border-ivory-200">
              {/* Product Specifications */}
              <div className="border border-ivory-300 rounded-xs bg-white overflow-hidden">
                <button
                  onClick={() => setOpenAccordion(openAccordion === 'specs' ? null : 'specs')}
                  className="w-full p-3.5 text-left text-xs uppercase tracking-wider font-semibold text-charcoal-900 flex items-center justify-between"
                >
                  <span>Materials & Specifications</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${openAccordion === 'specs' ? 'rotate-180' : ''}`}
                  />
                </button>
                {openAccordion === 'specs' && (
                  <div className="p-4 pt-0 text-xs text-charcoal-600 space-y-2 border-t border-ivory-100">
                    <p><strong>Upper Material:</strong> {product.material}</p>
                    <p><strong>Sole Engineering:</strong> {product.sole}</p>
                    <p><strong>Origin & Craft:</strong> {product.craftsmanshipLocation}</p>
                    <ul className="list-disc pl-4 space-y-1 mt-2 text-charcoal-500">
                      {product.features.map((feat, i) => (
                        <li key={i}>{feat}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Delivery Information */}
              <div className="border border-ivory-300 rounded-xs bg-white overflow-hidden">
                <button
                  onClick={() => setOpenAccordion(openAccordion === 'delivery' ? null : 'delivery')}
                  className="w-full p-3.5 text-left text-xs uppercase tracking-wider font-semibold text-charcoal-900 flex items-center justify-between"
                >
                  <span>Pan-India Delivery & Dropship Tracking</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${openAccordion === 'delivery' ? 'rotate-180' : ''}`}
                  />
                </button>
                {openAccordion === 'delivery' && (
                  <div className="p-4 pt-0 text-xs text-charcoal-600 space-y-2 border-t border-ivory-100 font-light">
                    <p>• Dispatched within 24–48 hours directly from our partner artisan workshop in Agra.</p>
                    <p>• Delivery across Delhi NCR, Mumbai, Bengaluru, Hyderabad, Chennai, and tier-1 cities within 2–4 business days.</p>
                    <p>• Complete SMS & WhatsApp tracking updates generated through our simulated logistics gateway.</p>
                  </div>
                )}
              </div>

              {/* Return & Exchange */}
              <div className="border border-ivory-300 rounded-xs bg-white overflow-hidden">
                <button
                  onClick={() => setOpenAccordion(openAccordion === 'returns' ? null : 'returns')}
                  className="w-full p-3.5 text-left text-xs uppercase tracking-wider font-semibold text-charcoal-900 flex items-center justify-between"
                >
                  <span>7-Day Return & Size Exchange Policy</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${openAccordion === 'returns' ? 'rotate-180' : ''}`}
                  />
                </button>
                {openAccordion === 'returns' && (
                  <div className="p-4 pt-0 text-xs text-charcoal-600 space-y-2 border-t border-ivory-100 font-light">
                    <p>• We offer a 7-day complimentary doorstep size exchange if your pair doesn't fit perfectly.</p>
                    <p>• Footwear must be unworn, in original packaging with dust bag and authenticity cards intact.</p>
                    <p>• Easy 1-click exchange initiation through your customer dashboard.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Customer Reviews Section */}
        <div className="mt-20 pt-12 border-t border-ivory-300">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <span className="text-[11px] uppercase tracking-widest text-sand-600 font-semibold block mb-1">
                Patron Testimonies
              </span>
              <h2 className="font-serif text-3xl font-medium text-charcoal-950">
                Customer Chronicles & Reviews
              </h2>
            </div>

            {/* Reviews Summary Header */}
            <div className="bg-white p-6 sm:p-8 rounded-xs border border-ivory-200 shadow-sm mb-8 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="text-center sm:text-left">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <span className="font-serif text-4xl font-bold text-charcoal-950">{product.rating}</span>
                  <div className="flex text-sand-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-charcoal-500 mt-1">
                  Based on {reviewsList.length} wearer ratings across India
                </p>
              </div>

              <div className="text-center sm:text-right">
                <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1 justify-center sm:justify-end">
                  <CheckCircle2 className="w-4 h-4" /> 100% Verified Purchases
                </p>
                <p className="text-[11px] text-charcoal-500 mt-0.5">Ratings from Footzi patrons</p>
              </div>
            </div>

            {/* List of Reviews */}
            <div className="space-y-4 mb-12">
              {reviewsList.map((rev) => (
                <div key={rev.id} className="bg-white p-6 rounded-xs border border-ivory-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-sand-400 text-sand-400" />
                      ))}
                    </div>
                    <span className="text-[11px] text-charcoal-400">{rev.date}</span>
                  </div>

                  <h3 className="font-serif text-base font-semibold text-charcoal-900">
                    "{rev.title}"
                  </h3>

                  <p className="text-xs text-charcoal-600 leading-relaxed font-light">
                    {rev.comment}
                  </p>

                  <div className="pt-2 border-t border-ivory-100 flex items-center justify-between text-[11px] text-charcoal-500">
                    <span className="font-medium text-charcoal-800">
                      {rev.author} • {rev.city}
                    </span>
                    <span className="bg-ivory-100 px-2 py-0.5 rounded-xs text-[10px] text-charcoal-600">
                      Size: {rev.sizePurchased}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Review Submission Form */}
            <div className="bg-white p-6 sm:p-8 rounded-xs border border-ivory-200 shadow-sm">
              <h3 className="font-serif text-lg font-medium text-charcoal-950 mb-1 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-sand-600" />
                Share Your Footzi Experience
              </h3>
              <p className="text-xs text-charcoal-500 mb-6">
                Tell fellow patrons how this pair fits, feels, and performs in Indian environments.
              </p>

              {!isAuthenticated ? (
                <div className="p-4 bg-ivory-50 border border-ivory-300 rounded-xs text-xs text-charcoal-700 flex flex-wrap items-center justify-between gap-3">
                  <span>Sign in to share your experience. Reviews from verified buyers are marked as such.</span>
                  <Link to="/login" className="font-semibold text-charcoal-900 underline underline-offset-2">
                    Sign in
                  </Link>
                </div>
              ) : reviewSubmitted ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xs text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>Thank you! Your review has been published.</span>
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-charcoal-700 font-medium">Your Rating:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setReviewRating(s)}
                          aria-label={`${s} star${s === 1 ? '' : 's'}`}
                          aria-pressed={s === reviewRating}
                          className="p-1 rounded-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-charcoal-900"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              s <= reviewRating ? 'fill-sand-400 text-sand-400' : 'text-charcoal-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-charcoal-700 uppercase mb-1">
                        Posting As
                      </label>
                      <div className="w-full bg-ivory-100 border border-ivory-300 p-2 text-xs rounded-xs text-charcoal-700">
                        {user?.name}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-charcoal-700 uppercase mb-1">
                        City / State
                      </label>
                      <input
                        type="text"
                        value={reviewCity}
                        onChange={(e) => setReviewCity(e.target.value)}
                        placeholder="e.g. Lucknow, UP"
                        className="w-full bg-ivory-50 border border-ivory-300 p-2 text-xs rounded-xs focus:outline-none focus:border-charcoal-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-charcoal-700 uppercase mb-1">
                      Review Headline
                    </label>
                    <input
                      type="text"
                      value={reviewTitle}
                      onChange={(e) => setReviewTitle(e.target.value)}
                      placeholder="e.g. Sublime leather quality and perfect arch fit"
                      className="w-full bg-ivory-50 border border-ivory-300 p-2 text-xs rounded-xs focus:outline-none focus:border-charcoal-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-charcoal-700 uppercase mb-1">
                      Detailed Impressions
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Describe the break-in, comfort during daily commutes, and overall craftsmanship..."
                      className="w-full bg-ivory-50 border border-ivory-300 p-2 text-xs rounded-xs focus:outline-none focus:border-charcoal-900"
                    />
                  </div>

                  {reviewError && (
                    <p role="alert" className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-xs p-2">{reviewError}</p>
                  )}

                  <Button type="submit" variant="primary" size="md" isLoading={submitReviewMutation.isPending}>
                    Publish Review
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Related Footwear Collection */}
        {relatedProducts.length > 0 && (
          <div className="mt-24 pt-12 border-t border-ivory-300">
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-[11px] uppercase tracking-widest text-sand-600 font-semibold block mb-1">
                  You May Also Admire
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-medium text-charcoal-950">
                  Complementary {product.category} Silhouettes
                </h2>
              </div>
              <Link to={`/shop?category=${product.category}`} className="text-xs uppercase tracking-widest text-charcoal-800 hover:text-charcoal-950 font-medium">
                View All
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}

        <RecentlyViewed excludeId={product.id} />
      </div>

      {/* Indian Shoe Size Conversion Guide Modal */}
      <SizeGuideModal isOpen={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} />
    </div>
  );
};
