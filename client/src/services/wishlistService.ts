import { parseApiJson } from '@/lib/utils';

/** The list the server answered with, checked, so an unexpected reply can never wipe the wishlist. */
const idsFrom = (body: { productIds?: unknown }): string[] => {
  if (!Array.isArray(body?.productIds) || !body.productIds.every((id) => typeof id === 'string')) {
    throw new Error('Unexpected wishlist response');
  }
  return body.productIds as string[];
};

const headers = (token: string) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });

export const wishlistService = {
  async get(token: string): Promise<string[]> {
    const res = await fetch('/api/wishlist', { headers: headers(token) });
    return idsFrom(await parseApiJson(res, 'Could not load your wishlist'));
  },

  async add(productId: string, token: string): Promise<string[]> {
    const res = await fetch(`/api/wishlist/${encodeURIComponent(productId)}`, { method: 'PUT', headers: headers(token) });
    return idsFrom(await parseApiJson(res, 'Could not save to your wishlist'));
  },

  async remove(productId: string, token: string): Promise<string[]> {
    const res = await fetch(`/api/wishlist/${encodeURIComponent(productId)}`, { method: 'DELETE', headers: headers(token) });
    return idsFrom(await parseApiJson(res, 'Could not update your wishlist'));
  },

  /** Folds the hearts picked while signed out into the account's list and returns the combined list. */
  async merge(productIds: string[], token: string): Promise<string[]> {
    const res = await fetch('/api/wishlist/merge', { method: 'POST', headers: headers(token), body: JSON.stringify({ productIds }) });
    return idsFrom(await parseApiJson(res, 'Could not sync your wishlist'));
  },
};
