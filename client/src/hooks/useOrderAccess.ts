import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { guestTokenFor } from '@/lib/guestOrders';
import type { OrderAuth } from '@/services/orderService';

export interface OrderAccess {
  /** What to send to the server to open this order, or null when the page has nothing to prove ownership with. */
  auth: OrderAuth | null;
  /** The sign-in token, if signed in (needed to add a guest order to the account). */
  bearer: string | null;
  /** The guest order secret from the link or this device. */
  orderToken: string | null;
}

/**
 * Works out how this page proves the order is the visitor's. In the account area that is the sign-in. On a
 * guest order page it is the order's private link (never the sign-in: a guest order has no account yet, even
 * when the visitor happens to be signed in, and that is exactly when they may add it to their account).
 */
export const useOrderAccess = (orderId: string | undefined, mode: 'account' | 'guest'): OrderAccess => {
  const bearer = useAuthStore((s) => s.token);
  const { hash } = useLocation();
  const orderToken = mode === 'guest' && orderId ? guestTokenFor(orderId, hash) : null;

  if (mode === 'guest') return { auth: orderToken ? { orderToken } : null, bearer, orderToken };
  return { auth: bearer, bearer, orderToken: null };
};
