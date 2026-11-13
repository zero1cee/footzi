import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

declare module 'express-serve-static-core' {
  interface Request {
    id?: string;
  }
}

const SAFE_ID = /^[A-Za-z0-9._-]{8,64}$/;

/**
 * Gives every request an id that appears in the access log, in any error log line, and in the
 * X-Request-Id response header. When a customer reports "something failed", that id finds the exact lines.
 * An id sent by a proxy is reused when it looks sane; anything else is replaced, so a caller cannot forge log lines.
 */
export const requestContext = (req: Request, res: Response, next: NextFunction): void => {
  const incoming = req.get('x-request-id');
  req.id = incoming && SAFE_ID.test(incoming) ? incoming : crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
};
