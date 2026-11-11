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
