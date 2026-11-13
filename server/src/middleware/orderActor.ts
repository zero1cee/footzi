import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import { OrderActor } from '../services/orderAccess.js';

declare module 'express-serve-static-core' {
  interface Request {
    orderActor?: OrderActor;
  }
}

/**
 * For routes about one order that a guest may also use. A signed-in customer is identified by their session,
 * a guest by the secret from their order link, sent in the X-Order-Token header. Run after optionalAuthenticate.
 * This only says who is asking; whether they may touch this particular order is decided where the order is loaded.
 */
export const resolveOrderActor = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user) {
    req.orderActor = { userId: req.user.id };
    next();
    return;
  }
  const token = req.get('x-order-token');
  if (token) {
    req.orderActor = { guestToken: token };
    next();
    return;
  }
  res.status(401).json({
    error: 'Authentication required',
    message: 'Sign in, or open the link from your order email.',
  });
};
