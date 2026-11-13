import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { CouponsPanel } from '../components/admin/CouponsPanel';
import { OrdersPanel } from '../components/admin/OrdersPanel';
import { ProductEditor } from '../components/admin/ProductEditor';

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const fail = (status: number, error: string) => ({ ok: false, status, json: async () => ({ error }) });

describe('admin panels', () => {
  const fetchMock = vi.fn();
  const onMessage = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    onMessage.mockReset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('coupons', () => {
    const existing = { _id: 'c1', code: 'FOOTZI10', description: '10% off', type: 'percent', value: 10, minOrderValue: 0, firstOrderOnly: false, isActive: true, used: 3 };

    it('lists coupons with their usage', async () => {
      fetchMock.mockResolvedValue(ok([existing, { ...existing, _id: 'c2', code: 'BIG', usageLimit: 5, used: 5 }]));
      render(<CouponsPanel token="t" isReadOnly={false} onMessage={onMessage} />);

      expect(await screen.findByText('FOOTZI10')).toBeInTheDocument();
      expect(screen.getByText('Used up')).toBeInTheDocument();
      expect(screen.getByText('5 / 5')).toBeInTheDocument();
    });

    it('creates a coupon, sending cleared limits as null and the code as typed', async () => {
      fetchMock.mockResolvedValueOnce(ok([])).mockResolvedValueOnce(ok({ message: 'Coupon DIWALI20 created' })).mockResolvedValueOnce(ok([]));
      render(<CouponsPanel token="t" isReadOnly={false} onMessage={onMessage} />);
      await screen.findByText(/no coupons yet/i);

      fireEvent.click(screen.getByRole('button', { name: /new coupon/i }));
      fireEvent.change(screen.getByLabelText('Code'), { target: { value: 'DIWALI20' } });
      fireEvent.change(screen.getByLabelText(/percent \(1-90\)/i), { target: { value: '20' } });
      fireEvent.change(screen.getByLabelText('Minimum order ₹'), { target: { value: '2000' } });
      fireEvent.click(screen.getByLabelText('First order only'));
      fireEvent.click(screen.getByRole('button', { name: /create coupon/i }));

      await waitFor(() => expect(onMessage).toHaveBeenCalledWith('Coupon DIWALI20 created'));
      const [url, init] = fetchMock.mock.calls[1];
      expect(url).toBe('/api/admin/coupons');
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body)).toMatchObject({
        code: 'DIWALI20',
        type: 'percent',
        value: 20,
        minOrderValue: 2000,
        maxDiscount: null,
        usageLimit: null,
        perUserLimit: null,
        expiresAt: null,
        firstOrderOnly: true,
      });
    });

    it('shows the server reason when a coupon is refused and keeps the form open', async () => {
      fetchMock.mockResolvedValueOnce(ok([])).mockResolvedValueOnce(fail(400, 'A coupon with the code X1 already exists.'));
      render(<CouponsPanel token="t" isReadOnly={false} onMessage={onMessage} />);
      await screen.findByText(/no coupons yet/i);

      fireEvent.click(screen.getByRole('button', { name: /new coupon/i }));
      fireEvent.change(screen.getByLabelText('Code'), { target: { value: 'X1' } });
      fireEvent.click(screen.getByRole('button', { name: /create coupon/i }));

      expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
      expect(screen.getByLabelText('Code')).toBeInTheDocument();
    });

    it('locks the code when editing and switches a coupon off', async () => {
      fetchMock.mockResolvedValue(ok([existing]));
      render(<CouponsPanel token="t" isReadOnly={false} onMessage={onMessage} />);
      await screen.findByText('FOOTZI10');

      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
      expect(screen.getByLabelText('Code')).toBeDisabled();
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      fireEvent.click(screen.getByRole('button', { name: /switch off/i }));
      await waitFor(() => expect(onMessage).toHaveBeenCalledWith('FOOTZI10 is now switched off'));
      const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')!;
      expect(put[0]).toBe('/api/admin/coupons/c1');
      expect(JSON.parse(put[1].body)).toEqual({ isActive: false });
    });

    it('is read-only for the demo admin', async () => {
      fetchMock.mockResolvedValue(ok([existing]));
      render(<CouponsPanel token="t" isReadOnly onMessage={onMessage} />);
      await screen.findByText('FOOTZI10');
      expect(screen.getByRole('button', { name: /new coupon/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled();
      expect(screen.getByRole('button', { name: /switch off/i })).toBeDisabled();
    });
  });

  describe('orders', () => {
    const order = (over: Record<string, unknown> = {}) => ({
      _id: 'o1',
      orderNumber: 'FTZ-AGR-1',
      customerName: 'Asha Rao',
      customerEmail: 'asha@example.com',
      customerPhone: '9876543210',
      createdAt: '2026-11-01T10:00:00.000Z',
      orderStatus: 'confirmed',
      paymentStatus: 'paid',
      subtotal: 4000,
      discount: 0,
      shippingFee: 0,
      total: 4000,
      refundedAmount: 0,
      items: [{ sku: 'S1', name: 'Test Loafer', size: 'UK 8', color: 'Tan', quantity: 1, lineTotal: 4000, image: 'x.jpg' }],
      shippingAddress: { name: 'Asha', phone: '9876543210', addressLine: '1 Road', city: 'Agra', state: 'UP', pincode: '282001' },
      statusHistory: [{ status: 'confirmed', timestamp: '2026-11-01T10:05:00.000Z', note: 'Payment verified' }],
      ...over,
    });
    const page = (orders: any[]) => ok({ orders, total: orders.length, page: 1, totalPages: 1 });

    it('lists orders, opens one, and filters by status through the server', async () => {
      fetchMock.mockResolvedValue(page([order()]));
      render(<OrdersPanel token="t" isReadOnly={false} onMessage={onMessage} />);

      const row = await screen.findByRole('button', { name: /FTZ-AGR-1/ });
      expect(row).toHaveAttribute('aria-expanded', 'false');
      fireEvent.click(row);
      expect(await screen.findByText('Payment verified')).toBeInTheDocument();
      expect(screen.getByText('asha@example.com', { exact: false })).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('Filter by status'), { target: { value: 'cancelled' } });
      await waitFor(() => expect(fetchMock.mock.calls.at(-1)![0]).toContain('status=cancelled'));
    });

    it('flags a cancelled order that was never refunded and retries the refund', async () => {
      const stuck = order({ orderStatus: 'cancelled' });
      fetchMock
        .mockResolvedValueOnce(page([stuck]))
        .mockResolvedValueOnce(ok({ message: 'Refund of ₹4000 issued.' }))
        .mockResolvedValueOnce(page([{ ...stuck, paymentStatus: 'refunded', refundedAmount: 4000 }]));
      render(<OrdersPanel token="t" isReadOnly={false} onMessage={onMessage} />);

      const row = await screen.findByRole('button', { name: /FTZ-AGR-1/ });
      expect(within(row).getByText('Refund due')).toBeInTheDocument();
      fireEvent.click(row);
      fireEvent.click(await screen.findByRole('button', { name: /retry refund of/i }));

      await waitFor(() => expect(onMessage).toHaveBeenCalledWith('Refund of ₹4000 issued.'));
      expect(fetchMock.mock.calls[1][0]).toBe('/api/admin/orders/o1/refund');
      await waitFor(() => expect(screen.queryByText('Refund due')).not.toBeInTheDocument());
    });

    it('offers no refund button for a settled order, and disables it for the demo admin', async () => {
      fetchMock.mockResolvedValue(page([order(), order({ _id: 'o2', orderNumber: 'FTZ-AGR-2', orderStatus: 'cancelled' })]));
      render(<OrdersPanel token="t" isReadOnly onMessage={onMessage} />);

      fireEvent.click(await screen.findByRole('button', { name: /FTZ-AGR-1/ }));
      expect(screen.queryByRole('button', { name: /retry refund/i })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /FTZ-AGR-2/ }));
      expect(screen.getByRole('button', { name: /retry refund/i })).toBeDisabled();
    });
  });

  describe('product editor', () => {
    const product = {
      id: 'p1',
      name: 'Test Loafer',
      category: 'Loafers',
      description: 'A fine loafer for testing',
      price: 3000,
      originalPrice: 4000,
      material: 'Calfskin',
      sole: 'Leather',
      badge: 'Best Seller',
      features: ['Hand stitched', 'Blake construction'],
      images: ['https://example.com/a.jpg'],
    };

    it('sends a clean payload: parsed numbers, trimmed lines, no empty images, and a null badge', async () => {
      const onSaved = vi.fn();
      fetchMock.mockResolvedValue(ok({ product: { ...product, price: 3200 } }));
      render(<ProductEditor product={product} token="t" onClose={vi.fn()} onSaved={onSaved} />);

      expect(screen.getByText('25% off')).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText('Selling price ₹'), { target: { value: '3200' } });
      fireEvent.change(screen.getByLabelText('Badge'), { target: { value: '' } });
      fireEvent.change(screen.getByLabelText('Features (one per line)'), { target: { value: ' Hand stitched \n\n Cushioned insole ' } });
      fireEvent.click(screen.getByRole('button', { name: /add image link/i }));
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('/api/admin/products/p1');
      expect(init.method).toBe('PUT');
      expect(JSON.parse(init.body)).toMatchObject({
        price: 3200,
        originalPrice: 4000,
        badge: null,
        features: ['Hand stitched', 'Cushioned insole'],
        images: ['https://example.com/a.jpg'],
      });
    });

    it('keeps the form open and shows the server reason when a save is refused', async () => {
      const onSaved = vi.fn();
      fetchMock.mockResolvedValue(fail(400, 'Original price cannot be lower than the selling price'));
      render(<ProductEditor product={product} token="t" onClose={vi.fn()} onSaved={onSaved} />);

      fireEvent.change(screen.getByLabelText('Selling price ₹'), { target: { value: '9000' } });
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      expect(await screen.findByText(/Original price cannot be lower/i)).toBeInTheDocument();
      expect(onSaved).not.toHaveBeenCalled();
    });

    it('explains plainly when file uploads are not set up, and rejects oversized files before sending', async () => {
      fetchMock.mockResolvedValue(fail(501, 'Image uploads are not set up on this server. Paste an https:// image link instead.'));
      const { container } = render(<ProductEditor product={product} token="t" onClose={vi.fn()} onSaved={vi.fn()} />);
      const input = container.querySelector('input[type=file]') as HTMLInputElement;

      const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' });
      fireEvent.change(input, { target: { files: [big] } });
      expect(await screen.findByText(/over 5 MB/i)).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();

      const small = new File([new Uint8Array([137, 80, 78, 71])], 'a.png', { type: 'image/png' });
      fireEvent.change(input, { target: { files: [small] } });
      expect(await screen.findByText(/not set up on this server/i)).toBeInTheDocument();
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).image).toMatch(/^data:image\/png;base64,/);
    });
  });
});
