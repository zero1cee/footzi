import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Converts integer INR amount to words for Indian Tax Invoices (e.g. "Three Thousand Eight Hundred Ninety-Nine Rupees Only"). */
export function numberToIndianWords(amount: number): string {
  const n = Math.round(Math.abs(amount));
  if (n === 0) return 'Zero Rupees Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertTwoDigits = (val: number): string => {
    if (val < 20) return ones[val];
    const rem = val % 10;
    return tens[Math.floor(val / 10)] + (rem > 0 ? '-' + ones[rem] : '');
  };

  const convertThreeDigits = (val: number): string => {
    const hundred = Math.floor(val / 100);
    const rest = val % 100;
    let res = '';
    if (hundred > 0) res += ones[hundred] + ' Hundred';
    if (rest > 0) res += (res ? ' ' : '') + convertTwoDigits(rest);
    return res;
  };

  let num = n;
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const remainder = num;

  const parts: string[] = [];
  if (crore > 0) parts.push(convertThreeDigits(crore) + ' Crore');
  if (lakh > 0) parts.push(convertTwoDigits(lakh) + ' Lakh');
  if (thousand > 0) parts.push(convertTwoDigits(thousand) + ' Thousand');
  if (remainder > 0) parts.push(convertThreeDigits(remainder));

  return parts.join(' ') + ' Rupees Only';
}

const STATE_CODE_MAP: Record<string, string> = {
  'jammu and kashmir': '01',
  'himachal pradesh': '02',
  'punjab': '03',
  'chandigarh': '04',
  'uttarakhand': '05',
  'haryana': '06',
  'delhi': '07',
  'rajasthan': '08',
  'uttar pradesh': '09',
  'up': '09',
  'bihar': '10',
  'sikkim': '11',
  'arunachal pradesh': '12',
  'nagaland': '13',
  'manipur': '14',
  'mizoram': '15',
  'tripura': '16',
  'meghalaya': '17',
  'assam': '18',
  'west bengal': '19',
  'jharkhand': '20',
  'odisha': '21',
  'chhattisgarh': '22',
  'madhya pradesh': '23',
  'gujarat': '24',
  'maharashtra': '27',
  'andhra pradesh': '28',
  'karnataka': '29',
  'goa': '30',
  'kerala': '32',
  'tamil nadu': '33',
  'telangana': '36',
  'ladakh': '38',
};

export function getIndianStateCode(stateName?: string): string {
  if (!stateName) return '09';
  const clean = stateName.trim().toLowerCase();
  return STATE_CODE_MAP[clean] || '09';
}

/** Thrown when the API could not be reached at all (as opposed to answering with an error). */
export class ApiUnreachableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiUnreachableError';
  }
}

/**
 * True only when the backend did not answer: a network failure from fetch, or an
 * empty 5xx from the dev proxy. A real error response from the API returns false.
 */
export function isBackendUnreachable(err: unknown): boolean {
  return err instanceof ApiUnreachableError || err instanceof TypeError;
}

/**
 * Safely parse a fetch Response as JSON, turning empty proxy 500/502 bodies
 * into an actionable message instead of "Unexpected end of JSON input".
 */
export async function parseApiJson<T = any>(
  res: Response,
  fallbackError: string,
  preferMessage = false
): Promise<T> {
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    if (res.status >= 500) {
      throw new ApiUnreachableError(
        'Footzi backend server is unreachable on port 5001. Run `cd server && npm run dev` or use 1-Click Demo Login.'
      );
    }
    throw new Error(fallbackError);
  }

  if (!res.ok) {
    const detail =
      Array.isArray(body?.details) && body.details[0]?.message ? body.details[0].message : null;
    const primary = preferMessage
      ? body?.message || body?.error
      : body?.error || body?.message;
    throw new Error(detail || primary || fallbackError);
  }

  return body as T;
}
