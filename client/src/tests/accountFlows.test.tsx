import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { OrderDetailPage } from '../pages/OrderDetailPage';

const customer = { _id: 'u1', name: 'Test Patron', email: 'test@example.com', role: 'customer' as const };
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const fail = (status: number, error: string) => ({ ok: false, status, json: async () => ({ error }) });

describe('account flows', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    useAuthStore.setState({ token: 'old-token', isAuthenticated: true, user: customer, error: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('changing a password', () => {
    it('keeps this device signed in by adopting the fresh token the server returns', async () => {
      fetchMock.mockResolvedValue(ok({ message: 'ok', token: 'fresh-token', user: customer }));

      const failure = await useAuthStore.getState().changePassword('old-pass-1', 'new-pass-1234');

      expect(failure).toBeNull();
      expect(useAuthStore.getState().token).toBe('fresh-token');
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('/api/auth/change-password');
      expect(init.headers.Authorization).toBe('Bearer old-token');
    });

    it('returns the server message and leaves the session untouched when it fails', async () => {
      fetchMock.mockResolvedValue(fail(400, 'Your current password is incorrect.'));

      const failure = await useAuthStore.getState().changePassword('wrong', 'new-pass-1234');

      expect(failure).toBe('Your current password is incorrect.');
      expect(useAuthStore.getState().token).toBe('old-token');
    });
  });

  describe('forgot password page', () => {
    it('shows the same confirmation the server gives, without revealing whether the account exists', async () => {
      fetchMock.mockResolvedValue(ok({ message: 'If an account exists for that email, a reset link is on its way.' }));
      render(
        <MemoryRouter>
          <ForgotPasswordPage />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'someone@example.com' } });
      fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

      expect(await screen.findByText(/reset link is on its way/i)).toBeInTheDocument();
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: 'someone@example.com' });
    });
  });

  describe('reset password page', () => {
    const renderReset = (search: string) =>
      render(
        <MemoryRouter initialEntries={[`/reset-password${search}`]}>
          <Routes>
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/account" element={<div>Account home</div>} />
          </Routes>
        </MemoryRouter>
      );

    it('asks for a new link when the token is missing', () => {
      renderReset('');
      expect(screen.getByText(/link is incomplete/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument();
    });

    it('refuses mismatched passwords without calling the server', async () => {
      renderReset(`?token=${'a'.repeat(64)}`);
      fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Brand-New-Pass1' } });
      fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'Different-Pass1' } });
      fireEvent.click(screen.getByRole('button', { name: /update password/i }));

      expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('signs the user in and moves to their account on success', async () => {
      useAuthStore.setState({ token: null, isAuthenticated: false, user: null });
      fetchMock.mockResolvedValue(ok({ message: 'ok', token: 'reset-session', user: customer }));
      renderReset(`?token=${'b'.repeat(64)}`);

      fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Brand-New-Pass1' } });
      fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'Brand-New-Pass1' } });
      fireEvent.click(screen.getByRole('button', { name: /update password/i }));

      expect(await screen.findByText('Account home')).toBeInTheDocument();
      expect(useAuthStore.getState().token).toBe('reset-session');
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ token: 'b'.repeat(64), newPassword: 'Brand-New-Pass1' });
    });

    it('offers a fresh link when the token has expired', async () => {
      fetchMock.mockResolvedValue(fail(400, 'This reset link is invalid or has expired. Please request a new one.'));
      renderReset(`?token=${'c'.repeat(64)}`);

      fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Brand-New-Pass1' } });
      fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'Brand-New-Pass1' } });
      fireEvent.click(screen.getByRole('button', { name: /update password/i }));

      expect(await screen.findByText(/invalid or has expired/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /request a new link/i })).toBeInTheDocument();
    });
  });

  describe('order detail page', () => {
    const baseOrder = {
      _id: 'o1',
      orderNumber: 'FTZ-AGR-100001',
      createdAt: '2026-11-01T10:00:00.000Z',
      orderStatus: 'confirmed',
      paymentStatus: 'paid',
      subtotal: 4000,
      discount: 0,
      shippingFee: 0,
      total: 4000,
      refundedAmount: 0,
      carrier: 'BlueDart Air Express',
      trackingNumber: 'BD-AGR-1234',
      items: [{ sku: 'SKU1', name: 'Test Loafer', size: 'UK 8', color: 'Tan', quantity: 1, lineTotal: 4000, image: 'x.jpg' }],
      shippingAddress: { name: 'Test Patron', phone: '9876543210', addressLine: '1 Road', city: 'Agra', state: 'UP', pincode: '282001' },
      statusHistory: [{ status: 'confirmed', timestamp: '2026-11-01T10:05:00.000Z', note: 'Payment verified' }],
      supplierOrderId: { shipmentEvents: [{ timestamp: '2026-11-01T10:06:00.000Z', status: 'SUBMITTED', location: 'Agra', note: 'queued' }] },
    };

    const renderDetail = () =>
      render(
        <MemoryRouter initialEntries={['/account/orders/o1']}>
          <Routes>
            <Route path="/account/orders/:id" element={<OrderDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

    it('shows items, tracking and history, and cancels a paid order only after confirmation', async () => {
      const cancelled = { ...baseOrder, orderStatus: 'cancelled', paymentStatus: 'refunded', refundedAmount: 4000 };
      fetchMock
        .mockResolvedValueOnce(ok(baseOrder)) // load
        .mockResolvedValueOnce(ok({ message: 'Order cancelled. A refund of ₹4000 has been issued to your original payment method.' })) // cancel
        .mockResolvedValueOnce(ok(cancelled)); // reload

      renderDetail();
      expect(await screen.findByText('Order #FTZ-AGR-100001')).toBeInTheDocument();
      expect(screen.getByText('Test Loafer')).toBeInTheDocument();
      expect(screen.getByText('BD-AGR-1234')).toBeInTheDocument();
      expect(screen.getByText('Payment verified')).toBeInTheDocument();

      // First click only asks for confirmation
      fireEvent.click(screen.getByRole('button', { name: /^cancel order$/i }));
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/will be refunded to your original payment method/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /yes, cancel order/i }));
      expect(await screen.findByText(/refund of ₹4000 has been issued/i)).toBeInTheDocument();
      await waitFor(() => expect(screen.getByText(/refunded to original payment method/i)).toBeInTheDocument());
      expect(screen.queryByRole('button', { name: /^cancel order$/i })).not.toBeInTheDocument();
    });

    it('offers no cancel button once the order has shipped', async () => {
      fetchMock.mockResolvedValueOnce(ok({ ...baseOrder, orderStatus: 'shipped' }));
      renderDetail();
      await screen.findByText('Order #FTZ-AGR-100001');
      expect(screen.queryByRole('button', { name: /cancel order/i })).not.toBeInTheDocument();
    });

    it('shows the server error when an order cannot be found', async () => {
      fetchMock.mockResolvedValueOnce(fail(404, 'Order not found'));
      renderDetail();
      expect(await screen.findByText(/couldn't find that order/i)).toBeInTheDocument();
    });
  });
});
