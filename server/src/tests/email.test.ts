import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { deliver, parseSender, activeProvider } from '../services/emailService.js';

const message = { to: 'customer@example.com', subject: 'Hello', html: '<p>Hi</p>', text: 'Hi' };
const KEYS = ['BREVO_API_KEY', 'RESEND_API_KEY', 'EMAIL_FROM'] as const;

describe('email providers', () => {
  const fetchMock = vi.fn();
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('parses a sender with and without a display name', () => {
    expect(parseSender('Footzi <orders@example.com>')).toEqual({ name: 'Footzi', email: 'orders@example.com' });
    expect(parseSender('"Footzi Atelier" <orders@example.com>')).toEqual({ name: 'Footzi Atelier', email: 'orders@example.com' });
    expect(parseSender('orders@example.com')).toEqual({ email: 'orders@example.com' });
  });

  it('only logs when no provider key is set', async () => {
    expect(activeProvider()).toBe('none');
    expect(await deliver(message)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends through Brevo with its api-key header and a verified sender', async () => {
    process.env.BREVO_API_KEY = 'xkeysib-test';
    process.env.EMAIL_FROM = 'Footzi <me@gmail.com>';
    fetchMock.mockResolvedValue({ ok: true, status: 201, text: async () => '' });

    expect(await deliver(message)).toBe(true);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(init.headers['api-key']).toBe('xkeysib-test');
    expect(init.headers.Authorization).toBeUndefined();
    expect(JSON.parse(init.body)).toEqual({
      sender: { name: 'Footzi', email: 'me@gmail.com' },
      to: [{ email: 'customer@example.com' }],
      subject: 'Hello',
      htmlContent: '<p>Hi</p>',
      textContent: 'Hi',
    });
  });

  it('refuses to call Brevo without a sender, and says why', async () => {
    process.env.BREVO_API_KEY = 'xkeysib-test';
    expect(await deliver(message)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('EMAIL_FROM'));
  });

  it('falls back to Resend when only its key is set', async () => {
    process.env.RESEND_API_KEY = 're_test';
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => '' });

    expect(await deliver(message)).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer re_test');
  });

  it('prefers Brevo when both keys are set', async () => {
    process.env.BREVO_API_KEY = 'xkeysib-test';
    process.env.RESEND_API_KEY = 're_test';
    process.env.EMAIL_FROM = 'me@gmail.com';
    fetchMock.mockResolvedValue({ ok: true, status: 201, text: async () => '' });

    await deliver(message);
    expect(fetchMock.mock.calls[0][0]).toContain('brevo.com');
  });

  it('reports a provider rejection and a network failure without throwing', async () => {
    process.env.BREVO_API_KEY = 'xkeysib-test';
    process.env.EMAIL_FROM = 'me@gmail.com';

    fetchMock.mockResolvedValueOnce({ ok: false, status: 401, text: async () => 'Key not found' });
    expect(await deliver(message)).toBe(false);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('brevo rejected'));

    fetchMock.mockRejectedValueOnce(new Error('network down'));
    expect(await deliver(message)).toBe(false);
  });
});
