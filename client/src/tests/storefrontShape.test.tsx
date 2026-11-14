import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { storefrontView, productService } from '../services/productService';
import { MOCK_PRODUCTS } from '../data/mockProducts';

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

// A style as older catalogue entries have it: a shade and a size that have no stock records at all
const messy = (() => {
  const p = JSON.parse(JSON.stringify(MOCK_PRODUCTS[0]));
  p.colors = [
    { name: 'Tan', hex: '#8C4E28', imageIndex: 0 },
    { name: 'Black', hex: '#111111', imageIndex: 0 },
    { name: 'Ghost', hex: '#EEEEEE', imageIndex: 0 },
  ];
  p.sizes = ['UK 8', 'UK 9', 'UK 10'];
  p.variants = [
    { id: 'a', sku: 'T8', size: 'UK 8', color: 'Tan', colorHex: '#8C4E28', stock: 5 },
    { id: 'b', sku: 'T9', size: 'UK 9', color: 'Tan', colorHex: '#8C4E28', stock: 5 },
    { id: 'c', sku: 'B9', size: 'UK 9', color: 'Black', colorHex: '#111111', stock: 5 },
  ];
  return p;
})();

describe('the storefront shows only what can be bought', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    window.scrollTo = vi.fn() as any;
  });
  afterEach(() => vi.unstubAllGlobals());

  it('storefrontView drops shades and sizes with no stock records, but never empties a style', () => {
    const view = storefrontView(messy);
    expect(view.colors.map((c) => c.name)).toEqual(['Tan', 'Black']);
    expect(view.sizes).toEqual(['UK 8', 'UK 9']);

    // A style with no variants at all keeps what it lists
    const bare = { ...messy, variants: [] };
    expect(storefrontView(bare).colors).toHaveLength(3);
    expect(storefrontView(bare).sizes).toHaveLength(3);
  });

  it('the shop list and a style page apply it', async () => {
    fetchMock.mockImplementation(async (url: string) => (url.includes('/api/products/') && !url.includes('?') ? ok(messy) : ok({ products: [messy], total: 1, page: 1, totalPages: 1 })));
    const list = await productService.getProducts({});
    expect(list.products[0].colors.map((c) => c.name)).toEqual(['Tan', 'Black']);
    expect((await productService.getProductBySlug(messy.slug))!.sizes).toEqual(['UK 8', 'UK 9']);
  });

  describe('on the style page', () => {
    const renderPage = () =>
      render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <MemoryRouter initialEntries={[`/product/${messy.slug}`]}>
            <Routes>
              <Route path="/product/:slug" element={<ProductDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

    beforeEach(() => {
      fetchMock.mockImplementation(async (url: string) => {
        if (url.startsWith('/api/products/') && !url.includes('?')) return ok(messy);
        return ok({ products: [], total: 0, page: 1, totalPages: 1 });
      });
    });

    it('offers no size that no colour comes in, and marks a size the chosen colour is not made in', async () => {
      renderPage();
      await screen.findByRole('button', { name: 'UK 8' });
      expect(screen.queryByRole('button', { name: /UK 10/ })).not.toBeInTheDocument();

      // Tan comes in UK 8 and UK 9; Black only in UK 9
      fireEvent.click(await screen.findByRole('button', { name: /black/i }));
      expect(await screen.findByRole('button', { name: 'UK 8, not made in Black' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'UK 9' })).toBeInTheDocument();
    });

    it('moves to a size the new colour comes in, so the buy button is never left on a missing combination', async () => {
      renderPage();
      const uk8 = await screen.findByRole('button', { name: 'UK 8' });
      fireEvent.click(uk8);
      expect(uk8).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: /^add to bag$/i })).not.toBeDisabled();

      fireEvent.click(screen.getByRole('button', { name: /black/i }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'UK 9' })).toHaveAttribute('aria-pressed', 'true'));
      expect(screen.getByRole('button', { name: /^add to bag$/i })).not.toBeDisabled();
    });

    it('says a size is not made in a colour, and offers no back-in-stock form for it', async () => {
      renderPage();
      fireEvent.click(await screen.findByRole('button', { name: /black/i }));
      fireEvent.click(await screen.findByRole('button', { name: 'UK 8, not made in Black' }));
      expect(await screen.findByText(/UK 8 is not made in Black/)).toBeInTheDocument();
      expect(screen.queryByLabelText(/tell me when/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^add to bag$/i })).toBeDisabled();
    });
  });
});
