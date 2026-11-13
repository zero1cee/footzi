import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { CheckoutPage } from '../pages/CheckoutPage';
import { OrderDetailPage } from '../pages/OrderDetailPage';
import { OrderReceiptPage } from '../pages/OrderReceiptPage';
import { TrackOrderPage } from '../pages/TrackOrderPage';
import { orderService } from '../services/orderService';
import { guestTokenFor, rememberGuestOrder, tokenFromHash } from '../lib/guestOrders';
import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';
import { MOCK_PRODUCTS } from '../data/mockProducts';

const TOKEN = 'a1'.repeat(32);
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const fail = (status: number, error: string) => ({ ok: false, status, json: async () => ({ error }) });
const signedIn = { token: 'real-token', isAuthenticated: true, user: { _id: 'u1', name: 'Test Member', email: 'member@example.com', role: 'customer' as const } };
const signedOut = { token: null, isAuthenticated: false, user: null };

const Where = () => {
  const l = useLocation();
  return <div data-testid="where">{l.pathname + l.search + l.hash}</div>;
};

describe('guest checkout', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    localStorage.clear();
    useAuthStore.setState(signedOut);
    useCartStore.setState({ items: [], wishlist: [], couponCode: null, coupon: null });
  });
  afterEach(() => vi.unstubAllGlobals());

  describe('the order secret in the link', () => {
    it('reads the secret after the #, and ignores anything that is not a 64-character secret', () => {
      expect(tokenFromHash(`#t=${TOKEN}`)).toBe(TOKEN);
      expect(tokenFromHash(`#x=1&t=${TOKEN.toUpperCase()}`)).toBe(TOKEN);
      expect(tokenFromHash('#t=short')).toBeNull();
      expect(tokenFromHash('')).toBeNull();
    });

    it('remembers a secret on this device, so the order reopens without the email', () => {
      expect(guestTokenFor('o1', '')).toBeNull();
      expect(guestTokenFor('o1', `#t=${TOKEN}`)).toBe(TOKEN); // opened from the email link
      expect(guestTokenFor('o1', '')).toBe(TOKEN); // later, from the same device
      expect(guestTokenFor('o2', '')).toBeNull();
    });

    it('keeps only the twenty most recent and survives blocked storage', () => {
      for (let i = 0; i < 25; i++) rememberGuestOrder(`o${i}`, TOKEN);
      expect(guestTokenFor('o0', '')).toBeNull();
      expect(guestTokenFor('o24', '')).toBe(TOKEN);

      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      expect(() => rememberGuestOrder('x', TOKEN)).not.toThrow();
      vi.restoreAllMocks();
    });
  });

  describe('talking to the server', () => {
    it('places a signed-in order on the account and a signed-out one as a guest, returning the secret', async () => {
      fetchMock.mockResolvedValue(ok({ order: { _id: 'o1' } }));
      await orderService.createOrder({} as any, 'member-token');
      expect(fetchMock.mock.calls[0][0]).toBe('/api/orders');
      expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer member-token');

      fetchMock.mockResolvedValue(ok({ order: { _id: 'o2' }, accessToken: TOKEN }));
      const guest = await orderService.createOrder({} as any, null);
      expect(fetchMock.mock.calls[1][0]).toBe('/api/orders/guest');
      expect(fetchMock.mock.calls[1][1].headers.Authorization).toBeUndefined();
      expect(guest).toMatchObject({ _id: 'o2', accessToken: TOKEN });
    });

    it('sends the order secret, not a sign-in, for a guest order', async () => {
      fetchMock.mockResolvedValue(ok({}));
      await orderService.createPaymentOrder('o1', { orderToken: TOKEN });
      expect(fetchMock.mock.calls[0][1].headers['X-Order-Token']).toBe(TOKEN);
      expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
    });
  });

  describe('checking out', () => {
    const renderCheckout = () =>
      render(
        <MemoryRouter initialEntries={['/checkout']}>
          <Routes>
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="*" element={<Where />} />
          </Routes>
        </MemoryRouter>
      );

    const fillForm = () => {
      const type = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
      type(/first name/i, 'Asha');
      type(/last name/i, 'Rao');
      type(/email address/i, 'asha@example.com');
      type(/mobile number/i, '9876543210');
      type(/street address/i, '1 Heritage Road');
      type(/^city/i, 'Agra');
      type(/^state/i, 'Uttar Pradesh');
      type(/pin/i, '282001');
    };

    it('starts with an empty form for a guest (no demo details) and says no account is needed', () => {
      useCartStore.getState().addItem(MOCK_PRODUCTS[0], 'UK 8', 'Vintage Tan', '#8C4E28', 1);
      renderCheckout();

      expect(screen.getByText(/checking out as a guest/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /have an account\? sign in/i })).toHaveAttribute('href', '/login');
      for (const field of ['firstName', 'lastName', 'email', 'address', 'city', 'state', 'pincode']) {
        expect((document.querySelector(`input[name="${field}"]`) as HTMLInputElement).value).toBe('');
      }
      expect(screen.queryByText(/interviewer|reviewer/i)).not.toBeInTheDocument();
    });

    it('does not show the guest prompt to a signed-in customer, and fills in their name and email', () => {
      useAuthStore.setState(signedIn);
      useCartStore.getState().addItem(MOCK_PRODUCTS[0], 'UK 8', 'Vintage Tan', '#8C4E28', 1);
      renderCheckout();

      expect(screen.queryByText(/checking out as a guest/i)).not.toBeInTheDocument();
      expect((document.querySelector('input[name="email"]') as HTMLInputElement).value).toBe('member@example.com');
    });

    it('places the order as a guest, pays with the order secret and ends on a private tracking link', async () => {
      useCartStore.getState().addItem(MOCK_PRODUCTS[0], 'UK 8', 'Vintage Tan', '#8C4E28', 1);
      fetchMock.mockImplementation(async (url: string) => {
        if (url === '/api/orders/guest') return ok({ order: { _id: 'ord1', orderNumber: 'FTZ-AGR-424242', total: 3899 }, accessToken: TOKEN });
        if (url === '/api/payments/create-order') return ok({ gatewayOrderId: 'order_x', demoMode: true, keyId: 'rzp_test_placeholder_key_id' });
        if (url === '/api/payments/verify') return ok({ verified: true, supplierOrder: { trackingNumber: 'BD-AGR-12345678IN' } });
        return fail(404, 'unexpected ' + url);
      });
      renderCheckout();
      fillForm();

      fireEvent.click(screen.getByRole('button', { name: /pay .* via razorpay/i }));
      fireEvent.click(await screen.findByRole('button', { name: /confirm & authorize payment/i }));

      await waitFor(() => expect(screen.getByText('FTZ-AGR-424242')).toBeInTheDocument(), { timeout: 3000 });
      const calls = fetchMock.mock.calls.map(([url, init]) => ({ url, headers: init?.headers ?? {}, body: init?.body }));
      const placed = calls.find((c) => c.url === '/api/orders/guest')!;
      expect(placed.headers.Authorization).toBeUndefined();
      expect(JSON.parse(placed.body).customerEmail).toBe('asha@example.com');
      for (const url of ['/api/payments/create-order', '/api/payments/verify']) {
        const call = calls.find((c) => c.url === url)!;
        expect(call.headers['X-Order-Token']).toBe(TOKEN);
        expect(call.headers.Authorization).toBeUndefined();
      }

      // The secret is remembered on this device, and the tracking link carries it after the #
      expect(guestTokenFor('ord1', '')).toBe(TOKEN);
      expect(screen.getByRole('link', { name: /track your order/i })).toHaveAttribute('href', `/order/ord1#t=${TOKEN}`);
      expect(screen.getByText(/emailed your confirmation to/i)).toHaveTextContent('asha@example.com');
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('a signed-in customer places the order on the account and tracks it there', async () => {
      useAuthStore.setState(signedIn);
      useCartStore.getState().addItem(MOCK_PRODUCTS[0], 'UK 8', 'Vintage Tan', '#8C4E28', 1);
      fetchMock.mockImplementation(async (url: string) => {
        if (url === '/api/orders') return ok({ order: { _id: 'ord2', orderNumber: 'FTZ-AGR-515151', total: 3899 } });
        if (url === '/api/payments/create-order') return ok({ gatewayOrderId: 'order_y', demoMode: true });
        if (url === '/api/payments/verify') return ok({ verified: true });
        return ok({ productIds: [] }); // wishlist and bag syncs after sign-in
      });
      renderCheckout();
      // Name and email come from the account; the address is still needed
      for (const [label, value] of [[/mobile number/i, '9876543210'], [/street address/i, '1 Heritage Road'], [/^city/i, 'Agra'], [/^state/i, 'Uttar Pradesh'], [/pin/i, '282001']] as const) {
        fireEvent.change(screen.getByLabelText(label), { target: { value } });
      }

      fireEvent.click(screen.getByRole('button', { name: /pay .* via razorpay/i }));
      fireEvent.click(await screen.findByRole('button', { name: /confirm & authorize payment/i }));

      await waitFor(() => expect(screen.getByText('FTZ-AGR-515151')).toBeInTheDocument(), { timeout: 3000 });
      expect(screen.getByRole('link', { name: /track your order/i })).toHaveAttribute('href', '/account/orders/ord2');
      expect(screen.queryByText(/emailed your confirmation to/i)).not.toBeInTheDocument();
    });

    it('shows the server\'s reason and keeps the bag when the order is refused', async () => {
      useCartStore.getState().addItem(MOCK_PRODUCTS[0], 'UK 8', 'Vintage Tan', '#8C4E28', 1);
      fetchMock.mockResolvedValue(fail(400, 'You already have unpaid orders waiting. Please complete or cancel one before placing another.'));
      renderCheckout();
      fillForm();

      fireEvent.click(screen.getByRole('button', { name: /pay .* via razorpay/i }));
      expect(await screen.findByRole('alert')).toHaveTextContent(/unpaid orders waiting/i);
      expect(useCartStore.getState().items).toHaveLength(1);
    });
  });

  describe('the guest order page', () => {
    const order = (over: Record<string, unknown> = {}) => ({
      _id: 'o1',
      orderNumber: 'FTZ-AGR-777001',
      isGuest: true,
      createdAt: '2026-11-01T10:00:00.000Z',
      orderStatus: 'confirmed',
      paymentStatus: 'paid',
      subtotal: 4000, discount: 0, shippingFee: 0, total: 4000, refundedAmount: 0,
      items: [{ sku: 'S1', name: 'Test Loafer', size: 'UK 8', color: 'Tan', quantity: 1, lineTotal: 4000, image: 'x.jpg' }],
      shippingAddress: { name: 'Asha', phone: '9876543210', addressLine: '1 Road', city: 'Agra', state: 'UP', pincode: '282001' },
      statusHistory: [{ status: 'confirmed', timestamp: '2026-11-01T10:05:00.000Z', note: 'Payment verified' }],
      ...over,
    });
    const renderOrder = (path: string) =>
      render(
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/order/:id" element={<OrderDetailPage mode="guest" />} />
            <Route path="/order/:id/receipt" element={<OrderReceiptPage mode="guest" />} />
            <Route path="/account/orders/:id" element={<Where />} />
            <Route path="*" element={<Where />} />
          </Routes>
        </MemoryRouter>
      );

    it('opens with the secret from the link and sends it as the order secret, never a sign-in', async () => {
      useAuthStore.setState(signedOut);
      fetchMock.mockResolvedValue(ok(order()));
      renderOrder(`/order/o1#t=${TOKEN}`);

      expect(await screen.findByText('Order #FTZ-AGR-777001')).toBeInTheDocument();
      expect(fetchMock.mock.calls[0][1].headers['X-Order-Token']).toBe(TOKEN);
      expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
      expect(screen.getByText(/this order isn't in an account/i)).toBeInTheDocument();
      // Signed out: points to sign-in/register, and keeps the secret in the return address
      expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /view or print your receipt/i })).toHaveAttribute('href', '/order/o1/receipt');
    });

    it('reopens from this device without the link, and offers to email a new link when it has no secret', async () => {
      rememberGuestOrder('o1', TOKEN);
      fetchMock.mockResolvedValue(ok(order()));
      const first = renderOrder('/order/o1');
      expect(await screen.findByText('Order #FTZ-AGR-777001')).toBeInTheDocument();
      first.unmount();

      renderOrder('/order/other');
      expect(await screen.findByText(/link is incomplete/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /email me my order link/i })).toHaveAttribute('href', '/track-order');
    });

    it('lets a signed-in customer add the order to their account, then shows it there', async () => {
      useAuthStore.setState(signedIn);
      fetchMock.mockImplementation(async (url: string) => {
        if (url === '/api/orders/o1') return ok(order());
        if (url === '/api/orders/o1/claim') return ok({ order: order({ isGuest: false }) });
        return ok({ productIds: [] });
      });
      renderOrder(`/order/o1#t=${TOKEN}`);

      fireEvent.click(await screen.findByRole('button', { name: /add this order to my account/i }));
      await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/account/orders/o1'));
      const claim = fetchMock.mock.calls.find(([url]) => url === '/api/orders/o1/claim')!;
      expect(claim[1].headers.Authorization).toBe('Bearer real-token');
      expect(JSON.parse(claim[1].body)).toEqual({ token: TOKEN });
    });

    it('explains an order that has moved into an account, and the receipt works the same way', async () => {
      fetchMock.mockResolvedValueOnce(fail(404, 'Order not found'));
      const { unmount } = renderOrder(`/order/o1#t=${TOKEN}`);
      expect(await screen.findByText(/sign in to see it there/i)).toBeInTheDocument();
      unmount();

      fetchMock.mockResolvedValueOnce(ok(order({ orderNumber: 'FTZ-AGR-777002', paymentDetails: { gatewayPaymentId: 'pay_1' } })));
      renderOrder(`/order/o1/receipt#t=${TOKEN}`);
      expect(await screen.findByText('#FTZ-AGR-777002')).toBeInTheDocument();
      expect(fetchMock.mock.calls[1][1].headers['X-Order-Token']).toBe(TOKEN);
    });
  });

  describe('find an order', () => {
    it('shows the same answer whatever was entered, and a message when the request fails', async () => {
      fetchMock.mockResolvedValueOnce(ok({ message: 'If that order number and email match, we have just emailed a link to the order.' }));
      const { unmount } = render(
        <MemoryRouter>
          <TrackOrderPage />
        </MemoryRouter>
      );
      fireEvent.change(screen.getByLabelText(/order number/i), { target: { value: 'ftz-agr-123456' } });
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'asha@example.com' } });
      fireEvent.click(screen.getByRole('button', { name: /email me the link/i }));

      expect(await screen.findByText(/we have just emailed a link/i)).toBeInTheDocument();
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ orderNumber: 'ftz-agr-123456', email: 'asha@example.com' });
      unmount();

      fetchMock.mockResolvedValueOnce(fail(429, 'Too many requests. Please try again shortly.'));
      render(
        <MemoryRouter>
          <TrackOrderPage />
        </MemoryRouter>
      );
      fireEvent.change(screen.getByLabelText(/order number/i), { target: { value: 'FTZ-AGR-1' } });
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'a@b.co' } });
      fireEvent.click(screen.getByRole('button', { name: /email me the link/i }));
      expect(await screen.findByRole('alert')).toHaveTextContent(/too many requests/i);
    });
  });
});
