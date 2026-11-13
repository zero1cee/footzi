import crypto from 'crypto';
import mongoose from 'mongoose';
import { getJwtSecret } from '../config/env.js';

/**
 * Guests have no account, so what proves an order is theirs is a link only they received (in the
 * confirmation email, or in the response to placing the order). The secret in that link is an HMAC of
 * the order id under the server's key: unguessable, nothing extra to store, and it works the same in
 * every email about the order. It is carried in the URL fragment and an HTTP header, never in a query
 * string, so it does not end up in server logs.
 */
export const orderAccessToken = (orderId: unknown): string =>
  crypto.createHmac('sha256', getJwtSecret()).update(`order-access:${String(orderId)}`).digest('hex');

export const isValidOrderToken = (orderId: unknown, token: unknown): boolean => {
  if (typeof token !== 'string' || token.length !== 64) return false;
  const expected = Buffer.from(orderAccessToken(orderId), 'utf8');
  const given = Buffer.from(token, 'utf8');
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
};

/** Who is asking about an order: a signed-in customer, or a guest holding the order's link. */
export interface OrderActor {
  userId?: string;
  guestToken?: string;
}

/**
 * The database filter that selects an order only when this actor may use it, or null when they may not.
 * A guest token opens only orders that are still guest orders; once an order is claimed into an
 * account, the link stops working and the account owns it.
 */
export const orderFilterFor = (orderId: unknown, actor: OrderActor): Record<string, unknown> | null => {
  if (!mongoose.isValidObjectId(orderId)) return null;
  if (actor.userId) return { _id: orderId, user: actor.userId };
  if (actor.guestToken && isValidOrderToken(orderId, actor.guestToken)) return { _id: orderId, isGuest: true };
  return null;
};

/** The extra condition that keeps a state change inside what this actor owns. */
export const ownerFilter = (actor: OrderActor): Record<string, unknown> =>
  actor.userId ? { user: actor.userId } : { isGuest: true };
