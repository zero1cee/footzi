import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { Inventory } from '../models/Inventory.js';
import { Order } from '../models/Order.js';
import { Cart } from '../models/Cart.js';
import { Payment } from '../models/Payment.js';
import { SupplierOrder } from '../models/SupplierOrder.js';
import { ReturnRequest } from '../models/ReturnRequest.js';
import { Setting } from '../models/Setting.js';
import { defaultSettings, settingsService, shippingFor } from '../services/settingsService.js';
import { orderService } from '../services/orderService.js';

const app = createApp();
const stamp = Date.now();
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const address = { name: 'Settings Tester', phone: '9876543210', addressLine: '1 Heritage Road', city: 'Agra', state: 'Uttar Pradesh', pincode: '282001' };

describe('Shop settings', () => {
  let adminToken = '';
  let demoToken = '';
  let customer = { token: '', id: '' };
  let product: any;
  const sku = `FTZ-ST-${stamp}-UK8`;
  const orderIds: string[] = [];

  const withSettings = (over: Record<string, unknown>) =>
    vi.spyOn(settingsService, 'get').mockResolvedValue({ ...defaultSettings(), ...over } as any);

  const place = async (quantity = 1) => {
    const v = product.variants[0];
    const res = await request(app).post('/api/orders').set(auth(customer.token)).send({
      customerName: 'Settings Tester', customerEmail: `settings-cust-${stamp}@example.com`, customerPhone: '9876543210',
      items: [{ productId: product.id, variantSku: sku, size: v.size, color: v.color, quantity }],
      shippingAddress: address,
    });
    expect(res.status).toBe(201);
    orderIds.push(res.body.order._id);
    return res.body.order;
  };

  beforeAll(async () => {
    await connectDB();
    product = await Product.create({
      name: `Settings Test Boot ${stamp}`, slug: `settings-test-boot-${stamp}`, description: 'Test product for the settings suite',
      category: 'Boots', price: 4000, originalPrice: 4500, images: ['https://images.unsplash.com/photo-1614252235316-8c857d38b5f4'],
      colors: [{ name: 'Tan', hex: '#8C4E28', imageIndex: 0 }], sizes: ['UK 8'],
      variants: [{ sku, size: 'UK 8', color: 'Tan', colorHex: '#8C4E28', stock: 50 }],
    });
    await Inventory.create({ variantSku: sku, product: product._id, size: 'UK 8', color: 'Tan', availableStock: 50, reservedStock: 0 });
    adminToken = (await request(app).post('/api/auth/login').send({ email: 'admin@footzi.in', password: 'Footzi@2026' })).body.token;
    demoToken = (await request(app).post('/api/auth/login').send({ email: 'demo-admin@footzi.in', password: 'Footzi@2026' })).body.token;
    const reg = await request(app).post('/api/auth/register').send({ name: 'Settings Customer', email: `settings-cust-${stamp}@example.com`, password: 'Password@123' });
    customer = { token: reg.body.token, id: reg.body.user._id };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    settingsService.clearCache();
  });

  afterAll(async () => {
    const ids = orderIds.map((id) => new mongoose.Types.ObjectId(id));
    await ReturnRequest.deleteMany({ order: { $in: ids } });
    await SupplierOrder.deleteMany({ customerOrder: { $in: ids } });
    await Payment.deleteMany({ order: { $in: ids } });
    await Order.deleteMany({ _id: { $in: ids } });
    await Cart.deleteMany({ user: customer.id });
    await Inventory.deleteMany({ variantSku: sku });
    await Product.deleteOne({ _id: product._id });
    await User.deleteMany({ email: new RegExp(`^settings-cust-${stamp}@`) });
    await mongoose.connection.close();
  });

  describe('reading them', () => {
    it('gives the storefront the rules it needs, with no sign-in, cached for a minute', async () => {
      const res = await request(app).get('/api/settings');
      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toMatch(/max-age=60/);
      expect(res.body).toMatchObject({
        freeShippingThreshold: expect.any(Number),
        shippingFee: expect.any(Number),
        orderExpiryMinutes: expect.any(Number),
        returnWindowDays: expect.any(Number),
        announcement: { enabled: expect.any(Boolean), message: expect.any(String) },
      });
    });

    it('shipping is free exactly at the threshold and charged below it', () => {
      const s = { freeShippingThreshold: 1999, shippingFee: 149 };
      expect(shippingFor(1998, s)).toBe(149);
      expect(shippingFor(1999, s)).toBe(0);
      expect(shippingFor(5000, s)).toBe(0);
      expect(shippingFor(500, { freeShippingThreshold: 0, shippingFee: 99 })).toBe(0); // 0 = everything ships free
    });
  });

  describe('changing them', () => {
    const put = (body: any, token = adminToken) => request(app).put('/api/admin/settings').set(auth(token)).send(body);

    it('is for the real admin only', async () => {
      expect((await request(app).get('/api/admin/settings')).status).toBe(401);
      expect((await request(app).put('/api/admin/settings').send({ shippingFee: 10 })).status).toBe(401);
      expect((await put({ shippingFee: 10 }, customer.token)).status).toBe(403);
      expect((await put({ shippingFee: 10 }, demoToken)).status).toBe(403);
      expect((await request(app).get('/api/admin/settings').set(auth(demoToken))).status).toBe(200); // looking is fine
    });

    it('rejects values that would break the shop, with a plain reason', async () => {
      const bad: [any, RegExp][] = [
        [{}, /nothing to update/i],
        [{ shippingFee: -5 }, /cannot be negative/i],
        [{ freeShippingThreshold: 'free' }, /must be a number/i],
        [{ orderExpiryMinutes: 2 }, /at least 5 minutes/i],
        [{ orderExpiryMinutes: 99999 }, /at most 24 hours/i],
        [{ orderExpiryMinutes: 10.5 }, /whole minutes/i],
        [{ returnWindowDays: 0 }, /at least 1 day/i],
        [{ returnWindowDays: 400 }, /at most 60 days/i],
        [{ announcement: { message: '' } }, /needs a message/i],
        [{ announcement: { message: 'x'.repeat(161) } }, /under 160/i],
        [{ announcement: { code: 'bad code!' } }, /letters, numbers/i],
        [{ announcement: { message: 'Use {code} today', code: '' } }, /enter a coupon code/i],
      ];
      for (const [body, message] of bad) {
        const res = await put(body);
        expect([JSON.stringify(body).slice(0, 60), res.status]).toEqual([JSON.stringify(body).slice(0, 60), 400]);
        expect(res.body.error).toMatch(message);
      }
    });

    it('saves only what was sent, uppercases the code, and takes effect straight away', async () => {
      const before = (await request(app).get('/api/admin/settings').set(auth(adminToken))).body;
      try {
        const res = await put({ announcement: { label: 'Sale:', message: 'Take 10% off with {code}', code: 'saleten' } });
        expect(res.status).toBe(200);
        expect(res.body.settings.announcement).toMatchObject({ label: 'Sale:', message: 'Take 10% off with {code}', code: 'SALETEN' });
        // Nothing else was reset
        expect(res.body.settings.shippingFee).toBe(before.shippingFee);
        expect(res.body.settings.freeShippingThreshold).toBe(before.freeShippingThreshold);
        expect(res.body.settings.returnWindowDays).toBe(before.returnWindowDays);

        const seen = await request(app).get('/api/settings');
        expect(seen.body.announcement.code).toBe('SALETEN');

        const stored = await Setting.findOne({ key: 'shop' }).lean();
        expect(stored!.updatedBy).toBe('admin@footzi.in');
        expect(await Setting.countDocuments({ key: 'shop' })).toBe(1); // still one document
      } finally {
        await put({ announcement: before.announcement });
      }
    });
  });

  describe('being used', () => {
    it('prices shipping from the settings when an order is placed', async () => {
      withSettings({ freeShippingThreshold: 5000, shippingFee: 99 });
      const small = await place(1); // 4000 is under 5000
      expect(small.shippingFee).toBe(99);
      expect(small.total).toBe(small.subtotal - small.discount + 99);

      settingsService.clearCache();
      vi.restoreAllMocks();
      withSettings({ freeShippingThreshold: 3000, shippingFee: 99 });
      const big = await place(1);
      expect(big.shippingFee).toBe(0);
      expect(big.total).toBe(big.subtotal - big.discount);
    });

    it('lets unpaid orders live for the configured minutes', async () => {
      const order = await place(1);
      await Order.collection.updateOne({ _id: new mongoose.Types.ObjectId(order._id) }, { $set: { createdAt: new Date(Date.now() - 20 * 60 * 1000) } });

      withSettings({ orderExpiryMinutes: 60 });
      await orderService.expireStaleOrders();
      expect((await Order.findById(order._id))!.orderStatus).toBe('pending_payment');

      vi.restoreAllMocks();
      withSettings({ orderExpiryMinutes: 10 });
      await orderService.expireStaleOrders();
      expect((await Order.findById(order._id))!.orderStatus).toBe('cancelled');
    });

    it('opens returns for the configured number of days after delivery', async () => {
      const order = await place(1);
      const gateway = await request(app).post('/api/payments/create-order').set(auth(customer.token)).send({ orderId: order._id });
      await request(app).post('/api/payments/verify').set(auth(customer.token)).send({
        orderId: order._id, razorpayOrderId: gateway.body.gatewayOrderId, razorpayPaymentId: `pay_st_${Date.now()}`, razorpaySignature: 'mock_valid_signature_test_mode',
      });
      await Order.updateOne({ _id: order._id }, { $set: { orderStatus: 'delivered' }, $push: { statusHistory: { status: 'delivered', timestamp: new Date(Date.now() - 3 * 86_400_000) } } });
      const ask = () => request(app).post('/api/returns').set(auth(customer.token)).send({ orderId: order._id, type: 'return', items: [{ sku, quantity: 1, reason: 'Changed mind' }] });

      withSettings({ returnWindowDays: 2 });
      const closed = await ask();
      expect(closed.status).toBe(400);
      expect(closed.body.error).toMatch(/2-day return window/);

      vi.restoreAllMocks();
      withSettings({ returnWindowDays: 7 });
      expect((await ask()).status).toBe(201);
    });
  });
});
