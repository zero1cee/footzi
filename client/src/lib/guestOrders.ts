/**
 * A guest has no account, so the link in their order email (and the page they land on after paying) carries a
 * secret in the part after the "#". That part is never sent to the server. This remembers it in the browser so
 * the order can be reopened from the same device without the email, and reads it from a link when one is opened.
 */
const KEY = 'footzi-guest-orders';

const read = (): Record<string, string> => {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const rememberGuestOrder = (orderId: string, token: string): void => {
  try {
    const all = read();
    all[orderId] = token;
    // Keep the most recent twenty; an old order can still be reopened from its email
    const entries = Object.entries(all).slice(-20);
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Private mode or storage blocked: the emailed link still works
  }
};

export const forgetGuestOrder = (orderId: string): void => {
  try {
    const all = read();
    delete all[orderId];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Nothing to do
  }
};

/** The secret from a link like /order/123#t=abc, if there is one. */
export const tokenFromHash = (hash: string): string | null => {
  const match = /(?:^#|&)t=([0-9a-f]{64})(?:&|$)/i.exec(hash);
  return match ? match[1].toLowerCase() : null;
};

/** The secret for an order: from the link just opened, else the one remembered on this device. */
export const guestTokenFor = (orderId: string, hash = ''): string | null => {
  const fromLink = tokenFromHash(hash);
  if (fromLink) {
    rememberGuestOrder(orderId, fromLink);
    return fromLink;
  }
  return read()[orderId] ?? null;
};
