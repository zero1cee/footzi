import { getCorsOrigins } from '../config/env.js';
import { orderAccessToken } from './orderAccess.js';

/**
 * Transactional email through an HTTP API (Brevo or Resend). Render's free tier blocks
 * SMTP ports, so an HTTP provider is the one that works there. With no API key the
 * message is only logged, so local development and demos never need email.
 * Sending never throws: a mail problem must not fail an order or a password reset.
 */

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const isTest = (): boolean => process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

/** Messages "sent" during tests, so a test can read the reset link a user would have been emailed. */
export const testOutbox: OutgoingEmail[] = [];

const esc = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * Where a customer opens their order. A signed-in customer's order lives in their account; a guest's opens by
 * a link whose secret sits after the # so it is never sent to the server or written to its logs.
 */
export const orderUrl = (order: any): string =>
  order.isGuest
    ? `${appUrlSafe()}/order/${order._id}#t=${orderAccessToken(order._id)}`
    : `${appUrlSafe()}/account/orders/${order._id}`;

const inr = (n: number): string => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** Public base URL used in email links. */
function appUrlSafe(): string {
  return appUrl();
}
export const appUrl = (): string =>
  (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || getCorsOrigins()[0] || 'http://localhost:5173').replace(/\/$/, '');

const layout = (title: string, bodyHtml: string): string => `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f7f3ec;font-family:Georgia,'Times New Roman',serif;color:#1f1d1a">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e8e0d2;padding:32px">
    <div style="letter-spacing:4px;font-size:13px;text-transform:uppercase;color:#a07f45;margin-bottom:20px">Footzi</div>
    <h1 style="font-size:22px;font-weight:500;margin:0 0 16px">${esc(title)}</h1>
    ${bodyHtml}
    <p style="font-size:12px;color:#8a8478;margin-top:32px;border-top:1px solid #e8e0d2;padding-top:16px">
      Footzi Atelier, Agra. If you didn't expect this email you can safely ignore it.
    </p>
  </div>
</body></html>`;

const button = (href: string, label: string): string =>
  `<p style="margin:24px 0"><a href="${esc(href)}" style="background:#1f1d1a;color:#ffffff;text-decoration:none;padding:12px 24px;font-size:13px;letter-spacing:2px;text-transform:uppercase">${esc(label)}</a></p>`;

/** Splits "Footzi <orders@example.com>" into its name and address; a bare address has no name. */
export const parseSender = (from: string): { name?: string; email: string } => {
  const match = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  return match ? { name: match[1].trim() || undefined, email: match[2].trim() } : { email: from.trim() };
};

type Provider = 'brevo' | 'resend' | 'none';

/** Brevo wins when both keys are set; with neither, emails are only logged. */
export const activeProvider = (): Provider =>
  process.env.BREVO_API_KEY ? 'brevo' : process.env.RESEND_API_KEY ? 'resend' : 'none';

/** Hands one message to the configured provider. Never throws. */
export const deliver = async (message: OutgoingEmail): Promise<boolean> => {
  const provider = activeProvider();

  if (provider === 'none') {
    console.log(`[Footzi Email] (no BREVO_API_KEY or RESEND_API_KEY, not sent) To: ${message.to} | ${message.subject}\n${message.text}`);
    return false;
  }

  try {
    let res: Response;
    if (provider === 'brevo') {
      // Brevo only sends from a sender address you verified in its dashboard
      if (!process.env.EMAIL_FROM) {
        console.error('[Footzi Email] EMAIL_FROM is not set. With Brevo it must be a sender you verified there, e.g. Footzi <you@gmail.com>.');
        return false;
      }
      res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': process.env.BREVO_API_KEY!, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          sender: parseSender(process.env.EMAIL_FROM),
          to: [{ email: message.to }],
          subject: message.subject,
          htmlContent: message.html,
          textContent: message.text,
        }),
      });
    } else {
      res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'Footzi <onboarding@resend.dev>',
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      });
    }

    if (!res.ok) {
      console.error(`[Footzi Email] ${provider} rejected "${message.subject}" (${res.status}): ${await res.text()}`);
      return false;
    }
    return true;
  } catch (error: any) {
    console.error(`[Footzi Email] Could not send "${message.subject}":`, error.message);
    return false;
  }
};

