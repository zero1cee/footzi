import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import { SearchSuggest } from '../components/common/SearchSuggest';
import { RecentlyViewed } from '../components/ui/RecentlyViewed';
import { OrderReceiptPage } from '../pages/OrderReceiptPage';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { useRecentStore } from '../store/useRecentStore';

expect.extend(toHaveNoViolations);

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const fail = (status: number, error: string) => ({ ok: false, status, json: async () => ({ error }) });
const signedIn = { token: 'real-token', isAuthenticated: true, user: { _id: 'u1', name: 'Test', email: 't@e.com', role: 'customer' as const } };
const signedOut = { token: null, isAuthenticated: false, user: null };

describe('phase 6 - shopper experience', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    useAuthStore.setState(signedOut);
    useCartStore.setState({ items: [], wishlist: [], couponCode: null, coupon: null });
    useRecentStore.setState({ items: [] });
  });
  afterEach(() => vi.unstubAllGlobals());

  describe('wishlist follows the account', () => {
    it('keeps a guest wishlist in the browser without contacting the server', () => {
      useCartStore.getState().toggleWishlist('p1');
      expect(useCartStore.getState().wishlist).toEqual(['p1']);
      useCartStore.getState().toggleWishlist('p1');
      expect(useCartStore.getState().wishlist).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('saves a heart to the account when signed in, and removes it again', async () => {
      useAuthStore.setState(signedIn);
      fetchMock.mockResolvedValue(ok({ productIds: [] })); // answers the sign-in merge
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
      fetchMock.mockReset();
      fetchMock.mockResolvedValue(ok({ productIds: ['p1'] }));

      useCartStore.getState().toggleWishlist('p1');
      expect(useCartStore.getState().wishlist).toContain('p1'); // instant
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      expect(fetchMock.mock.calls[0][0]).toBe('/api/wishlist/p1');
      expect(fetchMock.mock.calls[0][1].method).toBe('PUT');

      fetchMock.mockResolvedValue(ok({ productIds: [] }));
      useCartStore.getState().toggleWishlist('p1');
      await vi.waitFor(() => expect(fetchMock.mock.calls[1][1].method).toBe('DELETE'));
    });

    it('puts the heart back how it was when the server refuses the change', async () => {
      useAuthStore.setState(signedIn);
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
      fetchMock.mockReset();
      fetchMock.mockResolvedValue(fail(400, 'This style is not available.'));
      useCartStore.setState({ wishlist: [] });

      useCartStore.getState().toggleWishlist('gone');
      expect(useCartStore.getState().wishlist).toEqual(['gone']);
      await vi.waitFor(() => expect(useCartStore.getState().wishlist).toEqual([]));
    });

    it('merges guest hearts into the account on sign-in and adopts the combined list', async () => {
      useCartStore.setState({ wishlist: ['guest1', 'both'] });
      fetchMock.mockResolvedValue(ok({ productIds: ['both', 'guest1', 'account1'] }));

      useAuthStore.setState(signedIn);
      await vi.waitFor(() => expect(useCartStore.getState().wishlist).toEqual(['both', 'guest1', 'account1']));
      const mergeCall = fetchMock.mock.calls.find(([url]) => url === '/api/wishlist/merge')!;
      expect(JSON.parse(mergeCall[1].body)).toEqual({ productIds: ['guest1', 'both'] });
    });

    it('keeps the local list when the server answers with something unexpected, and clears it on sign-out', async () => {
      useCartStore.setState({ wishlist: ['keep'] });
      fetchMock.mockResolvedValue(ok({ message: 'not a wishlist' }));
      useAuthStore.setState(signedIn);
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
      expect(useCartStore.getState().wishlist).toEqual(['keep']);

      useAuthStore.setState(signedOut);
      expect(useCartStore.getState().wishlist).toEqual([]);
    });
  });

  describe('search suggestions', () => {
    const Where = () => <div data-testid="where">{useLocation().pathname + useLocation().search}</div>;
    const renderBox = (onDone = vi.fn()) => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <SearchSuggest onDone={onDone} />
          <Routes>
            <Route path="*" element={<Where />} />
          </Routes>
        </MemoryRouter>
      );
      return { onDone, input: screen.getByRole('combobox', { name: 'Search footwear' }) };
    };
    const suggestions = [
      { id: 'a', name: 'The Belgravia Penny Loafer', slug: 'belgravia-penny-loafer', image: 'a.jpg', price: 3899, category: 'Loafers' },
      { id: 'b', name: 'Belgrave Chelsea Boot', slug: 'belgrave-chelsea-boot', image: 'b.jpg', price: 4999, category: 'Boots' },
    ];

    it('waits for two letters, then offers matches with names, categories and prices', async () => {
      fetchMock.mockResolvedValue(ok({ suggestions }));
      const { input } = renderBox();

      fireEvent.change(input, { target: { value: 'b' } });
      await new Promise((r) => setTimeout(r, 300));
      expect(fetchMock).not.toHaveBeenCalled();

      fireEvent.change(input, { target: { value: 'belg' } });
      const list = await screen.findByRole('listbox', { name: 'Suggested styles' });
      expect(fetchMock.mock.calls[0][0]).toBe('/api/products/suggest?q=belg');
      expect(screen.getAllByRole('option')).toHaveLength(2);
      expect(list).toHaveTextContent('The Belgravia Penny Loafer');
      expect(list).toHaveTextContent('₹3,899');
      expect(input).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('status')).toHaveTextContent('2 suggestions available');
    });

    it('works from the keyboard: arrows choose, Enter opens the style, Escape closes', async () => {
      fetchMock.mockResolvedValue(ok({ suggestions }));
      const { input, onDone } = renderBox();
      fireEvent.change(input, { target: { value: 'belg' } });
      await screen.findByRole('listbox');

      fireEvent.keyDown(input, { key: 'ArrowDown' });
      expect(input.getAttribute('aria-activedescendant')).toMatch(/-0$/);
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
      fireEvent.keyDown(input, { key: 'ArrowUp' });
      fireEvent.keyDown(input, { key: 'ArrowUp' }); // wraps to the last
      expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');

      fireEvent.keyDown(input, { key: 'Enter' });
      expect(screen.getByTestId('where')).toHaveTextContent('/product/belgrave-chelsea-boot');
      expect(onDone).toHaveBeenCalled();
    });

    it('Escape first closes the list, then the box', async () => {
      fetchMock.mockResolvedValue(ok({ suggestions }));
      const { input, onDone } = renderBox();
      fireEvent.change(input, { target: { value: 'belg' } });
      await screen.findByRole('listbox');

      fireEvent.keyDown(input, { key: 'Escape' });
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(onDone).not.toHaveBeenCalled();
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('still searches normally with Enter when nothing is highlighted', async () => {
      fetchMock.mockResolvedValue(ok({ suggestions }));
      const { input } = renderBox();
      fireEvent.change(input, { target: { value: 'chelsea boot' } });
      await screen.findByRole('listbox');

      fireEvent.submit(input.closest('form')!);
      expect(screen.getByTestId('where')).toHaveTextContent('/shop?search=chelsea%20boot');
    });

    it('says so when nothing matches, and falls back quietly when the server is down', async () => {
      fetchMock.mockResolvedValueOnce(ok({ suggestions: [] }));
      const { input } = renderBox();
      fireEvent.change(input, { target: { value: 'zzzz' } });
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('No styles match "zzzz"'));
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

      fetchMock.mockRejectedValue(new TypeError('offline'));
      fireEvent.change(input, { target: { value: 'loafer' } });
      await new Promise((r) => setTimeout(r, 350));
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      fireEvent.submit(input.closest('form')!);
      expect(screen.getByTestId('where')).toHaveTextContent('/shop?search=loafer');
    });

    it('has no detectable accessibility violations while open', async () => {
      fetchMock.mockResolvedValue(ok({ suggestions }));
      const { input } = renderBox();
      fireEvent.change(input, { target: { value: 'belg' } });
      await screen.findByRole('listbox');
      expect(await axe(input.closest('form')!)).toHaveNoViolations();
    });
  });

  describe('recently viewed', () => {
    const item = (n: number) => ({ id: `p${n}`, slug: `style-${n}`, name: `Style ${n}`, image: `${n}.jpg`, price: 1000 + n });

    it('puts the latest first, never lists a style twice, and keeps eight', () => {
      const { add } = useRecentStore.getState();
      for (let i = 1; i <= 10; i++) add(item(i));
      add(item(3));

      const ids = useRecentStore.getState().items.map((i) => i.id);
      expect(ids).toHaveLength(8);
      expect(ids[0]).toBe('p3');
      expect(new Set(ids).size).toBe(8);
      expect(ids).not.toContain('p1');
    });

    it('shows other styles but never the one being viewed, and hides itself when there are none', () => {
      const { container, rerender } = render(
        <MemoryRouter>
          <RecentlyViewed excludeId="p1" />
        </MemoryRouter>
      );
      expect(container).toBeEmptyDOMElement();

      useRecentStore.setState({ items: [item(1)] });
      rerender(
        <MemoryRouter>
          <RecentlyViewed excludeId="p1" />
        </MemoryRouter>
      );
      expect(container).toBeEmptyDOMElement();

      useRecentStore.setState({ items: [item(1), item(2)] });
      rerender(
        <MemoryRouter>
          <RecentlyViewed excludeId="p1" />
        </MemoryRouter>
      );
      expect(screen.getByRole('link', { name: /Style 2/ })).toHaveAttribute('href', '/product/style-2');
      expect(screen.queryByRole('link', { name: /Style 1/ })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
      expect(useRecentStore.getState().items).toEqual([]);
    });
  });

  describe('order receipt', () => {
    const order = (over: Record<string, unknown> = {}) => ({
      _id: 'o1',
      orderNumber: 'FTZ-AGR-555001',
      createdAt: '2026-11-01T10:00:00.000Z',
      paymentStatus: 'paid',
      paymentDetails: { gatewayPaymentId: 'pay_ABC123', paidAt: '2026-11-01T10:05:00.000Z' },
      customerEmail: 'asha@example.com',
      subtotal: 4000,
      discount: 400,
      couponCode: 'FOOTZI10',
      shippingFee: 0,
      total: 3600,
      refundedAmount: 0,
      items: [{ sku: 'S1', name: 'Test Loafer', size: 'UK 8', color: 'Tan', quantity: 1, unitPrice: 4000, lineTotal: 4000 }],
      shippingAddress: { name: 'Asha Rao', phone: '9876543210', addressLine: '1 Road', city: 'Agra', state: 'UP', pincode: '282001' },
      ...over,
    });
    const renderReceipt = () =>
      render(
        <MemoryRouter initialEntries={['/account/orders/o1/receipt']}>
          <Routes>
            <Route path="/account/orders/:id/receipt" element={<OrderReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

    beforeEach(() => useAuthStore.setState(signedIn));

    it('shows the items, discount, total and payment reference of a paid order', async () => {
      fetchMock.mockResolvedValue(ok(order()));
      const { container } = renderReceipt();

      expect(await screen.findByText('#FTZ-AGR-555001')).toBeInTheDocument();
      expect(screen.getByRole('table')).toHaveTextContent('Test Loafer');
      expect(screen.getByText('Discount (FOOTZI10)')).toBeInTheDocument();
      expect(screen.getByText('Total paid').nextSibling).toHaveTextContent('₹3,600');
      expect(screen.getByText('pay_ABC123')).toBeInTheDocument();
      expect(screen.getByText(/not a GST tax invoice/i)).toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();
    });

    it('prints through the browser and shows a refund line when there was one', async () => {
      const print = vi.fn();
      vi.stubGlobal('print', print);
      fetchMock.mockResolvedValue(ok(order({ paymentStatus: 'refunded', refundedAmount: 3600 })));
      renderReceipt();

      fireEvent.click(await screen.findByRole('button', { name: /print or save as pdf/i }));
      expect(print).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Refunded').nextSibling).toHaveTextContent('₹3,600');
    });

    it('offers no receipt for an unpaid order, and explains a missing one', async () => {
      fetchMock.mockResolvedValueOnce(ok(order({ paymentStatus: 'pending' })));
      const { unmount } = renderReceipt();
      expect(await screen.findByText('No receipt yet')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /print/i })).not.toBeInTheDocument();
      unmount();

      fetchMock.mockResolvedValueOnce(fail(404, 'Order not found'));
      renderReceipt();
      expect(await screen.findByText(/couldn't find that order/i)).toBeInTheDocument();
    });
  });
});
