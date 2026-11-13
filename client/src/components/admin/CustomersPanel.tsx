import React, { useCallback, useEffect, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { adminService } from '@/services/adminService';
import { formatINR } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

const SORTS = [
  { value: 'spent', label: 'Most spent' },
  { value: 'orders', label: 'Most orders' },
  { value: 'recent', label: 'Latest order' },
];

const date = (v: string) => new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

interface Props {
  token: string;
  isReadOnly: boolean;
  onMessage: (message: string) => void;
}

export const CustomersPanel: React.FC<Props> = ({ token, isReadOnly, onMessage }) => {
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [sort, setSort] = useState('spent');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ customers: any[]; total: number; totalPages: number; accounts: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await adminService.getCustomers({ search: submitted, sort, page }, token));
    } catch (err: any) {
      setError(err.message || 'Could not load customers');
    }
  }, [submitted, sort, page, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportFile = async (path: string, what: string) => {
    setExporting(what);
    try {
      await adminService.downloadCsv(path, token);
      onMessage(`${what} downloaded.`);
    } catch (err: any) {
      onMessage(err.message || 'The export failed');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xs border border-ivory-200 shadow-sm space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-ivory-200 pb-4">
        <div>
          <h3 className="font-serif text-xl font-medium text-charcoal-950">Customers {data ? `(${data.total})` : ''}</h3>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Everyone who has paid for an order, guests included. {data ? `${data.accounts} registered accounts in total.` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={isReadOnly || exporting !== null} isLoading={exporting === 'Orders'} onClick={() => exportFile('/api/admin/export/orders.csv', 'Orders')} className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> Orders CSV
          </Button>
          <Button variant="outline" size="sm" disabled={isReadOnly || exporting !== null} isLoading={exporting === 'Customers'} onClick={() => exportFile('/api/admin/export/customers.csv', 'Customers')} className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> Customers CSV
          </Button>
        </div>
      </div>
      {isReadOnly && <p className="text-[11px] text-charcoal-500">The read-only demo masks customer details and cannot download files.</p>}

      <div className="flex flex-col sm:flex-row gap-2">
        <form
          className="flex gap-2 flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSubmitted(search.trim());
          }}
        >
          <div className="relative flex-1 max-w-sm">
            <input
              aria-label="Search customers"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email"
              className="w-full bg-ivory-50 border border-ivory-300 pl-8 pr-3 py-2.5 text-xs rounded-xs focus:outline-none focus:border-charcoal-900"
            />
            <Search className="w-3.5 h-3.5 text-charcoal-400 absolute left-2.5 top-3" aria-hidden="true" />
          </div>
          <Button type="submit" variant="secondary" size="sm">Search</Button>
        </form>
        <select
          aria-label="Sort customers"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
          className="bg-ivory-50 border border-ivory-300 px-3 py-2.5 text-xs rounded-xs"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {error && <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xs">{error}</div>}
      {data && data.customers.length === 0 && <p className="text-xs text-charcoal-500 py-8 text-center">No customers match.</p>}

      {data && data.customers.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-ivory-300 text-charcoal-500 uppercase tracking-wider text-[10px]">
                <th scope="col" className="p-3">Customer</th>
                <th scope="col" className="p-3 text-right">Orders</th>
                <th scope="col" className="p-3 text-right">Spent</th>
                <th scope="col" className="p-3">Last order</th>
                <th scope="col" className="p-3">Account</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-200 text-charcoal-800">
              {data.customers.map((c) => (
                <tr key={c.email}>
                  <th scope="row" className="p-3 text-left font-normal">
                    <span className="block font-semibold text-charcoal-900">{c.customerName}</span>
                    <span className="block text-[11px] text-charcoal-500">{c.email}</span>
                  </th>
                  <td className="p-3 text-right">{c.orders}</td>
                  <td className="p-3 text-right font-semibold text-charcoal-900">{formatINR(c.spent)}</td>
                  <td className="p-3">{date(c.lastOrderAt)}</td>
                  <td className="p-3">
                    <Badge variant={c.hasAccount ? 'sand' : 'outline'}>{c.hasAccount ? 'Member' : 'Guest'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs">
          <span className="text-charcoal-500">Page {page} of {data.totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
};
