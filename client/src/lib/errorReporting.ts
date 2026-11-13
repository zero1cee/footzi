/**
 * Sends browser crashes to the server's log (POST /api/client-errors), where they sit beside the API errors.
 * It is deliberately small: no personal data (only the message, stack and page path), at most five reports
 * per page load, and it never throws, so reporting a problem can never create another one.
 */
const MAX_REPORTS_PER_LOAD = 5;
let sent = 0;
const seen = new Set<string>();

// Browser noise that is not a bug in this site
const IGNORED = [/ResizeObserver loop/i, /Script error\.?$/i, /extension:\/\//i, /Non-Error promise rejection/i];

export const reportError = (error: unknown, source: 'window' | 'promise' | 'react' = 'window'): void => {
  try {
    const err = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown error');
    const message = err.message || 'Unknown error';
    if (IGNORED.some((pattern) => pattern.test(message) || pattern.test(err.stack || ''))) return;

    const key = `${source}:${message}`;
    if (sent >= MAX_REPORTS_PER_LOAD || seen.has(key)) return;
    seen.add(key);
    sent += 1;

    const payload = JSON.stringify({
      message: message.slice(0, 500),
      stack: (err.stack || '').slice(0, 2000),
      page: window.location.pathname, // the path only: no query string, which may hold tokens
      source,
    });

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      if (navigator.sendBeacon('/api/client-errors', new Blob([payload], { type: 'application/json' }))) return;
    }
    void fetch('/api/client-errors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
  } catch {
    // Reporting must never break the page
  }
};

export const installGlobalErrorReporting = (): void => {
  window.addEventListener('error', (event) => reportError(event.error ?? event.message, 'window'));
  window.addEventListener('unhandledrejection', (event) => reportError(event.reason, 'promise'));
};

/** For tests: forgets what was already reported. */
export const resetErrorReporting = (): void => {
  sent = 0;
  seen.clear();
};
