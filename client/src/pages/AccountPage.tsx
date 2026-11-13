import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
  Plus,
  UserCog,
} from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useProducts } from '@/hooks/useProducts';
import { MOCK_PRODUCTS } from '@/data/mockProducts';
import { ProductCard } from '@/components/ui/ProductCard';
import { formatINR } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { orderService } from '@/services/orderService';
import { returnService } from '@/services/returnService';
import { ShoeSize } from '@/types';
import { ProfileSettings } from '@/components/account/ProfileSettings';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

type AccountTab = 'orders' | 'wishlist' | 'addresses' | 'returns' | 'profile';

const resolveTabFromPath = (pathname: string): AccountTab => {
  if (pathname.includes('/returns')) return 'returns';
  if (pathname.includes('/wishlist')) return 'wishlist';
  if (pathname.includes('/addresses')) return 'addresses';
  if (pathname.includes('/profile')) return 'profile';
  return 'orders';
};

const RETURN_WINDOW_DAYS = 7;

// Mirrors the server's rule: returns open once the order is delivered and close after 7 days
const returnEligibility = (order: any): { eligible: boolean; note: string } => {
  if (order.orderStatus !== 'delivered') {
    return { eligible: false, note: 'Size exchange and returns open once your order is delivered.' };
  }
  const delivered = (order.statusHistory || []).filter((h: any) => h.status === 'delivered');
  const at = new Date(delivered.length ? delivered[delivered.length - 1].timestamp : order.updatedAt || order.createdAt).getTime();
  const daysLeft = Math.ceil((at + RETURN_WINDOW_DAYS * 86_400_000 - Date.now()) / 86_400_000);
  return daysLeft > 0
    ? { eligible: true, note: `${daysLeft} day${daysLeft === 1 ? '' : 's'} left to exchange or return` }
    : { eligible: false, note: `The ${RETURN_WINDOW_DAYS}-day exchange and return window has closed.` };
};

