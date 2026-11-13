import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, ShieldCheck, Tag, ShoppingBag, ArrowLeft } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { formatINR } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

export const CartPage: React.FC = () => {
  useDocumentMeta({ title: 'Your Bag — Footzi', noindex: true });
  const navigate = useNavigate();
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    getSubtotal,
    getDiscountAmount,
    getShippingFee,
    getTotal,
    couponCode,
    applyCoupon,
    removeCoupon,
    getCouponShortfall,
  } = useCartStore();

  const [inputCoupon, setInputCoupon] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{ success: boolean; text: string } | null>(null);

  const subtotal = getSubtotal();
  const discount = getDiscountAmount();
  const shipping = getShippingFee();
  const total = getTotal();

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCoupon.trim()) return;
    const res = await applyCoupon(inputCoupon);
    setCouponFeedback({ success: res.success, text: res.message });
    if (res.success) {
      setInputCoupon('');
    }
  };

  if (items.length === 0) {
    return (
      <div className="py-20 bg-ivory-100 min-h-[70vh] flex items-center justify-center">
        <div className="max-w-md w-full mx-auto text-center px-4 space-y-5">
          <div className="w-20 h-20 rounded-full bg-ivory-200 flex items-center justify-center mx-auto text-charcoal-400">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <h1 className="font-serif text-3xl font-medium text-charcoal-900">Your bag is empty</h1>
          <p className="text-xs text-charcoal-500 leading-relaxed">
            Discover our collection of handcrafted footwear inspired by Agra's architectural heritage.
          </p>
          <Link to="/shop">
            <Button variant="primary" size="lg" className="mt-4 gap-2">
              Explore Collections <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10 md:py-16 bg-ivory-100 min-h-[80vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-ivory-300">
          <div>
            <span className="text-[11px] uppercase tracking-widest text-sand-600 font-semibold block mb-1">
              Review Bag
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-medium text-charcoal-950">
              Shopping Cart ({items.reduce((acc, i) => acc + i.quantity, 0)})
            </h1>
          </div>
          <button
            onClick={clearCart}
            className="text-xs text-charcoal-500 hover:text-red-600 transition-colors underline"
          >
            Clear Entire Bag
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Cart Table / Items List */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white border border-ivory-200 rounded-xs shadow-sm overflow-hidden">
              <div className="hidden sm:grid grid-cols-12 gap-4 p-4 text-[11px] uppercase tracking-wider font-semibold text-charcoal-500 border-b border-ivory-200 bg-ivory-50">
                <span className="col-span-6">Footwear Silhouette</span>
                <span className="col-span-2 text-center">Unit Price</span>
                <span className="col-span-2 text-center">Quantity</span>
                <span className="col-span-2 text-right">Subtotal</span>
              </div>

              <div className="divide-y divide-ivory-200">
                {items.map((item) => (
                  <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:grid sm:grid-cols-12 gap-4 items-center">
                    {/* Item Info */}
                    <div className="w-full sm:col-span-6 flex gap-4 items-center">
                      <img decoding="async" loading="lazy"
                        src={item.image}
                        alt={item.productName}
                        className="w-20 h-24 object-cover object-center rounded-xs bg-ivory-200"
                      />
                      <div className="space-y-1">
                        <Link
                          to={`/product/${item.productSlug}`}
                          className="font-serif text-base font-medium text-charcoal-950 hover:text-sand-600 transition-colors line-clamp-1"
                        >
                          {item.productName}
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-charcoal-500">
                          <span className="bg-ivory-100 border border-ivory-300 px-1.5 py-0.5 rounded-xs font-medium text-charcoal-800">
                            {item.size}
                          </span>
                          <span className="flex items-center gap-1">
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-charcoal-300"
                              style={{ backgroundColor: item.colorHex }}
                            />
                            {item.color}
                          </span>
                        </div>
                        <p className="text-[10px] text-charcoal-400 font-mono">SKU: {item.sku}</p>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-[11px] text-charcoal-400 hover:text-red-600 transition-colors flex items-center gap-1 pt-1"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      </div>
                    </div>

                    {/* Unit Price */}
                    <div className="hidden sm:block sm:col-span-2 text-center text-xs font-semibold text-charcoal-800">
                      {formatINR(item.price)}
                    </div>

                    {/* Quantity Selector */}
                    <div className="w-full sm:w-auto sm:col-span-2 flex justify-between sm:justify-center items-center">
                      <span className="text-xs text-charcoal-500 sm:hidden">Quantity:</span>
                      <div className="flex items-center border border-ivory-300 rounded-xs bg-white">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1.5 text-charcoal-600 hover:text-charcoal-950"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-3 text-xs font-bold text-charcoal-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          className="p-1.5 text-charcoal-600 hover:text-charcoal-950 disabled:opacity-30"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Line Total */}
                    <div className="w-full sm:w-auto sm:col-span-2 flex justify-between sm:justify-end items-center sm:text-right font-bold text-sm text-charcoal-950">
                      <span className="text-xs text-charcoal-500 sm:hidden">Total:</span>
                      <span>{formatINR(item.price * item.quantity)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Link to="/shop" className="text-xs uppercase tracking-wider text-charcoal-700 hover:text-charcoal-950 font-medium flex items-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" /> Continue Browsing Collections
              </Link>
            </div>
          </div>

          {/* Right Summary Column */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-xs border border-ivory-200 shadow-sm space-y-5">
              <h2 className="font-serif text-lg font-semibold uppercase tracking-wider text-charcoal-900 border-b border-ivory-200 pb-3">
                Order Summary
              </h2>

              {/* Coupon Form */}
              <div>
                {couponCode ? (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2.5 rounded-xs text-xs text-emerald-800">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Tag className="w-3.5 h-3.5" />
                      Applied: <strong>{couponCode}</strong>
                    </span>
                    <button
                      onClick={removeCoupon}
                      className="text-emerald-700 hover:text-emerald-900 text-[11px] underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      value={inputCoupon}
                      onChange={(e) => setInputCoupon(e.target.value)}
                      placeholder="Enter coupon code"
                      className="flex-1 bg-white border border-ivory-300 px-3 py-2 text-xs text-charcoal-900 uppercase placeholder:normal-case focus:outline-none focus:border-charcoal-800 rounded-xs"
                    />
                    <Button type="submit" variant="secondary" size="sm">
                      Apply
                    </Button>
                  </form>
                )}
                {couponCode && getCouponShortfall() > 0 && (
                  <p className="text-[11px] text-amber-700 mt-1">
                    Add {formatINR(getCouponShortfall())} more to unlock this coupon.
                  </p>
                )}
                {couponFeedback && !couponCode && (
                  <p className="text-[11px] text-red-600 mt-1">{couponFeedback.text}</p>
                )}
              </div>

              {/* Breakdown */}
              <div className="space-y-2 text-xs text-charcoal-600">
                <div className="flex justify-between">
                  <span>Bag Subtotal</span>
                  <span className="font-medium text-charcoal-900">{formatINR(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Promotional Privilege Discount</span>
                    <span>-{formatINR(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Pan-India Express Logistics</span>
                  <span className="font-medium text-charcoal-900">
                    {shipping === 0 ? <span className="text-emerald-700 font-semibold">FREE</span> : formatINR(shipping)}
                  </span>
                </div>
                <div className="pt-3 border-t border-ivory-200 flex justify-between text-base font-bold text-charcoal-950">
                  <span>Estimated Total</span>
                  <span className="text-xl text-charcoal-950">{formatINR(total)}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <Button
                variant="primary"
                size="lg"
                className="w-full flex items-center justify-center gap-2"
                onClick={() => navigate('/checkout')}
              >
                Proceed to Checkout <ArrowRight className="w-4 h-4" />
              </Button>

              <div className="pt-2 text-center text-[10px] text-charcoal-500 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-sand-500" />
                <span>256-Bit SSL Encrypted Razorpay Checkout</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
