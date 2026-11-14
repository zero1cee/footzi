import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { connectDB } from '../config/db.js';
import { errorHandler } from '../middleware/errorHandler.js';

const app = createApp();

describe('monitoring and safe failures', () => {
  beforeAll(async () => {
    await connectDB();
  });
  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('health checks', () => {
    it('liveness says the process is up and never depends on the database', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: 'online' });
      expect(typeof res.body.uptimeSeconds).toBe('number');
    });

    it('readiness reports the database as reachable', async () => {
      const res = await request(app).get('/api/ready');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: 'ready', database: 'connected' });
    });

    it('readiness turns to 503 when the database cannot be reached', async () => {
      const admin = vi
        .spyOn(mongoose.connection.db!, 'admin')
        .mockReturnValueOnce({ ping: () => Promise.reject(new Error('connection lost')) } as any);
      const res = await request(app).get('/api/ready');
      expect(res.status).toBe(503);
      expect(res.body).toMatchObject({ status: 'unavailable', database: 'unreachable' });
      admin.mockRestore();
    });
  });

  describe('security headers that payments depend on', () => {
    it('lets the Razorpay popup reconnect to the page, and still protects it', async () => {
      const res = await request(app).get('/api/health');
      // "same-origin" (the Helmet default) leaves the payment popup blank and the payment failed
      expect(res.headers['cross-origin-opener-policy']).toBe('same-origin-allow-popups');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      // The rest of the protection is untouched
      expect(res.headers['content-security-policy']).toContain("frame-src https://api.razorpay.com https://checkout.razorpay.com");
      expect(res.headers['content-security-policy']).toContain("script-src 'self' https://checkout.razorpay.com");
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['strict-transport-security']).toBeDefined();
    });
  });

  describe('request ids', () => {
    it('gives every response an id', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('reuses a sensible id from a proxy, and replaces one that could forge log lines', async () => {
      const good = await request(app).get('/api/health').set('X-Request-Id', 'render-abc123-xyz');
      expect(good.headers['x-request-id']).toBe('render-abc123-xyz');

      const bad = await request(app).get('/api/health').set('X-Request-Id', 'x" level":"info","event":"forged');
      expect(bad.headers['x-request-id']).not.toContain('forged');
      expect(bad.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  describe('error responses', () => {
    const run = (err: any, env: string) => {
      const previous = process.env.NODE_ENV;
      process.env.NODE_ENV = env;
      const res: any = { headersSent: false, status: vi.fn().mockReturnThis(), json: vi.fn() };
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      errorHandler(err, { id: 'req-1', method: 'POST', originalUrl: '/api/orders?token=secret' } as any, res, vi.fn());
      const logged = log.mock.calls.map((c) => String(c[0]));
      log.mockRestore();
      process.env.NODE_ENV = previous;
      return { res, logged };
    };

    it('logs a server error once as one JSON line with the request id, and never logs the query string', () => {
      // isProduction is read at import time, so this checks the logging; the message rule is checked below
      const { logged } = run(new Error('E11000 duplicate key collection: footzi.orders'), 'test');
      expect(logged).toHaveLength(1);
      const line = JSON.parse(logged[0]);
      expect(line).toMatchObject({ level: 'error', event: 'request_failed', requestId: 'req-1', method: 'POST', url: '/api/orders', statusCode: 500 });
      expect(logged[0]).not.toContain('secret');
    });

    it('does not log routine client errors as failures, and keeps their message', () => {
      const { res, logged } = run(Object.assign(new Error('Bad JSON'), { statusCode: 400 }), 'test');
      expect(logged).toHaveLength(0);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0]).toMatchObject({ message: 'Bad JSON', error: 'Bad JSON' });
    });

    it('hands the caller a request id for a server error so support can find it', () => {
      const { res } = run(new Error('boom'), 'test');
      expect(res.json.mock.calls[0][0].requestId).toBe('req-1');
    });
  });

  describe('request size limits', () => {
    it('refuses an oversized body on ordinary routes', async () => {
      const big = { email: 'a@example.com', password: 'x'.repeat(150 * 1024) };
      const res = await request(app).post('/api/auth/login').send(big);
      expect(res.status).toBe(413);
    });

    it('still lets the admin image upload carry a photo', async () => {
      const login = await request(app).post('/api/auth/login').send({ email: 'admin@footzi.in', password: 'Footzi@2026' });
      const photo = `data:image/png;base64,${'A'.repeat(300 * 1024)}`;
      const res = await request(app).post('/api/admin/products/upload-image').set('Authorization', `Bearer ${login.body.token}`).send({ image: photo });
      // Past the size limit and into the upload logic, which says Cloudinary is not set up
      expect(res.status).toBe(501);
    });
  });

  describe('browser error reports', () => {
    it('accepts a report, answers 204 and writes one log line', async () => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      const res = await request(app)
        .post('/api/client-errors')
        .set('User-Agent', 'TestBrowser/1.0')
        .send({ message: 'Cannot read properties of undefined', stack: 'at Foo (app.js:1:1)', page: '/product/x', source: 'react' });
      const lines = log.mock.calls.map((c) => String(c[0]));
      log.mockRestore();

      expect(res.status).toBe(204);
      const line = JSON.parse(lines.find((l) => l.includes('client_error'))!);
      expect(line).toMatchObject({ level: 'error', event: 'client_error', page: '/product/x', source: 'react', userAgent: 'TestBrowser/1.0' });
    });

    it('truncates long text, ignores empty reports, and never needs a sign-in', async () => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      const long = await request(app).post('/api/client-errors').send({ message: 'm'.repeat(5000), stack: 's'.repeat(9000) });
      const empty = await request(app).post('/api/client-errors').send({});
      const garbage = await request(app).post('/api/client-errors').send('not json').set('Content-Type', 'text/plain');
      const lines = log.mock.calls.map((c) => JSON.parse(String(c[0])));
      log.mockRestore();

      expect([long.status, empty.status, garbage.status]).toEqual([204, 204, 204]);
      expect(lines).toHaveLength(1);
      expect(lines[0].message).toHaveLength(500);
      expect(lines[0].stack).toHaveLength(2000);
    });
  });
});
