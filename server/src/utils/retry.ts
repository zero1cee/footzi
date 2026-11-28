export interface RetryOptions {
  /** Maximum total attempts including the initial attempt. Default: 3 */
  maxAttempts?: number;
  /** Initial delay before the first retry in milliseconds. Default: 200 */
  baseDelayMs?: number;
  /** Upper bound for computed backoff delay in milliseconds. Default: 5000 */
  maxDelayMs?: number;
  /** Optional predicate determining whether an error warrants a retry. */
  shouldRetry?: (error: any, attempt: number) => boolean;
  /** Optional callback fired before each retry delay. */
  onRetry?: (error: any, attempt: number, delayMs: number) => void;
}

/**
 * Determines whether an HTTP or SDK error is likely transient (network drop,
 * rate limit 429, or upstream 5xx) rather than a deterministic 4xx client error.
 */
export const isTransientError = (error: any): boolean => {
  if (!error) return false;

  const status = error.status ?? error.statusCode ?? error?.response?.status;
  if (typeof status === 'number') {
    if (status === 429) return true;
    if (status >= 500 && status < 600) return true;
    if (status >= 400 && status < 500) return false;
  }

  return true;
};

/**
 * Executes an async operation with exponential backoff and randomized jitter.
 */
export const withRetry = async <T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 200);
  const maxDelayMs = Math.max(baseDelayMs, options.maxDelayMs ?? 5000);
  const shouldRetry = options.shouldRetry ?? isTransientError;

  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation(attempt);
    } catch (error: any) {
      lastError = error;

      const hasMoreAttempts = attempt < maxAttempts;
      if (!hasMoreAttempts || !shouldRetry(error, attempt)) {
        throw error;
      }

      // Exponential backoff: base * 2^(attempt - 1) with ±20% jitter
      const expDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
      const jitter = expDelay * 0.2 * (Math.random() * 2 - 1);
      const delayMs = Math.max(0, Math.round(expDelay + jitter));

      options.onRetry?.(error, attempt, delayMs);

      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
};
