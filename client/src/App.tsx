import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from '@/layouts/MainLayout';
import { HomePage } from '@/pages/HomePage';
import { ProductListingPage } from '@/pages/ProductListingPage';
import { ProductDetailPage } from '@/pages/ProductDetailPage';
import { CartPage } from '@/pages/CartPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { AccountPage } from '@/pages/AccountPage';
import { AdminDashboardPage } from '@/pages/AdminDashboardPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';

const queryClient = new QueryClient();

export const App: React.FC = () => {
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
            <Route path="account/*" element={<AccountPage />} />
            <Route path="wishlist" element={<AccountPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="brand-story" element={<Navigate to="/#heritage" replace />} />
            <Route path="admin" element={<AdminDashboardPage />} />
            <Route
              path="*"
              element={
                <div className="py-24 text-center">
                  <h1 className="font-serif text-3xl font-medium text-charcoal-900">404 — Silhouette Not Found</h1>
                  <p className="text-xs text-charcoal-500 mt-2">The page you were seeking has walked away.</p>
                  <a href="/" className="mt-4 inline-block text-xs uppercase tracking-widest font-semibold text-sand-600 underline">
                    Return to Footzi Atelier
                  </a>
                </div>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
