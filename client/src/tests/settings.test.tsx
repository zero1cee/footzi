import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AnnouncementBar } from '../components/common/AnnouncementBar';
import { SettingsPanel } from '../components/admin/SettingsPanel';
import { DEFAULT_SETTINGS, useSettingsStore } from '../store/useSettingsStore';
import { useCartStore } from '../store/useCartStore';
import { MOCK_PRODUCTS } from '../data/mockProducts';

expect.extend(toHaveNoViolations);

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const fail = (status: number, error: string) => ({ ok: false, status, json: async () => ({ error }) });

describe('shop settings on the storefront and in the admin', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    useSettingsStore.setState({ settings: DEFAULT_SETTINGS });
    useCartStore.setState({ items: [], couponCode: null, coupon: null });
  });
  afterEach(() => vi.unstubAllGlobals());

  describe('the settings store', () => {
    it('starts with the shop\'s usual rules, and adopts what the server says', async () => {
      expect(useSettingsStore.getState().settings).toEqual(DEFAULT_SETTINGS);
      const custom = { ...DEFAULT_SETTINGS, freeShippingThreshold: 2500, shippingFee: 99, returnWindowDays: 10 };
      fetchMock.mockResolvedValue(ok(custom));
      await useSettingsStore.getState().load();
      expect(useSettingsStore.getState().settings).toEqual(custom);
    });

    it('keeps the current rules when the server is unreachable, errors, or answers with nonsense', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('offline'));
      await useSettingsStore.getState().load();
      fetchMock.mockResolvedValueOnce(fail(500, 'boom'));
      await useSettingsStore.getState().load();
      fetchMock.mockResolvedValueOnce(ok({ unexpected: true }));
      await useSettingsStore.getState().load();
      expect(useSettingsStore.getState().settings).toEqual(DEFAULT_SETTINGS);
    });

    it('drives the bag\'s shipping preview', () => {
      useCartStore.getState().addItem(MOCK_PRODUCTS[0], 'UK 8', 'Vintage Tan', '#8C4E28', 1); // 3,899
      expect(useCartStore.getState().getShippingFee()).toBe(0);

      useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, freeShippingThreshold: 5000, shippingFee: 99 } });
      expect(useCartStore.getState().getShippingFee()).toBe(99);
      expect(useCartStore.getState().getTotal()).toBe(MOCK_PRODUCTS[0].price + 99);

      useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, freeShippingThreshold: 0, shippingFee: 99 } });
      expect(useCartStore.getState().getShippingFee()).toBe(0);
    });
  });

  describe('the announcement bar', () => {
    it('shows the label, the message, and the code highlighted where {code} is', () => {
      render(<AnnouncementBar />);
      expect(screen.getByText('Festive Privilege:')).toBeInTheDocument();
      expect(screen.getByText('AGRAFIRST')).toBeInTheDocument();
      expect(screen.getByText(/for 15% off first order/)).toBeInTheDocument();
      expect(screen.getByText(/7-Day Seamless Size Exchanges/)).toBeInTheDocument();
    });

    it('follows the settings: new wording, a different return window, and hiding it altogether', () => {
      useSettingsStore.setState({
        settings: { ...DEFAULT_SETTINGS, returnWindowDays: 14, announcement: { enabled: true, label: 'Sale:', message: 'Take ten percent off with {code} today', code: 'TENNER' } },
      });
      const { rerender } = render(<AnnouncementBar />);
      expect(screen.getByText('Sale:')).toBeInTheDocument();
      expect(screen.getByText('TENNER')).toBeInTheDocument();
      expect(screen.getByText(/14-Day Seamless Size Exchanges/)).toBeInTheDocument();

      useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, announcement: { ...DEFAULT_SETTINGS.announcement, enabled: false } } });
      rerender(<AnnouncementBar />);
      expect(screen.queryByText('AGRAFIRST')).not.toBeInTheDocument();
      expect(screen.queryByText('Festive Privilege:')).not.toBeInTheDocument();
    });

    it('shows a message with no {code} as plain text', () => {
      useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, announcement: { enabled: true, label: '', message: 'Closed on Sunday', code: '' } } });
      render(<AnnouncementBar />);
      expect(screen.getByText('Closed on Sunday')).toBeInTheDocument();
    });
  });

  describe('the settings panel', () => {
    const stored = { ...DEFAULT_SETTINGS };

    it('loads the current values and has no detectable accessibility violations', async () => {
      fetchMock.mockResolvedValue(ok(stored));
      const { container } = render(<SettingsPanel token="t" isReadOnly={false} onMessage={vi.fn()} />);

      expect(await screen.findByLabelText('Free shipping from (₹)')).toHaveValue(1999);
      expect(screen.getByLabelText('Shipping fee (₹)')).toHaveValue(149);
      expect(screen.getByLabelText('Return window (days)')).toHaveValue(7);
      expect(screen.getByText(/free shipping on orders of ₹1,999 or more, otherwise ₹149/i)).toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();
    });

    it('saves what was typed, shows the confirmation, and updates the storefront in this browser', async () => {
      const onMessage = vi.fn();
      const saved = { ...stored, freeShippingThreshold: 2500, shippingFee: 99 };
      fetchMock.mockResolvedValueOnce(ok(stored)).mockResolvedValueOnce(ok({ message: 'Settings saved. They apply to new orders straight away.', settings: saved }));
      render(<SettingsPanel token="secret" isReadOnly={false} onMessage={onMessage} />);

      fireEvent.change(await screen.findByLabelText('Free shipping from (₹)'), { target: { value: '2500' } });
      fireEvent.change(screen.getByLabelText('Shipping fee (₹)'), { target: { value: '99' } });
      fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

      await waitFor(() => expect(onMessage).toHaveBeenCalledWith('Settings saved. They apply to new orders straight away.'));
      const [url, init] = fetchMock.mock.calls[1];
      expect(url).toBe('/api/admin/settings');
      expect(init.method).toBe('PUT');
      expect(init.headers.Authorization).toBe('Bearer secret');
      expect(JSON.parse(init.body)).toMatchObject({ freeShippingThreshold: 2500, shippingFee: 99, orderExpiryMinutes: 30, returnWindowDays: 7 });
      expect(useSettingsStore.getState().settings.freeShippingThreshold).toBe(2500);
    });

    it('shows the server\'s reason and keeps what was typed when a value is refused', async () => {
      fetchMock.mockResolvedValueOnce(ok(stored)).mockResolvedValueOnce(fail(400, 'Hold stock for at most 24 hours'));
      render(<SettingsPanel token="t" isReadOnly={false} onMessage={vi.fn()} />);
      fireEvent.change(await screen.findByLabelText('Hold unpaid orders for (minutes)'), { target: { value: '90' } });
      fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/at most 24 hours/i);
      expect(screen.getByLabelText('Hold unpaid orders for (minutes)')).toHaveValue(90);
    });

    it('previews the bar as you type, and can fill in the starting values', async () => {
      fetchMock.mockResolvedValue(ok(stored));
      render(<SettingsPanel token="t" isReadOnly={false} onMessage={vi.fn()} />);
      fireEvent.change(await screen.findByLabelText('Message'), { target: { value: 'Free gift with {code}' } });
      fireEvent.change(screen.getByLabelText('Coupon code'), { target: { value: 'gift' } });
      const preview = screen.getByLabelText('Preview of the announcement bar');
      expect(preview).toHaveTextContent('Free gift with GIFT');

      fireEvent.click(screen.getByLabelText(/show the bar/i));
      expect(preview).toHaveTextContent('The bar is hidden.');

      fireEvent.click(screen.getByRole('button', { name: /fill in the starting values/i }));
      expect(screen.getByLabelText('Message')).toHaveValue('Use code {code} for 15% off first order');
    });

    it('is read-only for the demo admin', async () => {
      fetchMock.mockResolvedValue(ok(stored));
      render(<SettingsPanel token="t" isReadOnly onMessage={vi.fn()} />);
      expect(await screen.findByLabelText('Shipping fee (₹)')).toBeDisabled();
      expect(screen.getByRole('button', { name: /save settings/i })).toBeDisabled();
    });

    it('says so when the settings cannot be loaded', async () => {
      fetchMock.mockResolvedValue(fail(500, 'Failed'));
      render(<SettingsPanel token="t" isReadOnly={false} onMessage={vi.fn()} />);
      expect(await screen.findByRole('alert')).toBeInTheDocument();
    });
  });
});
