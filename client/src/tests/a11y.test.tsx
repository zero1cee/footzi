import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe, toHaveNoViolations } from 'jest-axe';
import { MainLayout } from '../layouts/MainLayout';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { CartPage } from '../pages/CartPage';
import { SizeGuidePage } from '../pages/SizeGuidePage';
import { LeatherCarePage } from '../pages/LeatherCarePage';
import { WishlistPage } from '../pages/WishlistPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { TrackOrderPage } from '../pages/TrackOrderPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { MOCK_PRODUCTS } from '../data/mockProducts';

expect.extend(toHaveNoViolations);

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

const inLayout = (element: React.ReactElement, path = '/') =>
  render(
    <QueryClientProvider client={client()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="*" element={element} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('accessibility', () => {
  beforeEach(() => {
    // No backend in tests: every request fails, so pages render their built-in data
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    window.scrollTo = vi.fn() as any;
    useAuthStore.setState({ token: null, isAuthenticated: false, user: null });
    useCartStore.setState({ items: [], couponCode: null, coupon: null, isOpen: false });
  });
  afterEach(() => vi.unstubAllGlobals());

  const pages: [string, React.ReactElement][] = [
    ['home', <HomePage />],
    ['sign in', <LoginPage />],
    ['register', <RegisterPage />],
    ['empty bag', <CartPage />],
    ['size guide', <SizeGuidePage />],
    ['leather care', <LeatherCarePage />],
    ['wishlist', <WishlistPage />],
    ['forgot password', <ForgotPasswordPage />],
    ['find an order', <TrackOrderPage />],
  ];

  it.each(pages)('%s has no detectable violations', async (_name, element) => {
    const { container } = inLayout(element);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('the guest checkout form has no detectable violations', async () => {
    useCartStore.getState().addItem(MOCK_PRODUCTS[0], 'UK 8', 'Vintage Tan', '#8C4E28', 1);
    const { container } = inLayout(<CheckoutPage />, '/checkout');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('the bag with items has no detectable violations', async () => {
    useCartStore.getState().addItem(MOCK_PRODUCTS[0], 'UK 8', 'Vintage Tan', '#8C4E28', 1);
    const { container } = inLayout(<CartPage />, '/cart');
    expect(await axe(container)).toHaveNoViolations();
  });
});
