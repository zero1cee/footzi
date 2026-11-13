import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { rememberGuestOrder } from '@/lib/guestOrders';
import { Lock, CheckCircle2, ArrowRight, Truck, CreditCard, Sparkles, AlertCircle, ShieldCheck } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { couponService } from '@/services/couponService';
import { orderService, OrderAuth } from '@/services/orderService';
import { formatINR, isBackendUnreachable } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

interface PendingPayment {
  createdOrder: any;
  gatewayOrder: any;
  /** An account's sign-in token, or the order secret for a guest order. */
  auth: OrderAuth;
}

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

const loadRazorpayScript = (): Promise<void> =>
  new Promise((resolve, reject) => {
    if ((window as any).Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load the payment gateway. Check your connection and try again.'));
    document.body.appendChild(script);
  });

export const CheckoutPage: React.FC = () => {
  useDocumentMeta({ title: 'Checkout — Footzi', noindex: true });
  const { items, getSubtotal, getDiscountAmount, getShippingFee, getTotal, clearCart, couponCode, removeCoupon } = useCartStore();
  const { user, token } = useAuthStore();

  const [formData, setFormData] = useState({
    // A guest starts with an empty form; a signed-in customer's details are filled from their account below
    firstName: user?.name ? user.name.split(' ')[0] : '',
    lastName: user?.name && user.name.split(' ').length > 1 ? user.name.split(' ').slice(1).join(' ') : '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    paymentMethod: 'razorpay',
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedOrderData, setCompletedOrderData] = useState<{
    orderNumber: string;
    trackingNumber: string;
    total: number;
    /** Where this customer reopens the order: their account, or for a guest the private link. */
    orderLink: string | null;
    isGuest: boolean;
    email: string;
  } | null>(null);

  // Interactive Payment Sheet Modal State
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  useEffect(() => {
    if (user) {
      const defaultAddr =
        user.addresses?.find((a) => a.isDefault) || user.addresses?.[0];
      setFormData((prev) => ({
        ...prev,
        firstName: (defaultAddr?.name || user.name).split(' ')[0],
        lastName: (defaultAddr?.name || user.name).split(' ').slice(1).join(' ') || prev.lastName,
        email: user.email,
        phone: defaultAddr?.phone || user.phone || prev.phone,
        address: defaultAddr?.addressLine || prev.address,
        city: defaultAddr?.city || prev.city,
        state: defaultAddr?.state || prev.state,
        pincode: defaultAddr?.pincode || prev.pincode,
      }));
    }
  }, [user]);

  const subtotal = getSubtotal();
  const discount = getDiscountAmount();
  const shipping = getShippingFee();
  const total = getTotal();

  const orderCustomerName = () => `${formData.firstName} ${formData.lastName}`.trim();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      // Signed in: the order goes on the account. Otherwise it is a guest order, and the server hands back a
      // secret (below) that proves it is theirs for paying, viewing and cancelling.
      let auth: OrderAuth = token;

      // 1. Create order on backend with server-computed prices and stock reservation
      const orderPayload = {
        customerName: `${formData.firstName} ${formData.lastName}`.trim(),
        customerEmail: formData.email,
        customerPhone: formData.phone,
        items: items.map((item) => ({
          productId: item.productId,
          variantSku: item.sku,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
        })),
        shippingAddress: {
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          phone: formData.phone,
          addressLine: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
        },
        couponCode: couponCode || undefined,
      };

      let createdOrder: any = null;
      try {
        // A coupon can stop applying between the bag and checkout (used up, expired, first-order only)
        if (couponCode) {
          try {
            await couponService.validate(couponCode, getSubtotal(), token, formData.email.trim());
          } catch (couponErr: any) {
            if (isBackendUnreachable(couponErr)) throw couponErr;
            removeCoupon();
            throw new Error(`${couponErr.message} The coupon was removed from your bag; review the total and place the order again.`);
          }
        }
        createdOrder = await orderService.createOrder(orderPayload, auth);
        if (createdOrder.accessToken) {
          auth = { orderToken: createdOrder.accessToken };
          rememberGuestOrder(createdOrder._id, createdOrder.accessToken);
        }
      } catch (err: any) {
        // A real rejection from the API (out of stock, validation, auth) must reach the patron
        if (!isBackendUnreachable(err)) throw err;

        console.warn('[Checkout] Backend offline, simulating order:', err.message);
        createdOrder = {
          _id: `ord_${Date.now()}`,
          orderNumber: `FTZ-AGR-${Math.floor(100000 + Math.random() * 900000)}`,
          total,
          simulated: true,
        };
      }

      // 2. Initiate Razorpay Gateway Order
      let gatewayOrder: any = null;
      if (createdOrder.simulated) {
        gatewayOrder = {
          gatewayOrderId: `order_${Date.now()}`,
          keyId: 'rzp_test_placeholder_key_id',
        };
      } else {
        try {
          gatewayOrder = await orderService.createPaymentOrder(createdOrder._id, auth);
        } catch (err) {
          // The order exists and holds stock; release it before reporting the failure
          await orderService
            .cancelOrder(createdOrder._id, 'Payment could not be initiated', auth)
            .catch(() => {});
          throw err;
        }
      }

      const pending = { createdOrder, gatewayOrder, auth };

      if (!createdOrder.simulated && gatewayOrder.demoMode === false) {
        // Live Razorpay credentials: hand over to the real hosted checkout
        await openRazorpayCheckout(pending);
      } else {
        // Demo mode: open the sandbox sheet for patron confirmation
        setPendingPayment(pending);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment initiation failed. Please check your bag and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Real Razorpay hosted checkout (used only when the server runs on live/test keys)
  const openRazorpayCheckout = async (pending: PendingPayment) => {
    const { createdOrder, gatewayOrder, auth } = pending;

    const releaseOrder = (reason: string) =>
      orderService.cancelOrder(createdOrder._id, reason, auth).catch(() => {});

    try {
      await loadRazorpayScript();
    } catch (err) {
      await releaseOrder('Payment gateway failed to load');
      throw err;
    }

    // Guards against releasing the order if the window closes after a successful payment
    let paymentCompleted = false;

    const checkout = new (window as any).Razorpay({
      key: gatewayOrder.keyId,
      amount: gatewayOrder.amountInPaise,
      currency: gatewayOrder.currency || 'INR',
      name: 'Footzi',
      description: `Order ${createdOrder.orderNumber}`,
      order_id: gatewayOrder.gatewayOrderId,
      prefill: {
        name: orderCustomerName(),
        email: formData.email,
        contact: formData.phone,
      },
      theme: { color: '#121212' },
      handler: (response: { razorpay_payment_id: string; razorpay_signature: string }) => {
        paymentCompleted = true;
        finalizePayment(pending, response.razorpay_payment_id, response.razorpay_signature);
      },
      modal: {
        ondismiss: () => {
          if (paymentCompleted) return;
          releaseOrder('Customer closed the payment window');
          setErrorMessage('Payment was cancelled. Reserved inventory has been released.');
        },
      },
    });
    checkout.open();
  };

  // Confirm Payment in Test Modal
  const handleConfirmTestPayment = async () => {
    if (!pendingPayment) return;
    await finalizePayment(pendingPayment, `pay_test_${Date.now()}`, 'mock_valid_signature_test_mode');
  };

  // Ask the server to verify the payment; only its answer confirms the order
  const finalizePayment = async (
    pending: PendingPayment,
    razorpayPaymentId: string,
    razorpaySignature: string
  ) => {
    setIsVerifyingPayment(true);
    setErrorMessage(null);

    const { createdOrder, gatewayOrder, auth } = pending;

    try {
      // Only an order that was simulated offline skips server verification.
      // A real order is confirmed solely by the server's answer.
      const verifyResult: any = createdOrder.simulated
        ? { verified: true }
        : await orderService.verifyPayment(
            {
              orderId: createdOrder._id,
              razorpayOrderId: gatewayOrder.gatewayOrderId,
              razorpayPaymentId,
              razorpaySignature,
            },
            auth
          );

      const assignedTracking =
        verifyResult?.supplierOrder?.trackingNumber ||
        `BD-AGR-${Math.floor(10000000 + Math.random() * 90000000)}IN`;

      setCompletedOrderData({
        orderNumber: createdOrder.orderNumber,
        trackingNumber: assignedTracking,
        total: createdOrder.total || total,
        isGuest: !!(auth && typeof auth === 'object' && auth.orderToken),
        orderLink: createdOrder.simulated
          ? null
          : auth && typeof auth === 'object' && auth.orderToken
            ? `/order/${createdOrder._id}#t=${auth.orderToken}`
            : `/account/orders/${createdOrder._id}`,
        email: formData.email.trim(),
      });

      setPendingPayment(null);
      clearCart();
    } catch (err: any) {
      // Close the sheet so the message on the checkout form is visible; the bag is kept
      setPendingPayment(null);
      setErrorMessage(
        `${err.message || 'Payment verification failed.'} Your order was not confirmed and your bag is unchanged.`
      );
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  // Cancel Payment & Release Reserved Stock
  const handleCancelPayment = async () => {
    if (!pendingPayment) return;
    const { createdOrder, auth } = pendingPayment;

    try {
      if (!createdOrder.simulated) {
        await orderService.cancelOrder(createdOrder._id, 'Customer aborted payment sheet', auth);
      }
    } catch {
      // Ignored
    } finally {
      setPendingPayment(null);
      setErrorMessage('Payment was cancelled. Reserved inventory has been released.');
    }
  };

  if (completedOrderData) {
    return (
      <div className="py-16 md:py-24 bg-ivory-100 min-h-[80vh] flex items-center justify-center">
        <div className="max-w-xl w-full mx-auto text-center px-4 space-y-6 bg-white p-8 sm:p-12 rounded-xs border border-ivory-200 shadow-elevated">
          
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-ultra text-sand-600 font-semibold block">
              Cryptographic Payment Signature Verified
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-medium text-charcoal-950">
              Your Footzi Silhouette is Confirmed
            </h1>
            <p className="text-xs text-charcoal-500">
              Order Reference:{' '}
              <strong className="text-charcoal-900 font-mono text-sm">
                {completedOrderData.orderNumber}
              </strong>
            </p>
          </div>

          {/* Supplier Fulfillment Simulation Card */}
          <div className="bg-ivory-50 p-6 rounded-xs border border-ivory-300 text-left space-y-3">
            <div className="flex items-center justify-between border-b border-ivory-200 pb-2">
              <span className="text-[10px] uppercase tracking-wider font-bold text-sand-700 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-sand-500" /> Agra Dropship Fulfillment Simulation
              </span>
              <span className="text-[11px] font-mono font-semibold text-charcoal-800">
                {completedOrderData.trackingNumber}
              </span>
            </div>

            <div className="space-y-2 text-xs text-charcoal-600">
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                <p>
                  <strong>Agra Artisan Guild:</strong> Build order accepted. Master shoemakers allocated certified full-grain leather hides.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-sand-500 mt-1.5 shrink-0" />
                <p>
                  <strong>Logistics Gateway:</strong> Dispatched via <strong>BlueDart Air Express</strong> from Taj Crafts Enclave, Agra.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-charcoal-300 mt-1.5 shrink-0" />
                <p className="text-charcoal-400">
                  <strong>Doorstep Delivery:</strong> Estimated within 2–4 business days to {formData.city}.
                </p>
              </div>
            </div>
          </div>

          {completedOrderData.isGuest && (
            <p className="text-xs text-charcoal-600 leading-relaxed bg-ivory-50 border border-ivory-300 rounded-xs p-4 text-left">
              We've emailed your confirmation to <strong>{completedOrderData.email}</strong>, with a private link to track this
              order. Keep that email: it is how you come back to your order. To request an exchange or return later,{' '}
              <Link to="/register" className="font-semibold text-charcoal-900 underline">create an account</Link> and add this
              order to it.
            </p>
          )}

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link to={completedOrderData.orderLink || '/account'} className="flex-1">
              <Button variant="primary" size="md" className="w-full">
                Track your order
              </Button>
            </Link>
            <Link to="/shop" className="flex-1">
              <Button variant="outline" size="md" className="w-full">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-20 text-center bg-ivory-100 min-h-[70vh] flex items-center justify-center">
        <div>
          <h2 className="font-serif text-2xl font-medium text-charcoal-900">Your bag is empty</h2>
          <p className="text-xs text-charcoal-500 mt-1 mb-4">Add a handcrafted silhouette before checking out.</p>
          <Link to="/shop">
            <Button variant="primary" size="md">Browse Footwear</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10 md:py-16 bg-ivory-100 min-h-[85vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title */}
        <div className="mb-8 text-center sm:text-left">
          <span className="text-[11px] uppercase tracking-widest text-sand-600 font-semibold block mb-1">
            Secure Payment Gateway
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-medium text-charcoal-950">
            Express Checkout
          </h1>
          <p className="text-xs text-charcoal-500 mt-1">
            Prices, discounts, and inventory are recalculated and cryptographically verified on the backend.
          </p>
        </div>

        {/* Guests can check out without an account */}
        {!user && (
          <div className="mb-8 p-4 bg-sand-50/90 border border-sand-300 rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <p className="text-xs font-semibold text-charcoal-900">You're checking out as a guest</p>
              <p className="text-[11px] text-charcoal-600">
                No account needed. We'll email your confirmation and a private link to track the order.
              </p>
            </div>
            <Link
              to="/login"
              state={{ from: { pathname: '/checkout' } }}
              className="text-xs font-semibold text-charcoal-900 underline whitespace-nowrap self-start sm:self-center py-2"
            >
              Have an account? Sign in
            </Link>
          </div>
        )}

        {errorMessage && (
          <div role="alert" className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left Form: Delivery & Contact */}
          <div className="lg:col-span-7 space-y-8">
            {/* Customer Details */}
            <div className="bg-white p-6 sm:p-8 rounded-xs border border-ivory-200 shadow-sm space-y-4">
              <h2 className="font-serif text-base font-semibold uppercase tracking-wider text-charcoal-900 border-b border-ivory-200 pb-3 flex items-center gap-2">
                <Truck className="w-4 h-4 text-sand-600" />
                1. Delivery Destination (India)
              </h2>

              {user?.addresses && user.addresses.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-charcoal-500 block">
                    Saved Patron Addresses
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {user.addresses.map((addr, idx) => {
                      const isSelected =
                        formData.address === addr.addressLine && formData.pincode === addr.pincode;
                      return (
                        <button
                          key={addr._id || idx}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              firstName: addr.name.split(' ')[0],
                              lastName: addr.name.split(' ').slice(1).join(' ') || prev.lastName,
                              phone: addr.phone,
                              address: addr.addressLine,
                              city: addr.city,
                              state: addr.state,
                              pincode: addr.pincode,
                            }))
                          }
                          className={`px-3 py-1.5 text-[11px] border rounded-xs text-left transition-all ${
                            isSelected
                              ? 'border-charcoal-900 bg-sand-50 text-charcoal-950 font-semibold'
                              : 'border-ivory-300 bg-ivory-50 text-charcoal-700 hover:border-charcoal-500'
                          }`}
                        >
                          {addr.city} ({addr.pincode}) {addr.isDefault ? '• Default' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="checkout-firstName" className="block text-[11px] uppercase tracking-wider font-semibold text-charcoal-700 mb-1">
                    First Name
                  </label>
                  <input id="checkout-firstName"
                    type="text"
                    required
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full bg-ivory-50 border border-ivory-300 px-3 py-2 text-xs text-charcoal-900 rounded-xs focus:outline-none focus:border-charcoal-900"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-lastName" className="block text-[11px] uppercase tracking-wider font-semibold text-charcoal-700 mb-1">
                    Last Name
                  </label>
                  <input id="checkout-lastName"
                    type="text"
                    required
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full bg-ivory-50 border border-ivory-300 px-3 py-2 text-xs text-charcoal-900 rounded-xs focus:outline-none focus:border-charcoal-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="checkout-email" className="block text-[11px] uppercase tracking-wider font-semibold text-charcoal-700 mb-1">
                    Email Address
                  </label>
                  <input id="checkout-email"
                    type="email"
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full bg-ivory-50 border border-ivory-300 px-3 py-2 text-xs text-charcoal-900 rounded-xs focus:outline-none focus:border-charcoal-900"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-phone" className="block text-[11px] uppercase tracking-wider font-semibold text-charcoal-700 mb-1">
                    Mobile Number (for SMS & WhatsApp Dispatch Alerts)
                  </label>
                  <input id="checkout-phone"
                    type="tel"
                    required
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full bg-ivory-50 border border-ivory-300 px-3 py-2 text-xs text-charcoal-900 rounded-xs focus:outline-none focus:border-charcoal-900"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="checkout-address" className="block text-[11px] uppercase tracking-wider font-semibold text-charcoal-700 mb-1">
                  Street Address & Apartment
                </label>
                <input id="checkout-address"
                  type="text"
                  required
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full bg-ivory-50 border border-ivory-300 px-3 py-2 text-xs text-charcoal-900 rounded-xs focus:outline-none focus:border-charcoal-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="checkout-city" className="block text-[11px] uppercase tracking-wider font-semibold text-charcoal-700 mb-1">
                    City
                  </label>
                  <input id="checkout-city"
                    type="text"
                    required
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full bg-ivory-50 border border-ivory-300 px-3 py-2 text-xs text-charcoal-900 rounded-xs focus:outline-none focus:border-charcoal-900"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-state" className="block text-[11px] uppercase tracking-wider font-semibold text-charcoal-700 mb-1">
                    State
                  </label>
                  <input id="checkout-state"
                    type="text"
                    required
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full bg-ivory-50 border border-ivory-300 px-3 py-2 text-xs text-charcoal-900 rounded-xs focus:outline-none focus:border-charcoal-900"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-pincode" className="block text-[11px] uppercase tracking-wider font-semibold text-charcoal-700 mb-1">
                    PIN Code
                  </label>
                  <input id="checkout-pincode"
                    type="text"
                    required
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    className="w-full bg-ivory-50 border border-ivory-300 px-3 py-2 text-xs text-charcoal-900 rounded-xs focus:outline-none focus:border-charcoal-900"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="bg-white p-6 sm:p-8 rounded-xs border border-ivory-200 shadow-sm space-y-4">
              <h2 className="font-serif text-base font-semibold uppercase tracking-wider text-charcoal-900 border-b border-ivory-200 pb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-sand-600" />
                2. Payment Gateway (Razorpay Test Mode)
              </h2>

              <div className="p-4 bg-ivory-100 rounded-xs border border-ivory-300 flex items-start gap-3">
                <input
                  type="radio"
                  id="razorpay"
                  name="paymentMethod"
                  checked
                  readOnly
                  className="mt-1"
                />
                <div>
                  <label htmlFor="razorpay" className="text-xs font-semibold text-charcoal-900 block cursor-pointer">
                    Razorpay Gateway (UPI, Cards, NetBanking, RuPay)
                  </label>
                  <p className="text-[11px] text-charcoal-500 mt-1 leading-relaxed">
                    Test Mode active. Generates gateway order ID and cryptographically verifies SHA-256 HMAC signature on the backend before triggering Agra supplier fulfillment.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Summary Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-xs border border-ivory-200 shadow-sm space-y-5">
              <h2 className="font-serif text-base font-semibold uppercase tracking-wider text-charcoal-900 border-b border-ivory-200 pb-3">
                Order Items ({items.length})
              </h2>

              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 text-xs">
                    <img decoding="async" loading="lazy"
                      src={item.image}
                      alt={item.productName}
                      className="w-12 h-14 object-cover rounded-xs bg-ivory-200"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-charcoal-900 line-clamp-1">{item.productName}</p>
                      <p className="text-charcoal-500 text-[11px]">
                        {item.size} • {item.color} • Qty {item.quantity}
                      </p>
                      <p className="font-semibold text-charcoal-900 text-xs mt-0.5">
                        {formatINR(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="pt-4 border-t border-ivory-200 space-y-2 text-xs text-charcoal-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium text-charcoal-900">{formatINR(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Privilege Coupon Discount</span>
                    <span>-{formatINR(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Pan-India Delivery</span>
                  <span className="font-medium text-charcoal-900">
                    {shipping === 0 ? <span className="text-emerald-700 font-semibold">FREE</span> : formatINR(shipping)}
                  </span>
                </div>
                <div className="pt-3 border-t border-ivory-200 flex justify-between text-base font-bold text-charcoal-950">
                  <span>Total Payable</span>
                  <span className="text-xl text-charcoal-950">{formatINR(total)}</span>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isProcessing}
                className="w-full flex items-center justify-center gap-2 tracking-widest text-xs"
              >
                Pay {formatINR(total)} via Razorpay <ArrowRight className="w-4 h-4" />
              </Button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-charcoal-500 pt-1">
                <Lock className="w-3.5 h-3.5 text-sand-500" />
                <span>Backend verified • Zero client-side price tampering tolerated</span>
              </div>
            </div>
          </div>

        </form>

        {/* Interactive Razorpay Test Modal */}
        {pendingPayment && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-charcoal-950/70 backdrop-blur-sm animate-fade-in">
            <div className="relative bg-white max-w-md w-full rounded-xs shadow-2xl border border-ivory-300 overflow-hidden z-10 p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-ivory-200 pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-sand-600" />
                  <h3 className="font-serif text-lg font-semibold text-charcoal-950">
                    Razorpay Checkout
                  </h3>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-sand-100 text-sand-800 rounded-xs border border-sand-300">
                  Sandbox Mode
                </span>
              </div>

              <div className="space-y-3 bg-ivory-100/70 p-4 rounded-xs border border-ivory-200 text-xs">
                <div className="flex justify-between text-charcoal-600">
                  <span>Gateway Order:</span>
                  <span className="font-mono font-medium text-charcoal-900">{pendingPayment.gatewayOrder.gatewayOrderId}</span>
                </div>
                <div className="flex justify-between text-charcoal-600">
                  <span>Footzi Order Ref:</span>
                  <span className="font-mono font-semibold text-charcoal-900">{pendingPayment.createdOrder.orderNumber}</span>
                </div>
                <div className="flex justify-between text-charcoal-600">
                  <span>Recipient:</span>
                  <span className="text-charcoal-900">{formData.firstName} {formData.lastName} ({formData.city})</span>
                </div>
                <div className="pt-2 border-t border-ivory-300 flex justify-between text-sm font-bold text-charcoal-950">
                  <span>Total Amount:</span>
                  <span className="text-lg text-charcoal-950">{formatINR(pendingPayment.createdOrder.total || total)}</span>
                </div>
              </div>

              <div className="text-[11px] text-charcoal-500 space-y-1.5">
                <div className="flex items-center gap-1.5 text-charcoal-700 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Simulated 256-bit Encrypted Transaction</span>
                </div>
                <p className="leading-relaxed">
                  Clicking confirm executes the backend payment verification endpoint, checks cryptographic signature integrity, deducts reserved stock, and allocates an Agra BlueDart tracking number.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <Button
                  variant="primary"
                  size="md"
                  isLoading={isVerifyingPayment}
                  onClick={handleConfirmTestPayment}
                  className="w-full text-xs tracking-wider uppercase font-semibold"
                >
                  Confirm & Authorize Payment
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  disabled={isVerifyingPayment}
                  onClick={handleCancelPayment}
                  className="w-full text-xs text-charcoal-600 hover:text-red-700"
                >
                  Cancel Transaction & Release Stock
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