export const AccountPage: React.FC = () => {
  useDocumentMeta({ title: 'My Account — Footzi', noindex: true });
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<AccountTab>(() => resolveTabFromPath(location.pathname));
  const { wishlist } = useCartStore();
  const { user, token, isAuthenticated, logout, addAddress, updateAddress, removeAddress } = useAuthStore();
  const { data: catalogData } = useProducts({ limit: 100 });

  useEffect(() => {
    setActiveTab(resolveTabFromPath(location.pathname));
  }, [location.pathname]);

  const handleTabChange = (tab: AccountTab) => {
    setActiveTab(tab);
    navigate(`/account/${tab}`);
  };

  const catalog = catalogData?.products && catalogData.products.length > 0 ? catalogData.products : MOCK_PRODUCTS;
  const wishlistedProducts = catalog.filter((p) => wishlist.includes(p.id));

  // Orders and Returns state
  const [orders, setOrders] = useState<any[]>([]);
  const [returnsList, setReturnsList] = useState<any[]>([]);
  const [, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Add Address Form State
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
  const [addrForm, setAddrForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    addressLine: '',
    city: '',
    state: '',
    pincode: '',
    isDefault: true,
  });
  const [addrError, setAddrError] = useState<string | null>(null);
  const [isSavingAddr, setIsSavingAddr] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const emptyAddress = (isDefault = false) => ({
    name: user?.name || '',
    phone: user?.phone || '',
    addressLine: '',
    city: '',
    state: '',
    pincode: '',
    isDefault,
  });

  const flash = (message: string) => {
    setFeedback(message);
    setTimeout(() => setFeedback(null), 4000);
  };

  const startEditingAddress = (addr: any) => {
    setEditingAddressId(addr._id);
    setAddrForm({
      name: addr.name,
      phone: addr.phone,
      addressLine: addr.addressLine,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      isDefault: Boolean(addr.isDefault),
    });
    setAddrError(null);
    setIsAddAddressOpen(true);
  };

  const closeAddressForm = () => {
    setIsAddAddressOpen(false);
    setEditingAddressId(null);
    setAddrError(null);
  };

  const handleDeleteAddress = async (id: string) => {
    const failure = await removeAddress(id);
    setConfirmDeleteId(null);
    if (failure) setAddrError(failure);
    else flash('Address removed.');
  };

  const handleMakeDefault = async (id: string) => {
    const failure = await updateAddress(id, { isDefault: true });
    if (failure) setAddrError(failure);
    else flash('Default delivery address updated.');
  };

  // Exchange/Return Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [exchangeType, setExchangeType] = useState<'exchange' | 'return'>('exchange');
  const [replacementSize, setReplacementSize] = useState<ShoeSize>('UK 9');
  const [exchangeReason, setExchangeReason] = useState<string>('Fit issue - too tight');
  const [comments, setComments] = useState('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [selectedItemIdx, setSelectedItemIdx] = useState(0);
  const [returnQty, setReturnQty] = useState(1);
  const [returnError, setReturnError] = useState<string | null>(null);

  // Fallback sample orders only when backend is offline
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
    if (!token || token.startsWith('demo-jwt-token')) {
      setOrders(fallbackOrders);
      return;
    }

    try {
      setIsLoading(true);
      const [fetchedOrders, fetchedReturns] = await Promise.all([
        orderService.getMyOrders(token).catch(() => null),
        returnService.getMyReturns(token).catch(() => null),
      ]);

      if (fetchedOrders !== null && Array.isArray(fetchedOrders)) {
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

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddrError(null);
    setIsSavingAddr(true);

    let failure: string | null = null;
    if (editingAddressId) {
      failure = await updateAddress(editingAddressId, addrForm);
    } else if (!(await addAddress(addrForm))) {
      failure = useAuthStore.getState().error || 'Please check address fields (10-digit phone & 6-digit PIN code).';
    }
    setIsSavingAddr(false);

    if (failure) {
      setAddrError(failure);
      return;
    }
    const wasEditing = Boolean(editingAddressId);
    closeAddressForm();
    setAddrForm(emptyAddress());
    flash(wasEditing ? 'Address updated.' : 'Delivery address saved to your Footzi profile.');
  };

  const returnDialogRef = useDialogA11y<HTMLDivElement>(isModalOpen && Boolean(selectedOrder), () => setIsModalOpen(false));

  const modalItem = selectedOrder?.items?.[selectedItemIdx] ?? selectedOrder?.items?.[0];

  const handleOpenExchangeModal = (order: any) => {
    setSelectedOrder(order);
    setSelectedItemIdx(0);
    setReturnQty(1);
    setReturnError(null);
    setIsModalOpen(true);
  };

  const handleSubmitReturnOrExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !selectedOrder.items || selectedOrder.items.length === 0) return;

    if (!token || !modalItem) return;
    setReturnError(null);

    try {
      setIsSubmittingReturn(true);
      // Only the choices are sent; the server takes prices and item details from the order itself
      const payload = {
        orderId: selectedOrder._id,
        type: exchangeType,
        customerComments: comments,
        items: [
          {
            sku: modalItem.sku,
            quantity: returnQty,
            reason: exchangeReason,
            replacementSize: exchangeType === 'exchange' ? replacementSize : undefined,
          },
        ],
      };

      const { returnRequest } = await returnService.requestReturn(payload, token);

      const newReturnEntry = {
        ...returnRequest,
        order: { orderNumber: selectedOrder.orderNumber, total: selectedOrder.total },
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
      setReturnError(err.message || 'Failed to submit your request');
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
                  {user?.role === 'admin' ? 'Administrator' : user?.role === 'demo_admin' ? 'Demo Admin (read-only)' : 'Footzi Privé Patron'}
                </Badge>
              </div>
              <p className="text-xs text-charcoal-500 mt-0.5">
                {user?.email}
                {user?.phone ? ` • ${user.phone}` : ''}
              </p>
            </div>
          </div>

          <div className="text-right flex items-center gap-3">
            {(user?.role === 'admin' || user?.role === 'demo_admin') && (
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
            onClick={() => handleTabChange('orders')}
            className={`pb-3 px-4 text-xs uppercase tracking-wider font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'orders'
                ? 'border-charcoal-900 text-charcoal-950'
                : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
            }`}
          >
            <Package className="w-4 h-4" /> My Orders ({orders.length})
          </button>

          <button
            onClick={() => handleTabChange('returns')}
            className={`pb-3 px-4 text-xs uppercase tracking-wider font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'returns'
                ? 'border-charcoal-900 text-charcoal-950'
                : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
            }`}
          >
            <RotateCcw className="w-4 h-4" /> Returns & Size Exchanges ({returnsList.length})
          </button>

          <button
            onClick={() => handleTabChange('wishlist')}
            className={`pb-3 px-4 text-xs uppercase tracking-wider font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'wishlist'
                ? 'border-charcoal-900 text-charcoal-950'
                : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
            }`}
          >
            <Heart className="w-4 h-4" /> Wishlist ({wishlistedProducts.length})
          </button>

          <button
            onClick={() => handleTabChange('addresses')}
            className={`pb-3 px-4 text-xs uppercase tracking-wider font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'addresses'
                ? 'border-charcoal-900 text-charcoal-950'
                : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
            }`}
          >
            <MapPin className="w-4 h-4" /> Saved Addresses ({user?.addresses?.length || 0})
          </button>

          <button
            onClick={() => handleTabChange('profile')}
            className={`pb-3 px-4 text-xs uppercase tracking-wider font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-charcoal-900 text-charcoal-950'
                : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
            }`}
          >
            <UserCog className="w-4 h-4" /> Profile & Security
          </button>
        </div>

        {/* Tab 1: Orders */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-xs border border-ivory-200 shadow-sm">
                <Package className="w-10 h-10 text-charcoal-300 mx-auto mb-3" />
                <h3 className="font-serif text-lg font-medium text-charcoal-900">
                  No orders recorded yet
                </h3>
                <p className="text-xs text-charcoal-500 mt-1 mb-4">
                  Explore our Agra handcrafted collection and place your first order to track dispatch here.
                </p>
                <Link to="/shop" className="text-xs uppercase tracking-wider font-semibold text-sand-600 underline">
                  Browse Footwear
                </Link>
              </div>
            ) : (
              orders.map((order) => {
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
                        {order._id && !String(order._id).startsWith('ord_fallback') && (
                          <Link
                            to={`/account/orders/${order._id}`}
                            className="text-[11px] font-semibold text-sand-700 hover:text-sand-900 underline"
                          >
                            View details
                          </Link>
                        )}
                      </div>
                    </div>

                    {firstItem && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <img decoding="async" loading="lazy"
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
                              {order.trackingNumber || 'Pending Allocation'}
                            </strong>{' '}
                            ({order.carrier || 'BlueDart Air Express'})
                          </p>
                          {returnEligibility(order).eligible ? (
                            <div className="flex flex-col sm:items-end gap-1">
                              <button
                                onClick={() => handleOpenExchangeModal(order)}
                                className="px-3 py-1.5 bg-ivory-100 hover:bg-ivory-200 border border-ivory-300 text-charcoal-800 text-[11px] font-semibold rounded-xs flex items-center gap-1 transition-colors"
                              >
                                <RotateCcw className="w-3 h-3 text-sand-600" /> Request Size Exchange
                              </button>
                              <span className="text-[10px] text-charcoal-500">{returnEligibility(order).note}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-charcoal-500 sm:text-right max-w-[16rem]">
                              {returnEligibility(order).note}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
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

        {/* Tab 5: Profile & Security */}
        {activeTab === 'profile' && <ProfileSettings />}

        {/* Tab 4: Addresses */}
        {activeTab === 'addresses' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-xs text-charcoal-600">
                Saved destinations auto-fill seamlessly during Express Checkout.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (isAddAddressOpen && !editingAddressId) {
                    closeAddressForm();
                    return;
                  }
                  setEditingAddressId(null);
                  setAddrError(null);
                  setAddrForm(emptyAddress((user?.addresses?.length ?? 0) === 0));
                  setIsAddAddressOpen(true);
                }}
                className="gap-1.5 text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add New Address
              </Button>
            </div>

            {isAddAddressOpen && (
              <form
                onSubmit={handleSaveAddress}
                className="bg-white p-6 rounded-xs border border-ivory-300 shadow-sm space-y-4 text-xs animate-fade-in"
              >
                <h3 className="font-serif text-lg font-medium text-charcoal-950 border-b border-ivory-200 pb-2">
                  {editingAddressId ? 'Edit Delivery Destination' : 'New Delivery Destination'}
                </h3>

                {addrError && (
                  <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xs">
                    {addrError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-charcoal-700 mb-1">Recipient Name</label>
                    <input
                      type="text"
                      required
                      value={addrForm.name}
                      onChange={(e) => setAddrForm({ ...addrForm, name: e.target.value })}
                      className="w-full bg-ivory-50 border border-ivory-300 px-3 py-2 rounded-xs focus:outline-none focus:border-charcoal-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-charcoal-700 mb-1">Mobile Number</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={addrForm.phone}
                      onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })}
                      className="w-full bg-ivory-50 border border-ivory-300 px-3 py-2 rounded-xs focus:outline-none focus:border-charcoal-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-charcoal-700 mb-1">Street Address & Apartment</label>
                  <input
                    type="text"
                    required
                    placeholder="42 Heritage Enclave, Civil Lines"
                    value={addrForm.addressLine}
                    onChange={(e) => setAddrForm({ ...addrForm, addressLine: e.target.value })}
                    className="w-full bg-ivory-50 border border-ivory-300 px-3 py-2 rounded-xs focus:outline-none focus:border-charcoal-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-semibold text-charcoal-700 mb-1">City</label>
                    <input
                      type="text"
                      required
                      value={addrForm.city}
                      onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })}
                      className="w-full bg-ivory-50 border border-ivory-300 px-3 py-2 rounded-xs focus:outline-none focus:border-charcoal-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-charcoal-700 mb-1">State</label>
                    <input
                      type="text"
                      required
                      value={addrForm.state}
                      onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value })}
                      className="w-full bg-ivory-50 border border-ivory-300 px-3 py-2 rounded-xs focus:outline-none focus:border-charcoal-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-charcoal-700 mb-1">6-Digit PIN Code</label>
                    <input
                      type="text"
                      required
                      pattern="\d{6}"
                      placeholder="282001"
                      value={addrForm.pincode}
                      onChange={(e) => setAddrForm({ ...addrForm, pincode: e.target.value })}
                      className="w-full bg-ivory-50 border border-ivory-300 px-3 py-2 rounded-xs focus:outline-none focus:border-charcoal-900"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-charcoal-700">
                  <input
                    type="checkbox"
                    checked={addrForm.isDefault}
                    onChange={(e) => setAddrForm({ ...addrForm, isDefault: e.target.checked })}
                  />
                  <span>Set as primary delivery address</span>
                </label>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={closeAddressForm}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" isLoading={isSavingAddr}>
                    {editingAddressId ? 'Save Changes' : 'Save Address'}
                  </Button>
                </div>
              </form>
            )}

            {!user?.addresses || user.addresses.length === 0 ? (
              <div className="bg-white p-10 text-center rounded-xs border border-ivory-200 shadow-sm">
                <MapPin className="w-9 h-9 text-charcoal-300 mx-auto mb-3" />
                <h3 className="font-serif text-lg font-medium text-charcoal-900">
                  No saved addresses yet
                </h3>
                <p className="text-xs text-charcoal-500 mt-1">
                  Add a home or office delivery destination above for 1-click checkout.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {user.addresses.map((addr, idx) => (
                  <div
                    key={addr._id || `${addr.pincode}-${idx}`}
                    className="bg-white p-6 rounded-xs border border-ivory-200 shadow-sm relative"
                  >
                    {addr.isDefault && (
                      <span className="absolute top-4 right-4 bg-sand-100 text-sand-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded-xs">
                        Default
                      </span>
                    )}
                    <h3 className="font-serif text-base font-semibold text-charcoal-900">
                      {addr.name}
                    </h3>
                    <p className="text-xs text-charcoal-600 mt-2 leading-relaxed">
                      {addr.addressLine}
                      <br />
                      {addr.city}, {addr.state} {addr.pincode}
                      <br />
                      India
                    </p>
                    <p className="text-xs text-charcoal-500 mt-2">Mobile: {addr.phone}</p>

                    {addr._id && (
                      <div className="mt-4 pt-3 border-t border-ivory-200 flex flex-wrap items-center gap-3 text-[11px] font-semibold">
                        <button onClick={() => startEditingAddress(addr)} className="text-charcoal-800 hover:text-sand-700 underline">
                          Edit
                        </button>
                        {!addr.isDefault && (
                          <button onClick={() => handleMakeDefault(addr._id!)} className="text-charcoal-800 hover:text-sand-700 underline">
                            Make default
                          </button>
                        )}
                        {confirmDeleteId === addr._id ? (
                          <span className="flex items-center gap-2 text-red-700">
                            Remove this address?
                            <button onClick={() => handleDeleteAddress(addr._id!)} className="underline">Yes, remove</button>
                            <button onClick={() => setConfirmDeleteId(null)} className="text-charcoal-600 underline">Keep</button>
                          </span>
                        ) : (
                          <button onClick={() => setConfirmDeleteId(addr._id!)} className="text-red-700 hover:text-red-800 underline">
                            Remove
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Size Exchange / Return Modal */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/60 backdrop-blur-xs">
          <div
            ref={returnDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Size exchange or return"
            tabIndex={-1}
            className="bg-white max-w-lg w-full rounded-xs shadow-2xl border border-ivory-300 p-6 sm:p-8 relative focus:outline-none"
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-charcoal-400 hover:text-charcoal-900"
          aria-label="Close"
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
                Order #{selectedOrder.orderNumber} • {modalItem?.name}
              </p>
            </div>

            <form onSubmit={handleSubmitReturnOrExchange} className="space-y-4 text-xs">
              {selectedOrder.items.length > 1 && (
                <div>
                  <label className="block font-semibold text-charcoal-800 mb-1.5">Which pair?</label>
                  <select
                    value={selectedItemIdx}
                    onChange={(e) => {
                      setSelectedItemIdx(Number(e.target.value));
                      setReturnQty(1);
                    }}
                    className="w-full border border-ivory-300 rounded-xs px-3 py-2 bg-white text-charcoal-850 focus:outline-hidden focus:border-charcoal-900"
                  >
                    {selectedOrder.items.map((it: any, idx: number) => (
                      <option key={it.sku} value={idx}>
                        {it.name} • {it.size} • {it.color}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {(modalItem?.quantity ?? 1) > 1 && (
                <div>
                  <label className="block font-semibold text-charcoal-800 mb-1.5">How many pairs?</label>
                  <select
                    value={returnQty}
                    onChange={(e) => setReturnQty(Number(e.target.value))}
                    className="w-full border border-ivory-300 rounded-xs px-3 py-2 bg-white text-charcoal-850 focus:outline-hidden focus:border-charcoal-900"
                  >
                    {Array.from({ length: modalItem.quantity }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              )}
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
                    Select Replacement Shoe Size (Current: {modalItem?.size})
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {(['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'] as ShoeSize[]).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setReplacementSize(sz)}
                        disabled={sz === modalItem?.size}
                        className={`py-2 border rounded-xs text-center font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
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

              {returnError && (
                <p role="alert" className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-xs p-2">{returnError}</p>
              )}

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