export const emailService = {
  async send(message: OutgoingEmail): Promise<boolean> {
    if (isTest()) {
      testOutbox.push(message);
      return true;
    }
    return deliver(message);
  },

  welcome(user: { name: string; email: string }) {
    const first = user.name.split(' ')[0];
    return this.send({
      to: user.email,
      subject: 'Welcome to Footzi',
      html: layout(
        `Welcome, ${first}`,
        `<p>Your Footzi account is ready. Browse the collection, save your favourites and track every order in one place.</p>${button(`${appUrl()}/shop`, 'Explore the collection')}`
      ),
      text: `Welcome to Footzi, ${first}. Your account is ready: ${appUrl()}/shop`,
    });
  },

  passwordReset(user: { name: string; email: string }, token: string, minutes: number) {
    const link = `${appUrl()}/reset-password?token=${token}`;
    return this.send({
      to: user.email,
      subject: 'Reset your Footzi password',
      html: layout(
        'Reset your password',
        `<p>We received a request to reset the password for this account. The link below works for ${minutes} minutes and can be used once.</p>${button(link, 'Choose a new password')}<p style="font-size:12px;color:#8a8478">If you didn't ask for this, no action is needed and your password stays the same.</p>`
      ),
      text: `Reset your Footzi password (valid ${minutes} minutes, single use):\n${link}\n\nIf you didn't ask for this, ignore this email.`,
    });
  },

  passwordChanged(user: { name: string; email: string }) {
    return this.send({
      to: user.email,
      subject: 'Your Footzi password was changed',
      html: layout('Password changed', `<p>The password for ${esc(user.email)} was just changed. If this wasn't you, reset it straight away from the sign-in page.</p>`),
      text: `The password for ${user.email} was just changed. If this wasn't you, reset it from the sign-in page.`,
    });
  },

  orderConfirmed(order: any) {
    const lines = order.items
      .map((i: any) => `<tr><td style="padding:6px 0">${esc(i.name)} <span style="color:#8a8478">${esc(i.size)} · ${esc(i.color)} × ${i.quantity}</span></td><td style="text-align:right">${inr(i.lineTotal)}</td></tr>`)
      .join('');
    return this.send({
      to: order.customerEmail,
      subject: `Order ${order.orderNumber} confirmed`,
      html: layout(
        'Thank you, your order is confirmed',
        `<p>Order <strong>${esc(order.orderNumber)}</strong> is paid and our Agra workshop has it queued.</p>
         <table style="width:100%;border-collapse:collapse;font-size:14px">${lines}
           <tr><td style="padding-top:10px;border-top:1px solid #e8e0d2"><strong>Total</strong></td><td style="text-align:right;padding-top:10px;border-top:1px solid #e8e0d2"><strong>${inr(order.total)}</strong></td></tr>
         </table>
         <p style="font-size:13px;color:#5a554b">Shipping to ${esc(order.shippingAddress.name)}, ${esc(order.shippingAddress.addressLine)}, ${esc(order.shippingAddress.city)} ${esc(order.shippingAddress.pincode)}</p>
         ${button(`${orderUrl(order)}`, 'View your order')}`
      ),
      text: `Order ${order.orderNumber} is confirmed. Total ${inr(order.total)}. Track it: ${orderUrl(order)}`,
    });
  },

  orderLink(order: any) {
    return this.send({
      to: order.customerEmail,
      subject: `Your Footzi order ${order.orderNumber}`,
      html: layout(
        'Here is your order',
        `<p>You asked for a link to order <strong>${esc(order.orderNumber)}</strong>. Keep this email: the link works for as long as the order exists.</p>${button(orderUrl(order), 'View your order')}`
      ),
      text: `Your Footzi order ${order.orderNumber}: ${orderUrl(order)}`,
    });
  },

  backInStock(item: { to: string; productName: string; size: string; color: string }, link: string) {
    return this.send({
      to: item.to,
      subject: `Back in stock: ${item.productName} in ${item.size}`,
      html: layout(
        'Your size is back',
        `<p>You asked us to tell you when <strong>${esc(item.productName)}</strong> (${esc(item.size)}, ${esc(item.color)}) returned. It's available again. Pairs are limited and sell out, so don't wait too long.</p>${button(link, 'View the style')}<p style="font-size:12px;color:#8a8478">This is a one-time message because you asked for it. You won't hear from us about it again.</p>`
      ),
      text: `Back in stock: ${item.productName} (${item.size}, ${item.color}). View it: ${link}\n\nThis is a one-time message because you asked for it.`,
    });
  },

  orderShipped(order: any) {
    return this.send({
      to: order.customerEmail,
      subject: `Order ${order.orderNumber} has shipped`,
      html: layout(
        'Your order is on its way',
        `<p>Order <strong>${esc(order.orderNumber)}</strong> was dispatched${order.carrier ? ` with ${esc(order.carrier)}` : ''}.</p>${order.trackingNumber ? `<p>Tracking number: <strong>${esc(order.trackingNumber)}</strong></p>` : ''}${button(`${orderUrl(order)}`, 'Track your order')}`
      ),
      text: `Order ${order.orderNumber} has shipped. Tracking: ${order.trackingNumber ?? 'pending'}. ${orderUrl(order)}`,
    });
  },

  orderDelivered(order: any) {
    return this.send({
      to: order.customerEmail,
      subject: `Order ${order.orderNumber} delivered`,
      html: layout(
        'Delivered',
        `<p>Order <strong>${esc(order.orderNumber)}</strong> has been delivered. If the fit isn't right you have 7 days to request an exchange or return.${order.isGuest ? ' To start one, sign in (or create an account) and use "Add this order to my account" on the order page first.' : ''}</p>${button(`${orderUrl(order)}`, 'View your order')}`
      ),
      text: `Order ${order.orderNumber} was delivered. You have 7 days to request an exchange or return: ${orderUrl(order)}`,
    });
  },

  orderCancelled(order: any, refundAmount: number) {
    return this.send({
      to: order.customerEmail,
      subject: `Order ${order.orderNumber} cancelled`,
      html: layout(
        'Order cancelled',
        `<p>Order <strong>${esc(order.orderNumber)}</strong> was cancelled.${refundAmount > 0 ? ` A refund of <strong>${inr(refundAmount)}</strong> has been issued to your original payment method and usually appears within 5–7 working days.` : ''}</p>`
      ),
      text: `Order ${order.orderNumber} was cancelled.${refundAmount > 0 ? ` Refund of ${inr(refundAmount)} issued; allow 5-7 working days.` : ''}`,
    });
  },

  refundIssued(order: any, amount: number, reason: string) {
    return this.send({
      to: order.customerEmail,
      subject: `Refund of ${inr(amount)} for order ${order.orderNumber}`,
      html: layout(
        'Your refund is on its way',
        `<p>We've refunded <strong>${inr(amount)}</strong> for order <strong>${esc(order.orderNumber)}</strong> (${esc(reason)}). It usually reaches your original payment method within 5–7 working days.</p>`
      ),
      text: `Refund of ${inr(amount)} issued for order ${order.orderNumber} (${reason}). Allow 5-7 working days.`,
    });
  },

  returnUpdate(to: string, returnRequest: any, headline: string, detail: string) {
    return this.send({
      to,
      subject: `${returnRequest.type === 'exchange' ? 'Exchange' : 'Return'} ${returnRequest.returnNumber}: ${headline}`,
      html: layout(headline, `<p>${esc(detail)}</p><p style="font-size:13px;color:#5a554b">Reference: ${esc(returnRequest.returnNumber)}</p>${button(`${appUrl()}/account/returns`, 'View your returns')}`),
      text: `${headline}. ${detail} Reference: ${returnRequest.returnNumber}`,
    });
  },
};
