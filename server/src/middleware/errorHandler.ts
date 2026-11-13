import { Request, Response, NextFunction } from 'express';
import { isProduction } from '../config/env.js';

/** One JSON line per event, so a log search ("level":"error", a request id) works on any host. */
export const logEvent = (level: 'info' | 'warn' | 'error', event: string, fields: Record<string, unknown> = {}): void => {
  const line = JSON.stringify({ time: new Date().toISOString(), level, event, ...fields });
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(line);
};

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) return next(err);

  const statusCode = Number(err.statusCode || err.status) || 500;
  const isServerError = statusCode >= 500;

  // Client mistakes (bad JSON, too large) are routine; only real failures are logged as errors
  if (isServerError) {
    logEvent('error', 'request_failed', {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl?.split('?')[0],
      statusCode,
      message: err.message,
      stack: err.stack,
    });
  }

  // In production a server error never reveals its internals (database messages, file paths) to the caller
  const message = isServerError && isProduction ? 'Something went wrong on our side. Please try again.' : err.message || 'Internal Server Error';

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    error: message,
    ...(isServerError && req.id ? { requestId: req.id } : {}),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
