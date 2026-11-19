import React, { lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { MainLayout } from '@/layouts/MainLayout';
import { HomePage } from '@/pages/HomePage';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { AdminRoute } from '@/components/common/AdminRoute';
import { initMetaPixel, initGA4, trackPageView } from '@/lib/analytics';

// Only the home page ships with the first load; every other screen is fetched when it is
// opened, so a shopper never downloads the admin panel or checkout code just to browse.
const page = <T extends Record<string, React.ComponentType<any>>>(load: () => Promise<T>, name: keyof T) =>
  lazy(async () => ({ default: (await load())[name] }));

const ProductListingPage = page(() => import('@/pages/ProductListingPage'), 'ProductListingPage');
const ProductDetailPage = page(() => import('@/pages/ProductDetailPage'), 'ProductDetailPage');
const CartPage = page(() => import('@/pages/CartPage'), 'CartPage');
const CheckoutPage = page(() => import('@/pages/CheckoutPage'), 'CheckoutPage');
const AccountPage = page(() => import('@/pages/AccountPage'), 'AccountPage');
const OrderDetailPage = page(() => import('@/pages/OrderDetailPage'), 'OrderDetailPage');
const OrderReceiptPage = page(() => import('@/pages/OrderReceiptPage'), 'OrderReceiptPage');
const TrackOrderPage = page(() => import('@/pages/TrackOrderPage'), 'TrackOrderPage');
const AdminDashboardPage = page(() => import('@/pages/AdminDashboardPage'), 'AdminDashboardPage');
const LoginPage = page(() => import('@/pages/LoginPage'), 'LoginPage');
const RegisterPage = page(() => import('@/pages/RegisterPage'), 'RegisterPage');
const ForgotPasswordPage = page(() => import('@/pages/ForgotPasswordPage'), 'ForgotPasswordPage');
const ResetPasswordPage = page(() => import('@/pages/ResetPasswordPage'), 'ResetPasswordPage');
const WishlistPage = page(() => import('@/pages/WishlistPage'), 'WishlistPage');
const SizeGuidePage = page(() => import('@/pages/SizeGuidePage'), 'SizeGuidePage');
const LeatherCarePage = page(() => import('@/pages/LeatherCarePage'), 'LeatherCarePage');
const PrivacyPolicyPage = page(() => import('@/pages/PrivacyPolicyPage'), 'PrivacyPolicyPage');
const TermsPage = page(() => import('@/pages/TermsPage'), 'TermsPage');
const ShippingPolicyPage = page(() => import('@/pages/ShippingPolicyPage'), 'ShippingPolicyPage');
const RefundPolicyPage = page(() => import('@/pages/RefundPolicyPage'), 'RefundPolicyPage');
const ContactUsPage = page(() => import('@/pages/ContactUsPage'), 'ContactUsPage');

const NotFoundPage: React.FC = () => {
  useDocumentMeta({ title: 'Page not found — Footzi', noindex: true });
  return (
    <div className="py-24 text-center">
      <h1 className="font-serif text-3xl font-medium text-charcoal-900">404 — Silhouette Not Found</h1>
      <p className="text-xs text-charcoal-500 mt-2">The page you were seeking has walked away.</p>
      <Link to="/" className="mt-4 inline-block text-xs uppercase tracking-widest font-semibold text-sand-600 underline">
        Return to Footzi Atelier
      </Link>
    </div>
  );
};

const RouteTracker: React.FC = () => {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);
  return null;
};

const queryClient = new QueryClient();

export const App: React.FC = () => {
  useEffect(() => {
    initMetaPixel();
    initGA4();
    void useSettingsStore.getState().load();
    useAuthStore.getState().checkAuth().then(() => {
      useCartStore.getState().syncWithBackend();
      void useCartStore.getState().syncWishlist();
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <RouteTracker />
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="shop" element={<ProductListingPage />} />
            <Route path="product/:slug" element={<ProductDetailPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route
              path="account/orders/:id"
              element={
                <ProtectedRoute>
                  <OrderDetailPage mode="account" />
                </ProtectedRoute>
              }
            />
            {/* Guest orders: the private link from the order email opens these, no sign-in needed */}
            <Route path="order/:id" element={<OrderDetailPage mode="guest" />} />
            <Route path="order/:id/receipt" element={<OrderReceiptPage mode="guest" />} />
            <Route path="track-order" element={<TrackOrderPage />} />
            <Route
              path="account/orders/:id/receipt"
              element={
                <ProtectedRoute>
                  <OrderReceiptPage mode="account" />
                </ProtectedRoute>
              }
            />
            <Route
              path="account/*"
              element={
                <ProtectedRoute>
                  <AccountPage />
                </ProtectedRoute>
              }
            />
            <Route path="wishlist" element={<WishlistPage />} />
            <Route path="size-guide" element={<SizeGuidePage />} />
            <Route path="leather-care" element={<LeatherCarePage />} />
            <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="shipping-policy" element={<ShippingPolicyPage />} />
            <Route path="refund-policy" element={<RefundPolicyPage />} />
            <Route path="contact" element={<ContactUsPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
            <Route path="brand-story" element={<Navigate to="/#heritage" replace />} />
            <Route
              path="admin"
              element={
                <AdminRoute>
                  <AdminDashboardPage />
                </AdminRoute>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
