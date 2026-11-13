import { Request, Response } from 'express';
import { logEvent } from '../middleware/errorHandler.js';

const clip = (value: unknown, max: number): string => String(value ?? '').slice(0, max);

/**
 * Browsers report crashes here so they show up in the server log next to the API errors.
 * It accepts nothing but short text, answers 204 whatever it receives, and is rate limited.
 */
export const reportClientError = (req: Request, res: Response): void => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  if (body.message) {
    logEvent('error', 'client_error', {
      requestId: req.id,
      message: clip(body.message, 500),
      stack: clip(body.stack, 2000),
      page: clip(body.page, 300),
      source: clip(body.source, 40),
      userAgent: clip(req.get('user-agent'), 200),
    });
  }
  res.status(204).end();
};
