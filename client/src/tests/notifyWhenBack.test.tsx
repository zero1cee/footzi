import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NotifyWhenBack } from '../components/ui/NotifyWhenBack';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { useAuthStore } from '../store/useAuthStore';
import { MOCK_PRODUCTS } from '../data/mockProducts';

expect.extend(toHaveNoViolations);

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const fail = (status: number, error: string) => ({ ok: false, status, json: async () => ({ error }) });

describe('back-in-stock requests', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    window.scrollTo = vi.fn() as any;
    useAuthStore.setState({ token: null, isAuthenticated: false, user: null });
  });
  afterEach(() => vi.unstubAllGlobals());

  describe('the form', () => {
    it('sends the email and size, then confirms what will happen', async () => {
      fetchMock.mockResolvedValue(ok({ message: "We'll email you once, as soon as this size is back in stock." }));
      render(<NotifyWhenBack sku="FTZ-BLG-TAN-UK8" sizeLabel="UK 8" />);

      expect(screen.getByLabelText(/tell me when uk 8 is back/i)).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText(/tell me when uk 8 is back/i), { target: { value: ' asha@example.com ' } });
      fireEvent.click(screen.getByRole('button', { name: /notify me/i }));

      expect(await screen.findByRole('status')).toHaveTextContent(/email you once/i);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('/api/stock-alerts');
      expect(JSON.parse(init.body)).toEqual({ email: 'asha@example.com', sku: 'FTZ-BLG-TAN-UK8' });
    });

    it("fills in a signed-in customer's email", () => {
      useAuthStore.setState({ token: 't', isAuthenticated: true, user: { _id: 'u', name: 'A', email: 'member@example.com', role: 'customer' } });
      render(<NotifyWhenBack sku="X-1234" sizeLabel="UK 9" />);
      expect((screen.getByLabelText(/tell me when/i) as HTMLInputElement).value).toBe('member@example.com');
    });

    it("shows the server's reason, such as the size already being in stock", async () => {
      fetchMock.mockResolvedValue(fail(409, 'Good news: this size is in stock right now.'));
      render(<NotifyWhenBack sku="X-1234" sizeLabel="UK 9" />);
      fireEvent.change(screen.getByLabelText(/tell me when/i), { target: { value: 'a@b.co' } });
      fireEvent.click(screen.getByRole('button', { name: /notify me/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/in stock right now/i);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('has no detectable accessibility violations', async () => {
      const { container } = render(<NotifyWhenBack sku="X-1234" sizeLabel="UK 9" />);
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('on the product page', () => {
    const product = (() => {
      const base = JSON.parse(JSON.stringify(MOCK_PRODUCTS[0]));
      base.sizes = ['UK 8', 'UK 9'];
      base.colors = [{ name: 'Tan', hex: '#8C4E28', imageIndex: 0 }];
      base.variants = [
        { id: 'v8', sku: 'FTZ-SOLD-UK8', size: 'UK 8', color: 'Tan', colorHex: '#8C4E28', stock: 0 },
        { id: 'v9', sku: 'FTZ-INST-UK9', size: 'UK 9', color: 'Tan', colorHex: '#8C4E28', stock: 8 },
      ];
      return base;
    })();

    const renderPage = () =>
      render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <MemoryRouter initialEntries={[`/product/${product.slug}`]}>
            <Routes>
              <Route path="/product/:slug" element={<ProductDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

    beforeEach(() => {
      fetchMock.mockImplementation(async (url: string) => {
        if (url.startsWith('/api/products/') && !url.includes('?')) return ok(product);
        if (url.startsWith('/api/products')) return ok({ products: [], total: 0, page: 1, totalPages: 1 });
        return ok({});
      });
    });

    it('keeps a sold-out size selectable, offers the alert for it, and blocks buying it', async () => {
      renderPage();
      const sold = await screen.findByRole('button', { name: 'UK 8, sold out' });
      expect(sold).not.toBeDisabled();

      fireEvent.click(sold);
      expect(await screen.findByText(/currently out of stock for this size/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tell me when uk 8 is back/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^add to bag$/i })).toBeDisabled();
    });

    it('shows no alert form for a size that is in stock, and hides it again when you switch', async () => {
      renderPage();
      fireEvent.click(await screen.findByRole('button', { name: 'UK 8, sold out' }));
      expect(await screen.findByLabelText(/tell me when uk 8 is back/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'UK 9' }));
      await waitFor(() => expect(screen.queryByLabelText(/tell me when/i)).not.toBeInTheDocument());
      expect(screen.getByRole('button', { name: /^add to bag$/i })).not.toBeDisabled();
    });
  });
});
