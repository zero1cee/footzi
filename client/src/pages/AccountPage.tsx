import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package,
  Heart,
  MapPin,
  RotateCcw,
  Clock,
  LogOut,
  Shield,
  CheckCircle2,
  Truck,
  X,
} from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { MOCK_PRODUCTS } from '@/data/mockProducts';
import { ProductCard } from '@/components/ui/ProductCard';
import { formatINR } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { orderService } from '@/services/orderService';
import { returnService } from '@/services/returnService';
import { ShoeSize } from '@/types';

export const AccountPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'orders' | 'wishlist' | 'addresses' | 'returns'>('orders');
  const { wishlist } = useCartStore();
  const { user, token, isAuthenticated, logout } = useAuthStore();

  const wishlistedProducts = MOCK_PRODUCTS.filter((p) => wishlist.includes(p.id));

  // Orders and Returns state
  const [orders, setOrders] = useState<any[]>([]);
  const [returnsList, setReturnsList] = useState<any[]>([]);
  const [, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Exchange/Return Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [exchangeType, setExchangeType] = useState<'exchange' | 'return'>('exchange');
  const [replacementSize, setReplacementSize] = useState<ShoeSize>('UK 9');
  const [exchangeReason, setExchangeReason] = useState<string>('Fit issue - too tight');
  const [comments, setComments] = useState('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // Fallback sample orders for patrons with brand new accounts
  const fallbackOrders = [
    {
      _id: 'ord_fallback_1',
      orderNumber: 'FTZ-AGR-882194',
      createdAt: new Date().toISOString(),
      orderStatus: 'shipped',
      carrier: 'BlueDart Air Express',
      trackingNumber: 'BD-AGR-98231456IN',
      total: 3899,
      items: [
        {
          name: 'The Agra Belgravia Penny Loafer',
          sku: 'FTZ-BLG-TAN-UK8',
          size: 'UK 8',
          color: 'Vintage Tan',
          unitPrice: 3899,
          quantity: 1,
          image: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=500&q=80',
        },
      ],
    },
  ];

  const fetchUserData = async () => {
    if (!token) {
      setOrders(fallbackOrders);
      return;
    }

    try {
      setIsLoading(true);
      const [fetchedOrders, fetchedReturns] = await Promise.all([
        orderService.getMyOrders(token).catch(() => null),
        returnService.getMyReturns(token).catch(() => null),
      ]);

      if (fetchedOrders && Array.isArray(fetchedOrders) && fetchedOrders.length > 0) {
        setOrders(fetchedOrders);
      } else {
        setOrders(fallbackOrders);
      }

      if (fetchedReturns && Array.isArray(fetchedReturns)) {
        setReturnsList(fetchedReturns);
      }
    } catch {
      setOrders(fallbackOrders);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [token]);

  const handleOpenExchangeModal = (order: any) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleSubmitReturnOrExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !selectedOrder.items || selectedOrder.items.length === 0) return;

    const firstItem = selectedOrder.items[0];

    try {
      setIsSubmittingReturn(true);
      const payload = {
        orderId: selectedOrder._id,
        type: exchangeType,
        customerComments: comments,
        items: [
          {
            sku: firstItem.sku,
            productName: firstItem.name,
            size: firstItem.size,
            color: firstItem.color,
            quantity: 1,
            price: firstItem.unitPrice || firstItem.lineTotal,
            reason: exchangeReason,
            replacementSize: exchangeType === 'exchange' ? replacementSize : undefined,
            replacementColor: firstItem.color,
          },
        ],
      };

      if (token) {
        await returnService.requestReturn(payload, token);
      }

      // Optimistic addition
      const newReturnEntry = {
        _id: `ret_${Date.now()}`,
        returnNumber: `RET-AGR-${Date.now().toString().slice(-6)}`,
        type: exchangeType,
        status: 'requested',
        items: payload.items,
        pickupTrackingNumber: `BD-REV-${Math.floor(10000000 + Math.random() * 90000000)}IN`,
        carrier: 'BlueDart Reverse Logistics',
        createdAt: new Date().toISOString(),
        order: {
          orderNumber: selectedOrder.orderNumber,
          total: selectedOrder.total,
        },
      };

      setReturnsList((prev) => [newReturnEntry, ...prev]);
      setIsModalOpen(false);
      setActiveTab('returns');
      setFeedback(
        exchangeType === 'exchange'
          ? `Size exchange registered successfully. Reverse pickup scheduled!`
          : `Return request registered. Complimentary pickup scheduled!`
      );
      setTimeout(() => setFeedback(null), 4500);
    } catch (err: any) {
      alert(err.message || 'Failed to submit exchange request');
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  return (
    <div className="py-10 md:py-16 bg-ivory-100 min-h-[85vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Profile Header */}
        <div className="bg-white p-6 sm:p-8 rounded-xs border border-ivory-200 shadow-sm mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-sand-100 border border-sand-300 flex items-center justify-center text-charcoal-900 font-serif text-2xl font-bold">
              {user ? user.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() : 'FP'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-2xl font-medium text-charcoal-950">
                  {user ? user.name : 'Footzi Patron'}
                </h1>
                <Badge variant="sand">
                  {user?.role === 'admin' ? 'Administrator' : 'Footzi Privé Patron'}
                </Badge>
              </div>
              <p className="text-xs text-charcoal-500 mt-0.5">
                {user?.email || 'patron@footzi.in'} • {user?.phone || '+91 98765 43210'}
              </p>
            </div>
          </div>

          <div className="text-right flex items-center gap-3">
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className="px-3 py-1.5 bg-charcoal-900 text-white hover:bg-charcoal-800 text-xs font-semibold rounded-xs transition-colors flex items-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5 text-sand-400" /> Admin & Supplier Portal
              </Link>
            )}

            {isAuthenticated ? (
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="px-3 py-1.5 bg-ivory-200 hover:bg-red-50 hover:text-red-700 text-charcoal-800 text-xs font-semibold rounded-xs transition-colors flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            ) : (
              <Link
                to="/login"
                className="px-4 py-1.5 bg-charcoal-900 text-white text-xs font-semibold rounded-xs"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-ivory-300 mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-3 px-4 text-xs uppercase tracking-wider font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'orders'
                ? 'border-charcoal-900 text-charcoal-950'
                : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
            }`}
          >
            <Package className="w-4 h-4" /> My Orders ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab('returns')}
            className={`pb-3 px-4 text-xs uppercase tracking-wider font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'returns'
                ? 'border-charcoal-900 text-charcoal-950'
                : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
            }`}
          >
            <RotateCcw className="w-4 h-4" /> Returns & Size Exchanges ({returnsList.length})
          </button>

          <button
            onClick={() => setActiveTab('wishlist')}
            className={`pb-3 px-4 text-xs uppercase tracking-wider font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'wishlist'
                ? 'border-charcoal-900 text-charcoal-950'
                : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
            }`}
          >
            <Heart className="w-4 h-4" /> Wishlist ({wishlistedProducts.length})
          </button>

          <button
            onClick={() => setActiveTab('addresses')}
            className={`pb-3 px-4 text-xs uppercase tracking-wider font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'addresses'
                ? 'border-charcoal-900 text-charcoal-950'
                : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
            }`}
          >
            <MapPin className="w-4 h-4" /> Saved Addresses
          </button>
        </div>

        {/* Tab 1: Orders */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {orders.map((order) => {
              const firstItem = order.items && order.items[0];
              return (
                <div
                  key={order._id || order.orderNumber}
                  className="bg-white p-6 rounded-xs border border-ivory-200 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-ivory-200 gap-2 mb-4">
                    <div>
                      <span className="font-mono text-xs font-bold text-charcoal-900">
                        #{order.orderNumber}
                      </span>
                      <p className="text-[11px] text-charcoal-500">
                        Placed on {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge variant={order.orderStatus === 'delivered' ? 'default' : 'sand'}>
                        {order.orderStatus || 'confirmed'}
                      </Badge>
                      <span className="font-serif text-sm font-semibold text-charcoal-900">
                        {formatINR(order.total)}
                      </span>
                    </div>
                  </div>

                  {firstItem && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={firstItem.image}
                          alt={firstItem.name}
                          className="w-16 h-16 object-cover rounded-xs border border-ivory-300"
                        />
                        <div>
                          <h4 className="font-serif text-sm font-semibold text-charcoal-900">
                            {firstItem.name}
                          </h4>
                          <p className="text-xs text-charcoal-500">
                            Size: {firstItem.size} • Color: {firstItem.color}
                          </p>
                          <div className="mt-1 text-[11px] text-charcoal-600 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-sand-600" />
                            <span>Supplier Dispatch: Agra Master Artisan Guild</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:items-end gap-2 text-xs">
                        <p className="text-charcoal-600">
                          Tracking:{' '}
                          <strong className="font-mono text-charcoal-900">
                            {order.trackingNumber || 'BD-AGR-98231456IN'}
                          </strong>{' '}
                          ({order.carrier || 'BlueDart Air Express'})
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenExchangeModal(order)}
                            className="px-3 py-1.5 bg-ivory-100 hover:bg-ivory-200 border border-ivory-300 text-charcoal-800 text-[11px] font-semibold rounded-xs flex items-center gap-1 transition-colors"
                          >
                            <RotateCcw className="w-3 h-3 text-sand-600" /> Request Size Exchange
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Returns & Exchanges */}
        {activeTab === 'returns' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xs border border-ivory-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-serif text-xl font-medium text-charcoal-950">
                    Footzi 7-Day Size Exchange & Return Guarantee
                  </h2>
                  <p className="text-xs text-charcoal-500 mt-0.5">
                    Footwear sizing requires precision. Complimentary reverse pickup from your doorstep across India.
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-xs text-sand-700 font-semibold bg-sand-100/60 px-3 py-1 rounded-xs">
                  <Truck className="w-3.5 h-3.5" /> 100% Free Reverse Courier
                </div>
              </div>

              {returnsList.length === 0 ? (
                <div className="p-8 text-center bg-ivory-50 rounded-xs border border-ivory-200">
                  <RotateCcw className="w-8 h-8 text-charcoal-400 mx-auto mb-2" />
                  <p className="font-serif text-sm font-medium text-charcoal-800">No active size exchanges or returns</p>
                  <p className="text-xs text-charcoal-500 mt-1">
                    If an ordered pair doesn't fit like a glove, click "Request Size Exchange" in the Orders tab.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {returnsList.map((ret) => (
                    <div
                      key={ret._id || ret.returnNumber}
                      className="p-5 border border-ivory-300 rounded-xs bg-ivory-50/50 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ivory-200 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-charcoal-900">
                            {ret.returnNumber}
                          </span>
                          <Badge variant={ret.type === 'exchange' ? 'sand' : 'outline'}>
                            {ret.type === 'exchange' ? 'Size Exchange' : 'Return for Refund'}
                          </Badge>
                          <Badge
                            variant={
                              ret.status === 'replacement_dispatched' || ret.status === 'refund_processed'
                                ? 'default'
                                : 'subtle'
                            }
                          >
                            {ret.status}
                          </Badge>
                        </div>
                        <span className="text-xs text-charcoal-500">
                          {new Date(ret.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      {ret.items && ret.items[0] && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div>
                            <p className="font-semibold text-charcoal-900">{ret.items[0].productName}</p>
                            <p className="text-charcoal-600 mt-0.5">
                              Current Size: <strong>{ret.items[0].size}</strong>
                              {ret.type === 'exchange' && ret.items[0].replacementSize && (
                                <span className="text-sand-700 font-semibold ml-2">
                                  → Replacement: {ret.items[0].replacementSize}
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-charcoal-500 mt-0.5">
                              Reason: {ret.items[0].reason}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-charcoal-600">
                              Reverse Courier:{' '}
                              <strong className="font-mono text-charcoal-900">
                                {ret.pickupTrackingNumber || 'Scheduled'}
                              </strong>
                            </p>
                            {ret.replacementTrackingNumber && (
                              <p className="text-emerald-700 font-semibold mt-0.5">
                                Replacement Courier:{' '}
                                <strong className="font-mono">{ret.replacementTrackingNumber}</strong>
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Wishlist */}
        {activeTab === 'wishlist' && (
          <div>
            {wishlistedProducts.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-xs border border-ivory-200">
                <Heart className="w-10 h-10 text-charcoal-300 mx-auto mb-3" />
                <h3 className="font-serif text-lg font-medium text-charcoal-900">Your wishlist is empty</h3>
                <p className="text-xs text-charcoal-500 mt-1 mb-4">
                  Tap the heart icon on any footwear style to save it to your personal curation.
                </p>
                <Link to="/shop" className="text-xs uppercase tracking-wider font-semibold text-sand-600 underline">
                  Explore Collections
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlistedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Addresses */}
        {activeTab === 'addresses' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xs border border-ivory-200 shadow-sm relative">
              <span className="absolute top-4 right-4 bg-sand-100 text-sand-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded-xs">
                Default
              </span>
              <h3 className="font-serif text-base font-semibold text-charcoal-900">
                {user ? user.name : 'Arjun Kapoor'}
              </h3>
              <p className="text-xs text-charcoal-600 mt-2 leading-relaxed">
                42 Heritage Enclave, Civil Lines<br />
                Agra, Uttar Pradesh 282001<br />
                India
              </p>
              <p className="text-xs text-charcoal-500 mt-2">Mobile: {user?.phone || '+91 98765 43210'}</p>
            </div>
          </div>
        )}

      </div>

      {/* Size Exchange / Return Modal */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/60 backdrop-blur-xs">
          <div className="bg-white max-w-lg w-full rounded-xs shadow-2xl border border-ivory-300 p-6 sm:p-8 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-charcoal-400 hover:text-charcoal-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <span className="text-[10px] uppercase tracking-widest text-sand-700 font-bold bg-sand-100 px-2 py-0.5 rounded-xs">
                Footzi Artisanal Fit Guarantee
              </span>
              <h3 className="font-serif text-2xl font-medium text-charcoal-950 mt-1">
                Size Exchange or Return
              </h3>
              <p className="text-xs text-charcoal-500 mt-1">
                Order #{selectedOrder.orderNumber} • {selectedOrder.items[0]?.name}
              </p>
            </div>

            <form onSubmit={handleSubmitReturnOrExchange} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-charcoal-800 mb-1.5">
                  Resolution Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExchangeType('exchange')}
                    className={`py-2 px-3 border rounded-xs text-center font-medium transition-all ${
                      exchangeType === 'exchange'
                        ? 'border-charcoal-900 bg-ivory-100 text-charcoal-950 font-semibold'
                        : 'border-ivory-300 text-charcoal-600 hover:border-ivory-400'
                    }`}
                  >
                    Size Exchange (Free)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExchangeType('return')}
                    className={`py-2 px-3 border rounded-xs text-center font-medium transition-all ${
                      exchangeType === 'return'
                        ? 'border-charcoal-900 bg-ivory-100 text-charcoal-950 font-semibold'
                        : 'border-ivory-300 text-charcoal-600 hover:border-ivory-400'
                    }`}
                  >
                    Full Return & Refund
                  </button>
                </div>
              </div>

              {exchangeType === 'exchange' && (
                <div>
                  <label className="block font-semibold text-charcoal-800 mb-1.5">
                    Select Replacement Shoe Size (Current: {selectedOrder.items[0]?.size})
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {(['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'] as ShoeSize[]).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setReplacementSize(sz)}
                        className={`py-2 border rounded-xs text-center font-semibold transition-all ${
                          replacementSize === sz
                            ? 'border-charcoal-900 bg-charcoal-900 text-white'
                            : 'border-ivory-300 text-charcoal-700 hover:border-ivory-400'
                        }`}
                      >
                        {sz.replace('UK ', '')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-charcoal-800 mb-1.5">
                  Reason for Exchange / Return
                </label>
                <select
                  value={exchangeReason}
                  onChange={(e) => setExchangeReason(e.target.value)}
                  className="w-full border border-ivory-300 rounded-xs px-3 py-2 bg-white text-charcoal-850 focus:outline-hidden focus:border-charcoal-900"
                >
                  <option value="Fit issue - too tight">Fit issue - too tight / snug</option>
                  <option value="Fit issue - too loose">Fit issue - too loose / heel slips</option>
                  <option value="Patina variation">Leather patina tone variation</option>
                  <option value="Defective craftsmanship">Craftsmanship flaw</option>
                  <option value="Changed mind">Changed mind</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-charcoal-800 mb-1.5">
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="e.g. Please arrange pickup after 2 PM..."
                  className="w-full border border-ivory-300 rounded-xs p-2.5 bg-white text-charcoal-850 focus:outline-hidden focus:border-charcoal-900"
                />
              </div>

              <div className="p-3 bg-sand-50/70 border border-sand-200 rounded-xs text-[11px] text-charcoal-700">
                <p className="font-semibold text-sand-800 flex items-center gap-1 mb-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sand-600" /> Complimentary Doorstep Reverse Pickup
                </p>
                A BlueDart courier agent will collect the boxed footwear with barcode label pre-printed.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmittingReturn}
                >
                  {isSubmittingReturn ? 'Submitting...' : 'Confirm Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
