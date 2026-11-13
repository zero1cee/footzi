import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { SalesPanel } from '../components/admin/SalesPanel';
import { CustomersPanel } from '../components/admin/CustomersPanel';
import { BarChart } from '../components/admin/BarChart';
import { adminService } from '../services/adminService';

expect.extend(toHaveNoViolations);

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const fail = (status: number, error: string) => ({ ok: false, status, json: async () => ({ error }) });

const report = (days = 30) => ({
  days,
  series: Array.from({ length: days }, (_, i) => ({ date: `2026-10-${String((i % 28) + 1).padStart(2, '0')}`, orders: i % 3 === 0 ? 1 : 0, revenue: i % 3 === 0 ? 2000 : 0, refunded: 0 })),
  totals: { revenue: 40000, orders: 12, refunded: 3000, averageOrderValue: 3583 },
  funnel: { started: 20, paid: 12, abandoned: 6, guestOrders: 4, conversionPercent: 60 },
  topProducts: [{ productId: 'p1', name: 'The Belgravia Penny Loafer', units: 7, revenue: 27293 }],
  coupons: [{ code: 'FOOTZI10', uses: 3, discountGiven: 1200, revenue: 10800 }],
});

describe('admin sales and customers', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  describe('bar chart', () => {
    it('is labelled with its total and highest bar, and each bar has its own value', () => {
      const { container } = render(<BarChart data={[{ label: '1 Nov', value: 1000 }, { label: '2 Nov', value: 4000 }]} title="Revenue" format={(n) => `₹${n}`} />);
      const svg = screen.getByRole('img');
      expect(svg).toHaveAccessibleName(/Revenue\. ₹5000 in total across 2 bars\. Highest: 2 Nov, ₹4000\./);
      expect([...container.querySelectorAll('title')].map((t) => t.textContent)).toEqual(['1 Nov: ₹1000', '2 Nov: ₹4000']);
    });

    it('copes with no data and with all-zero data', () => {
      const { rerender } = render(<BarChart data={[]} title="Revenue" format={(n) => `${n}`} />);
      expect(screen.getByRole('img')).toHaveAccessibleName(/No data/);
      rerender(<BarChart data={[{ label: 'a', value: 0 }]} title="Revenue" format={(n) => `${n}`} />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });

  describe('sales panel', () => {
    it('shows the figures, best sellers and coupons from the server', async () => {
      fetchMock.mockResolvedValue(ok(report()));
      const { container } = render(<SalesPanel token="t" />);

      expect(await screen.findByText('₹40,000')).toBeInTheDocument();
      expect(screen.getByText('₹3,000 refunded')).toBeInTheDocument();
      expect(screen.getByText('60%')).toBeInTheDocument();
      expect(screen.getByText(/12 of 20 · 6 abandoned · 4 guest/)).toBeInTheDocument();
      expect(screen.getByText('The Belgravia Penny Loafer')).toBeInTheDocument();
      expect(screen.getByText('FOOTZI10')).toBeInTheDocument();
      expect(fetchMock.mock.calls[0][0]).toBe('/api/admin/reports/sales?days=30');
      expect(await axe(container)).toHaveNoViolations();
    });

    it('reloads for another period, and the pressed button shows which one is on', async () => {
      fetchMock.mockImplementation(async (url: string) => ok(report(Number(/days=(\d+)/.exec(url)![1]))));
      render(<SalesPanel token="t" />);
      await screen.findByText('₹40,000');
      expect(screen.getByRole('button', { name: '30 days' })).toHaveAttribute('aria-pressed', 'true');

      fireEvent.click(screen.getByRole('button', { name: '7 days' }));
      await waitFor(() => expect(fetchMock.mock.calls.at(-1)![0]).toBe('/api/admin/reports/sales?days=7'));
      expect(screen.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('groups a year into weeks, and offers the same numbers as a table', async () => {
      fetchMock.mockResolvedValue(ok(report(365)));
      render(<SalesPanel token="t" />);
      fireEvent.click(await screen.findByRole('button', { name: '1 year' }));
      expect(await screen.findByText('Revenue by week')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /view as table/i }));
      const table = screen.getByRole('table', { name: /revenue kept per week/i });
      expect(within(table).getAllByRole('row').length).toBe(1 + Math.ceil(365 / 7));
    });

    it('says so plainly when the report cannot be loaded, and when there were no sales', async () => {
      fetchMock.mockResolvedValueOnce(fail(500, 'Something went wrong on our side.'));
      const { unmount } = render(<SalesPanel token="t" />);
      expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
      unmount();

      fetchMock.mockResolvedValue(ok({ ...report(), topProducts: [], coupons: [] }));
      render(<SalesPanel token="t" />);
      expect(await screen.findByText('No sales in this period.')).toBeInTheDocument();
      expect(screen.getByText('No coupons were used in this period.')).toBeInTheDocument();
    });
  });

  describe('customers panel', () => {
    const page = (customers: any[], over: Record<string, unknown> = {}) => ok({ customers, total: customers.length, page: 1, totalPages: 1, accounts: 9, ...over });
    const asha = { email: 'asha@example.com', customerName: 'Asha Rao', orders: 3, spent: 11250, lastOrderAt: '2026-11-01T10:00:00.000Z', hasAccount: true };
    const guest = { email: 'ravi@example.com', customerName: 'Ravi Kumar', orders: 1, spent: 3899, lastOrderAt: '2026-10-20T10:00:00.000Z', hasAccount: false };

    it('lists customers with spend and whether they have an account', async () => {
      fetchMock.mockResolvedValue(page([asha, guest]));
      const { container } = render(<CustomersPanel token="t" isReadOnly={false} onMessage={vi.fn()} />);

      expect(await screen.findByText('Asha Rao')).toBeInTheDocument();
      expect(screen.getByText('₹11,250')).toBeInTheDocument();
      expect(screen.getByText('Member')).toBeInTheDocument();
      expect(screen.getByText('Guest')).toBeInTheDocument();
      expect(screen.getByText(/9 registered accounts/)).toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();
    });

    it('searches and sorts through the server', async () => {
      fetchMock.mockResolvedValue(page([asha]));
      render(<CustomersPanel token="t" isReadOnly={false} onMessage={vi.fn()} />);
      await screen.findByText('Asha Rao');

      fireEvent.change(screen.getByLabelText('Search customers'), { target: { value: 'asha' } });
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));
      await waitFor(() => expect(fetchMock.mock.calls.at(-1)![0]).toContain('search=asha'));

      fireEvent.change(screen.getByLabelText('Sort customers'), { target: { value: 'recent' } });
      await waitFor(() => expect(fetchMock.mock.calls.at(-1)![0]).toContain('sort=recent'));
    });

    it('downloads a spreadsheet with the sign-in token and tells you when it is done', async () => {
      const onMessage = vi.fn();
      fetchMock.mockImplementation(async (url: string) =>
        url.startsWith('/api/admin/export')
          ? { ok: true, status: 200, headers: new Headers({ 'content-disposition': 'attachment; filename="footzi-orders-2026-11-14.csv"' }), blob: async () => new Blob(['a,b']) }
          : page([asha])
      );
      const createUrl = vi.fn(() => 'blob:fake');
      vi.stubGlobal('URL', { ...URL, createObjectURL: createUrl, revokeObjectURL: vi.fn() });
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      render(<CustomersPanel token="secret-token" isReadOnly={false} onMessage={onMessage} />);
      await screen.findByText('Asha Rao');

      fireEvent.click(screen.getByRole('button', { name: /orders csv/i }));
      await waitFor(() => expect(onMessage).toHaveBeenCalledWith('Orders downloaded.'));
      const call = fetchMock.mock.calls.find(([url]) => url === '/api/admin/export/orders.csv')!;
      expect(call[1].headers.Authorization).toBe('Bearer secret-token');
      expect(click).toHaveBeenCalledTimes(1);
      click.mockRestore();
    });

    it('reports a refused export instead of pretending, and disables exports for the read-only demo', async () => {
      const onMessage = vi.fn();
      fetchMock.mockImplementation(async (url: string) => (url.startsWith('/api/admin/export') ? fail(403, 'Exports are disabled in the read-only demo.') : page([asha])));
      const { unmount } = render(<CustomersPanel token="t" isReadOnly={false} onMessage={onMessage} />);
      await screen.findByText('Asha Rao');
      fireEvent.click(screen.getByRole('button', { name: /customers csv/i }));
      await waitFor(() => expect(onMessage).toHaveBeenCalledWith('Exports are disabled in the read-only demo.'));
      unmount();

      fetchMock.mockResolvedValue(page([asha]));
      render(<CustomersPanel token="t" isReadOnly onMessage={onMessage} />);
      await screen.findByText('Asha Rao');
      expect(screen.getByRole('button', { name: /orders csv/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /customers csv/i })).toBeDisabled();
    });

    it('shows a message for no results or a failed load', async () => {
      fetchMock.mockResolvedValueOnce(page([]));
      const { unmount } = render(<CustomersPanel token="t" isReadOnly={false} onMessage={vi.fn()} />);
      expect(await screen.findByText('No customers match.')).toBeInTheDocument();
      unmount();

      fetchMock.mockResolvedValueOnce(fail(500, 'Failed'));
      render(<CustomersPanel token="t" isReadOnly={false} onMessage={vi.fn()} />);
      expect(await screen.findByRole('alert')).toBeInTheDocument();
    });
  });

  it('adminService.downloadCsv names the file from the server\'s header', async () => {
    const link: HTMLAnchorElement[] = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      link.push(this);
    });
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:x', revokeObjectURL: vi.fn() });
    fetchMock.mockResolvedValue({ ok: true, headers: new Headers({ 'content-disposition': 'attachment; filename="report.csv"' }), blob: async () => new Blob(['x']) });

    await adminService.downloadCsv('/api/admin/export/orders.csv', 't');
    expect(link[0].download).toBe('report.csv');
    click.mockRestore();
  });
});
