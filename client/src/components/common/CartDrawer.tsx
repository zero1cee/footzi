import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Trash2, Plus, Minus, ArrowRight, ShieldCheck, Tag, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { formatINR } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export const CartDrawer: React.FC = () => {
  const navigate = useNavigate();
  const {
    items,
    isOpen,
    closeCart,
    removeItem,
    updateQuantity,
    getSubtotal,
    getDiscountAmount,
    getShippingFee,
    getTotal,
    couponCode,
    applyCoupon,
    removeCoupon,
  } = useCartStore();

  const [inputCoupon, setInputCoupon] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{ success: boolean; text: string } | null>(null);

  if (!isOpen) return null;

  const subtotal = getSubtotal();
  const discount = getDiscountAmount();
  const shipping = getShippingFee();
  const total = getTotal();

  const freeShippingThreshold = 1999;
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const progressPercent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCoupon.trim()) return;
    const res = applyCoupon(inputCoupon);
    setCouponFeedback({ success: res.success, text: res.message });
    if (res.success) {
      setInputCoupon('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-charcoal-950/60 backdrop-blur-sm transition-opacity"
        onClick={closeCart}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-ivory-100 flex flex-col shadow-2xl animate-fade-in border-l border-ivory-300">
          {/* Header */}
          <div className="p-5 border-b border-ivory-300 flex items-center justify-between bg-ivory-50">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-charcoal-800" />
              <h2 className="font-serif text-xl font-medium tracking-wide text-charcoal-900">
                Shopping Bag ({items.reduce((acc, i) => acc + i.quantity, 0)})
              </h2>
            </div>
            <button
              onClick={closeCart}
              className="p-1.5 text-charcoal-500 hover:text-charcoal-900 transition-colors"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Meter */}
          {items.length > 0 && (
            <div className="bg-ivory-200/80 px-5 py-3 border-b border-ivory-300">
              <div className="text-[11px] text-charcoal-700 flex justify-between font-medium mb-1.5">
                <span>
                  {remainingForFreeShipping === 0 ? (
                    <span className="text-emerald-700 font-semibold">🎉 You have unlocked Free Pan-India Delivery!</span>
                  ) : (
                    <>Add <strong className="text-charcoal-950">{formatINR(remainingForFreeShipping)}</strong> more for Free Shipping</>
                  )}
                </span>
                <span className="text-charcoal-500">{progressPercent}%</span>
              </div>
              <div className="w-full bg-ivory-300 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-sand-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-ivory-200 flex items-center justify-center text-charcoal-400">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif text-lg font-medium text-charcoal-900">Your bag is empty</h3>
                  <p className="text-xs text-charcoal-500 max-w-xs">
                    Explore our handcrafted collection inspired by modern aesthetics and Agra shoemaking traditions.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    closeCart();
                    navigate('/shop');
                  }}
                >
                  Explore Footwear
                </Button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-3 bg-white border border-ivory-200 rounded-sm hover:border-sand-300 transition-colors"
                >
                  {/* Thumbnail */}
                  <img
                    src={item.image}
                    alt={item.productName}
                    className="w-20 h-24 object-cover object-center rounded-xs bg-ivory-200"
                  />

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <Link
                          to={`/product/${item.productSlug}`}
                          onClick={closeCart}
                          className="font-serif text-sm font-medium text-charcoal-900 hover:text-sand-600 line-clamp-1"
                        >
                          {item.productName}
                        </Link>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-charcoal-400 hover:text-red-600 transition-colors p-0.5"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Variant Specs */}
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-charcoal-500">
                        <span className="bg-ivory-200 px-1.5 py-0.5 rounded-xs font-medium text-charcoal-700">
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
                    </div>

                    {/* Quantity controls and price */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-ivory-100">
                      <div className="flex items-center border border-ivory-300 rounded-xs">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 text-charcoal-600 hover:text-charcoal-950"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 text-xs font-semibold text-charcoal-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          className="p-1 text-charcoal-600 hover:text-charcoal-950 disabled:opacity-30"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="text-xs font-semibold text-charcoal-900">
                        {formatINR(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout Area */}
          {items.length > 0 && (
            <div className="p-5 border-t border-ivory-300 bg-ivory-50 space-y-4">
              {/* Coupon input */}
              <div>
                {couponCode ? (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2 rounded-xs text-xs text-emerald-800">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Tag className="w-3.5 h-3.5" />
                      Coupon applied: <strong>{couponCode}</strong>
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
                      placeholder="Coupon code (e.g. FOOTZI10)"
                      className="flex-1 bg-white border border-ivory-300 px-3 py-1.5 text-xs text-charcoal-900 uppercase placeholder:normal-case focus:outline-none focus:border-charcoal-800 rounded-xs"
                    />
                    <Button type="submit" variant="secondary" size="sm">
                      Apply
                    </Button>
                  </form>
                )}
                {couponFeedback && !couponCode && (
                  <p className="text-[11px] text-red-600 mt-1">{couponFeedback.text}</p>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-1.5 text-xs text-charcoal-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium text-charcoal-900">{formatINR(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount</span>
                    <span>-{formatINR(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Estimated Pan-India Shipping</span>
                  <span className="font-medium text-charcoal-900">
                    {shipping === 0 ? <span className="text-emerald-700 font-semibold">FREE</span> : formatINR(shipping)}
                  </span>
                </div>
                <div className="pt-2 border-t border-ivory-300 flex justify-between text-sm font-semibold text-charcoal-900">
                  <span>Total Amount</span>
                  <span className="text-base text-charcoal-950 font-bold">{formatINR(total)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full flex items-center justify-center gap-2 tracking-widest text-xs"
                  onClick={() => {
                    closeCart();
                    navigate('/checkout');
                  }}
                >
                  Proceed to Checkout <ArrowRight className="w-3.5 h-3.5" />
                </Button>

                <div className="flex items-center justify-center gap-1.5 text-[10px] text-charcoal-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-sand-500" />
                  <span>Verified 256-Bit SSL Encrypted Razorpay Checkout</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
