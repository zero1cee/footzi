import React, { lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';
import { MainLayout } from '@/layouts/MainLayout';
import { HomePage } from '@/pages/HomePage';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { AdminRoute } from '@/components/common/AdminRoute';

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
const AdminDashboardPage = page(() => import('@/pages/AdminDashboardPage'), 'AdminDashboardPage');
const LoginPage = page(() => import('@/pages/LoginPage'), 'LoginPage');
const RegisterPage = page(() => import('@/pages/RegisterPage'), 'RegisterPage');
const ForgotPasswordPage = page(() => import('@/pages/ForgotPasswordPage'), 'ForgotPasswordPage');
const ResetPasswordPage = page(() => import('@/pages/ResetPasswordPage'), 'ResetPasswordPage');
const WishlistPage = page(() => import('@/pages/WishlistPage'), 'WishlistPage');
const SizeGuidePage = page(() => import('@/pages/SizeGuidePage'), 'SizeGuidePage');
const LeatherCarePage = page(() => import('@/pages/LeatherCarePage'), 'LeatherCarePage');

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

const queryClient = new QueryClient();

export const App: React.FC = () => {
  useEffect(() => {
    useAuthStore.getState().checkAuth().then(() => {
      useCartStore.getState().syncWithBackend();
      void useCartStore.getState().syncWishlist();
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
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
                  <OrderDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="account/orders/:id/receipt"
              element={
                <ProtectedRoute>
                  <OrderReceiptPage />
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
