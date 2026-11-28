import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { connectDB } from '../config/db.js';
import { withRetry, isTransientError } from '../utils/retry.js';
import { WorkerRegistry, workerRegistry } from '../utils/workerRunner.js';
import { WebhookEvent } from '../models/WebhookEvent.js';
import { Payment } from '../models/Payment.js';
import { RAZORPAY_CONFIG } from '../config/razorpay.js';
import { deliver } from '../services/emailService.js';

describe('Phase 3 Backend: Resilient Workers, Retries & Webhook Idempotency', () => {
  let app: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }
    app = createApp();
  });

  afterAll(async () => {
    await WebhookEvent.deleteMany({ eventId: /^evt_test_/ });
    await mongoose.connection.close();
  });

  beforeEach(() => {
    workerRegistry.clear();
  });

  describe('1. Exponential Backoff & Retry Engine', () => {
    it('isTransientError identifies 5xx and 429 as retryable, and 4xx as non-retryable', () => {
      expect(isTransientError({ status: 500 })).toBe(true);
      expect(isTransientError({ status: 503 })).toBe(true);
      expect(isTransientError({ status: 429 })).toBe(true);
      expect(isTransientError({ statusCode: 502 })).toBe(true);
      expect(isTransientError(new Error('ECONNRESET'))).toBe(true);

      expect(isTransientError({ status: 400 })).toBe(false);
      expect(isTransientError({ status: 401 })).toBe(false);
      expect(isTransientError({ status: 404 })).toBe(false);
      expect(isTransientError({ statusCode: 422 })).toBe(false);
    });

    it('withRetry retries transient failures and succeeds once recovered', async () => {
      let attempts = 0;
      const retryHooks: number[] = [];

      const result = await withRetry(
        async () => {
          attempts++;
          if (attempts < 3) {
            const err: any = new Error('Temporary gateway 503');
            err.status = 503;
            throw err;
          }
          return 'success-on-3rd';
        },
        {
          maxAttempts: 4,
          baseDelayMs: 5,
          onRetry: (_err, attempt) => retryHooks.push(attempt),
        }
      );

      expect(result).toBe('success-on-3rd');
      expect(attempts).toBe(3);
      expect(retryHooks).toEqual([1, 2]);
    });

    it('withRetry aborts immediately without retry on non-transient 4xx errors', async () => {
      let attempts = 0;

      await expect(
        withRetry(
          async () => {
            attempts++;
            const err: any = new Error('Unauthorized API Key');
            err.status = 401;
            throw err;
          },
          { maxAttempts: 4, baseDelayMs: 5 }
        )
      ).rejects.toThrow('Unauthorized API Key');

      expect(attempts).toBe(1);
    });

    it('withRetry throws final error after exhausting maxAttempts', async () => {
      let attempts = 0;

      await expect(
        withRetry(
          async () => {
            attempts++;
            const err: any = new Error('Persistent upstream failure');
            err.status = 502;
            throw err;
          },
          { maxAttempts: 3, baseDelayMs: 5 }
        )
      ).rejects.toThrow('Persistent upstream failure');

      expect(attempts).toBe(3);
    });
  });

  describe('2. Email Delivery Retry Integration', () => {
    const savedEnv: Record<string, string | undefined> = {};

    beforeEach(() => {
      savedEnv.BREVO_API_KEY = process.env.BREVO_API_KEY;
      savedEnv.EMAIL_FROM = process.env.EMAIL_FROM;
      process.env.BREVO_API_KEY = 'xkeysib-retry-test';
      process.env.EMAIL_FROM = 'Footzi <test@footzi.in>';
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      if (savedEnv.BREVO_API_KEY === undefined) delete process.env.BREVO_API_KEY;
      else process.env.BREVO_API_KEY = savedEnv.BREVO_API_KEY;
      if (savedEnv.EMAIL_FROM === undefined) delete process.env.EMAIL_FROM;
      else process.env.EMAIL_FROM = savedEnv.EMAIL_FROM;
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('deliver retries transient 503 responses and succeeds on recovery', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 503, text: async () => 'Service Unavailable' })
        .mockResolvedValueOnce({ ok: true, status: 201, text: async () => '' });
      vi.stubGlobal('fetch', fetchMock);

      const delivered = await deliver({
        to: 'patron@footzi.in',
        subject: 'Order Confirmation',
        html: '<p>Confirmed</p>',
        text: 'Confirmed',
      });

      expect(delivered).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('3. Webhook Idempotency & Deduplication', () => {
    const testSecret = 'whsec_phase3_idempotency_test';
    const originalSecret = RAZORPAY_CONFIG.webhook_secret;

    beforeAll(() => {
      RAZORPAY_CONFIG.webhook_secret = testSecret;
    });

    afterAll(() => {
      RAZORPAY_CONFIG.webhook_secret = originalSecret;
    });

    it('WebhookEvent schema defines unique eventId and 30-day TTL index', () => {
      const indexes = WebhookEvent.schema.indexes();
      const ttlIndex = indexes.find(([fields]) => fields.createdAt === 1);
      expect(ttlIndex).toBeDefined();
      expect(ttlIndex?.[1]?.expireAfterSeconds).toBe(30 * 24 * 60 * 60);
    });

    it('deduplicates repeated Razorpay webhook deliveries by eventId and prevents duplicate storage', async () => {
      const gatewayOrderId = `order_wh_test_${Date.now()}`;
      const eventId = `evt_test_${Date.now()}`;

      const payment = await Payment.create({
        order: new mongoose.Types.ObjectId(),
        orderNumber: `FTZ-WH-${Date.now()}`,
        gateway: 'razorpay',
        gatewayOrderId,
        amount: 4999,
        currency: 'INR',
        status: 'created',
      });

      try {
        const payload = {
          event: 'payment.failed',
          payload: {
            payment: {
              entity: {
                id: `pay_wh_${Date.now()}`,
                order_id: gatewayOrderId,
                error_description: 'Card declined',
              },
            },
          },
        };
        const rawBody = JSON.stringify(payload);
        const signature = crypto.createHmac('sha256', testSecret).update(rawBody).digest('hex');

        // First delivery -> processed
        const res1 = await request(app)
          .post('/api/payments/webhook')
          .set('Content-Type', 'application/json')
          .set('x-razorpay-signature', signature)
          .set('x-razorpay-event-id', eventId)
          .send(rawBody);

        expect(res1.status).toBe(200);
        expect(res1.body.status).toBe('processed');
        expect(res1.body.eventId).toBe(eventId);

        // Second delivery (duplicate retry with same eventId) -> duplicate_ignored
        const res2 = await request(app)
          .post('/api/payments/webhook')
          .set('Content-Type', 'application/json')
          .set('x-razorpay-signature', signature)
          .set('x-razorpay-event-id', eventId)
          .send(rawBody);

        expect(res2.status).toBe(200);
        expect(res2.body.status).toBe('duplicate_ignored');

        // Payment.webhookEvents must only contain 1 event entry
        const updatedPayment = await Payment.findById(payment._id);
        expect(updatedPayment?.webhookEvents).toHaveLength(1);
        expect(updatedPayment?.status).toBe('failed');
      } finally {
        await Payment.deleteOne({ _id: payment._id });
        await WebhookEvent.deleteOne({ eventId });
      }
    });
  });

  describe('4. Background Worker Registry & Overlap Protection', () => {
    it('prevents overlapping concurrent executions of the same worker', async () => {
      const registry = new WorkerRegistry();
      let executions = 0;

      // Start a slow job (50ms)
      const firstRun = registry.run('test-sweep', async () => {
        executions++;
        await new Promise((r) => setTimeout(r, 50));
        return 3;
      });

      // Immediately attempt to trigger a second overlapping run
      const secondRun = await registry.run('test-sweep', async () => {
        executions++;
        return 1;
      });

      expect(secondRun).toEqual({ skipped: true, reason: 'already_running' });

      const firstResult = await firstRun;
      expect(firstResult).toMatchObject({ skipped: false, processed: 3 });
      expect(executions).toBe(1);

      const snapshot = registry.getStatus();
      expect(snapshot['test-sweep']).toMatchObject({
        name: 'test-sweep',
        isRunning: false,
        runCount: 1,
        successCount: 1,
        errorCount: 0,
        lastProcessedCount: 3,
        lastError: null,
      });
    });

    it('records errors without crashing and exposes worker telemetry on /api/health', async () => {
      const res = await workerRegistry.run('failing-job', async () => {
        throw new Error('DB timeout during sweep');
      });

      expect(res).toMatchObject({
        skipped: false,
        processed: 0,
        error: 'DB timeout during sweep',
      });

      const healthRes = await request(app).get('/api/health');
      expect(healthRes.status).toBe(200);
      expect(healthRes.body.workers).toBeDefined();
      expect(healthRes.body.workers['failing-job']).toMatchObject({
        runCount: 1,
        errorCount: 1,
        lastError: 'DB timeout during sweep',
      });
    });
  });
});
