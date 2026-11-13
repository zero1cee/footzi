import { parseApiJson } from '@/lib/utils';

export const stockAlertService = {
  /** Asks the server to email this address once when a sold-out size is back. Resolves with its confirmation. */
  async subscribe(email: string, sku: string): Promise<string> {
    const res = await fetch('/api/stock-alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, sku }),
    });
    return (await parseApiJson<{ message: string }>(res, 'Could not save your request')).message;
  },
};
