import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { connectDB } from '../config/db.js';
import { RAZORPAY_CONFIG } from '../config/razorpay.js';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { Inventory } from '../models/Inventory.js';
import { Order } from '../models/Order.js';
import { Cart } from '../models/Cart.js';
import { Payment } from '../models/Payment.js';
import { SupplierOrder } from '../models/SupplierOrder.js';
import { ReturnRequest } from '../models/ReturnRequest.js';
import { orderService } from '../services/orderService.js';

const app = createApp();
const stamp = Date.now();
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const address = { name: 'Test Patron', phone: '9876543210', addressLine: '1 Heritage Road', city: 'Agra', state: 'Uttar Pradesh', pincode: '282001' };

describe('Phase 1 - trust and correctness', () => {
  let product: any;
  let buyer = { token: '', id: '' };
  let stranger = { token: '', id: '' };
  let adminToken = '';
  let demoToken = '';
  const skuA = `FTZ-P1-${stamp}-UK8`;
  const skuB = `FTZ-P1-${stamp}-UK9`;
  const orderIds: string[] = [];

  const register = async (label: string) => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: `Phase One ${label}`, email: `phase1-${label}-${stamp}@example.com`, password: 'Password@123' });
    return { token: res.body.token as string, id: res.body.user._id as string };
  };

  const stock = async (sku: string) => {
    const inv = await Inventory.findOne({ variantSku: sku }).lean();
    return { available: inv!.availableStock, reserved: inv!.reservedStock };
  };

  const placeOrder = async (token: string, sku = skuA, quantity = 1) => {
    const variant = product.variants.find((v: any) => v.sku === sku);
    const res = await request(app)
      .post('/api/orders')
      .set(auth(token))
      .send({
        customerName: 'Test Patron',
        customerEmail: 'phase1@example.com',
        customerPhone: '9876543210',
        items: [{ productId: product.id, variantSku: sku, size: variant.size, color: variant.color, quantity }],
        shippingAddress: address,
      });
    expect(res.status).toBe(201);
    orderIds.push(res.body.order._id);
    return res.body.order;
  };

  const payOrder = async (token: string, order: any) => {
    const gateway = await request(app).post('/api/payments/create-order').set(auth(token)).send({ orderId: order._id });
    const res = await request(app).post('/api/payments/verify').set(auth(token)).send({
      orderId: order._id,
      razorpayOrderId: gateway.body.gatewayOrderId,
      razorpayPaymentId: `pay_${Date.now()}`,
      razorpaySignature: 'mock_valid_signature_test_mode',
    });
    expect(res.status).toBe(200);
    return res.body;
  };

  // createdAt is immutable in Mongoose, so ageing an order for a test goes through the driver
  const ageOrders = (ids: string[], minutes: number) =>
    Order.collection.updateMany(
      { _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } },
      { $set: { createdAt: new Date(Date.now() - minutes * 60 * 1000) } }
    );

  const markDelivered = (orderId: string, daysAgo = 0) =>
    Order.updateOne(
      { _id: orderId },
      {
        $set: { orderStatus: 'delivered' },
        $push: { statusHistory: { status: 'delivered', timestamp: new Date(Date.now() - daysAgo * 86_400_000) } },
      }
    );

  beforeAll(async () => {
    await connectDB();

    product = await Product.create({
      name: `Phase One Test Loafer ${stamp}`,
      slug: `phase-one-test-loafer-${stamp}`,
      description: 'Test product for the phase 1 suite',
      category: 'Loafers',
      price: 4000,
      originalPrice: 5000,
      images: ['https://images.unsplash.com/photo-1614252235316-8c857d38b5f4'],
      colors: [{ name: 'Test Tan', hex: '#8C4E28', imageIndex: 0 }],
      sizes: ['UK 8', 'UK 9'],
      variants: [
        { sku: skuA, size: 'UK 8', color: 'Test Tan', colorHex: '#8C4E28', stock: 20 },
        { sku: skuB, size: 'UK 9', color: 'Test Tan', colorHex: '#8C4E28', stock: 20 },
      ],
    });
    for (const v of product.variants) {
      await Inventory.create({ variantSku: v.sku, product: product._id, size: v.size, color: v.color, availableStock: 20, reservedStock: 0 });
    }

    buyer = await register('buyer');
    stranger = await register('stranger');
    adminToken = (await request(app).post('/api/auth/login').send({ email: 'admin@footzi.in', password: 'Footzi@2026' })).body.token;
    demoToken = (await request(app).post('/api/auth/login').send({ email: 'demo-admin@footzi.in', password: 'Footzi@2026' })).body.token;
  });

  afterAll(async () => {
    const ids = orderIds.map((id) => new mongoose.Types.ObjectId(id));
    await ReturnRequest.deleteMany({ order: { $in: ids } });
    await SupplierOrder.deleteMany({ customerOrder: { $in: ids } });
    await Payment.deleteMany({ order: { $in: ids } });
    await Order.deleteMany({ _id: { $in: ids } });
    await Cart.deleteMany({ user: { $in: [buyer.id, stranger.id] } });
    await Inventory.deleteMany({ variantSku: { $in: [skuA, skuB] } });
    await Product.deleteOne({ _id: product._id });
    await User.deleteMany({ email: new RegExp(`^phase1-.*-${stamp}@example\\.com$`) });
    await mongoose.connection.close();
  });

  describe('abandoned orders expire', () => {
    it('cancels an unpaid order past the window and releases its stock, leaving paid and fresh orders alone', async () => {
      const before = await stock(skuA);

      const abandoned = await placeOrder(buyer.token, skuA, 2);
      const fresh = await placeOrder(buyer.token, skuA, 1);
      const paid = await placeOrder(buyer.token, skuA, 1);
      await payOrder(buyer.token, paid);
      expect((await stock(skuA)).reserved).toBe(before.reserved + 3);

      // Make two of them old; one is paid, one is not
      await ageOrders([abandoned._id, paid._id], 60);

      const expired = await orderService.expireStaleOrders(30);
      expect(expired).toBeGreaterThanOrEqual(1);

      expect((await Order.findById(abandoned._id))!.orderStatus).toBe('cancelled');
      expect((await Order.findById(fresh._id))!.orderStatus).toBe('pending_payment');
      expect((await Order.findById(paid._id))!.paymentStatus).toBe('paid');

      // Only the abandoned pair of 2 went back to the shelf; fresh (1) is still held, paid (1) is sold
      const after = await stock(skuA);
      expect(after.reserved).toBe(before.reserved + 1);
      expect(after.available).toBe(before.available - 1 - 1);

      // A second sweep must not release the same stock again
      await orderService.expireStaleOrders(30);
      expect(await stock(skuA)).toEqual(after);
    });

    it('refuses payment for an order that has expired', async () => {
      const order = await placeOrder(buyer.token, skuB, 1);
      await ageOrders([order._id], 120);
      await orderService.expireStaleOrders(30);

      const res = await request(app).post('/api/payments/create-order').set(auth(buyer.token)).send({ orderId: order._id });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/cannot be paid for/);
    });
  });

  describe('reviews', () => {
    const review = { rating: 5, comment: 'Superb leather and a perfect fit.', title: 'Excellent' };

    it('requires sign-in', async () => {
      const res = await request(app).post(`/api/products/${product.id}/reviews`).send(review);
      expect(res.status).toBe(401);
    });

    it('rejects invalid ratings', async () => {
      const res = await request(app).post(`/api/products/${product.id}/reviews`).set(auth(stranger.token)).send({ ...review, rating: 9 });
      expect(res.status).toBe(400);
    });

    it('marks a review from a non-buyer unverified and uses the account name, not the request', async () => {
      const res = await request(app)
        .post(`/api/products/${product.id}/reviews`)
        .set(auth(stranger.token))
        .send({ ...review, author: 'Someone Else', verified: true });
      expect(res.status).toBe(201);
      expect(res.body.review.author).toBe('Phase One stranger');
      expect(res.body.review.verified).toBe(false);
    });

    it('allows one review per customer', async () => {
      const res = await request(app).post(`/api/products/${product.id}/reviews`).set(auth(stranger.token)).send(review);
      expect(res.status).toBe(409);
    });

    it('marks a review from a paying customer verified and updates the rating', async () => {
      const order = await placeOrder(buyer.token, skuB, 1);
      await payOrder(buyer.token, order);

      const res = await request(app).post(`/api/products/${product.id}/reviews`).set(auth(buyer.token)).send({ ...review, rating: 3 });
      expect(res.status).toBe(201);
      expect(res.body.review.verified).toBe(true);

      const stored = await Product.findById(product._id);
      expect(stored!.reviewCount).toBe(2);
      expect(stored!.rating).toBe(4); // (5 + 3) / 2
    });
  });

  describe('returns and exchanges', () => {
    let deliveredOrder: any;

    beforeAll(async () => {
      deliveredOrder = await placeOrder(buyer.token, skuA, 2);
      await payOrder(buyer.token, deliveredOrder);
    });

    const ask = (token: string, body: any) => request(app).post('/api/returns').set(auth(token)).send(body);
    const item = (extra: any = {}) => ({ sku: skuA, quantity: 1, reason: 'Fit issue - too tight', ...extra });

    it('is closed until the order is delivered', async () => {
      const res = await ask(buyer.token, { orderId: deliveredOrder._id, type: 'return', items: [item()] });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/delivered/);
    });

    it('is closed once the 7-day window has passed', async () => {
      const old = await placeOrder(buyer.token, skuB, 1);
      await payOrder(buyer.token, old);
      await markDelivered(old._id, 9);
      const res = await ask(buyer.token, { orderId: old._id, type: 'return', items: [item({ sku: skuB })] });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/window/);
    });

    it("does not open another customer's order", async () => {
      await markDelivered(deliveredOrder._id, 1);
      const res = await ask(stranger.token, { orderId: deliveredOrder._id, type: 'return', items: [item()] });
      expect(res.status).toBe(400);
    });

    it('refunds the price paid on the order, whatever the browser claims', async () => {
      const res = await ask(buyer.token, { orderId: deliveredOrder._id, type: 'return', items: [{ ...item(), price: 1, productName: 'Hacked' }] });
      expect(res.status).toBe(201);
      expect(res.body.returnRequest.refundAmount).toBe(4000);
      expect(res.body.returnRequest.items[0].price).toBe(4000);
      expect(res.body.returnRequest.items[0].productName).toBe(product.name);
    });

    it('cannot claim more pairs than were ordered', async () => {
      // 2 ordered, 1 already requested: one more is fine, a further one is not
      expect((await ask(buyer.token, { orderId: deliveredOrder._id, type: 'return', items: [item()] })).status).toBe(201);
      const res = await ask(buyer.token, { orderId: deliveredOrder._id, type: 'return', items: [item()] });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already has a return/);
    });

    it('holds the replacement pair, gives it back on rejection, and checks the size', async () => {
      const order = await placeOrder(buyer.token, skuA, 1);
      await payOrder(buyer.token, order);
      await markDelivered(order._id, 0);

      const same = await ask(buyer.token, { orderId: order._id, type: 'exchange', items: [item({ replacementSize: 'UK 8' })] });
      expect(same.status).toBe(400);
      const missing = await ask(buyer.token, { orderId: order._id, type: 'exchange', items: [item({ replacementSize: 'UK 11' })] });
      expect(missing.status).toBe(400);
      expect(missing.body.error).toMatch(/not available/);

      const before = await stock(skuB);
      const created = await ask(buyer.token, { orderId: order._id, type: 'exchange', items: [item({ replacementSize: 'UK 9' })] });
      expect(created.status).toBe(201);
      expect(created.body.returnRequest.items[0].replacementSku).toBe(skuB);
      expect(await stock(skuB)).toEqual({ available: before.available - 1, reserved: before.reserved + 1 });

      const rejected = await request(app)
        .patch(`/api/admin/returns/${created.body.returnRequest._id}`)
        .set(auth(adminToken))
        .send({ status: 'rejected', adminNotes: 'Worn outdoors' });
      expect(rejected.status).toBe(200);
      expect(await stock(skuB)).toEqual(before);
    });

    it('restocks a returned pair once the refund is processed', async () => {
      const order = await placeOrder(buyer.token, skuA, 1);
      await payOrder(buyer.token, order);
      await markDelivered(order._id, 0);
      const created = await ask(buyer.token, { orderId: order._id, type: 'return', items: [item()] });
      expect(created.status).toBe(201);

      const before = await stock(skuA);
      const catalogBefore = (await Product.findById(product._id))!.variants.find((v) => v.sku === skuA)!.stock;
      for (const status of ['approved', 'pickup_scheduled', 'inspected', 'refund_processed']) {
        const res = await request(app).patch(`/api/admin/returns/${created.body.returnRequest._id}`).set(auth(adminToken)).send({ status });
        expect(res.status).toBe(200);
      }
      expect((await stock(skuA)).available).toBe(before.available + 1);
      expect((await Product.findById(product._id))!.variants.find((v) => v.sku === skuA)!.stock).toBe(catalogBefore + 1);

      // A return cannot end as a replacement
      const wrong = await request(app).patch(`/api/admin/returns/${created.body.returnRequest._id}`).set(auth(adminToken)).send({ status: 'replacement_dispatched' });
      expect(wrong.status).toBe(400);
    });
  });

  describe('guest bag merge', () => {
    const line = (sku: string, quantity: number) => ({
      productId: product.id,
      variantSku: sku,
      size: sku === skuA ? 'UK 8' : 'UK 9',
      color: 'Test Tan',
      quantity,
    });
    const merge = (items: any[]) => request(app).post('/api/cart/merge').set(auth(stranger.token)).send({ items });

    it('adds guest items to the saved bag', async () => {
      const res = await merge([line(skuA, 2), line(skuB, 1)]);
      expect(res.status).toBe(200);
      expect(res.body.cart.items).toHaveLength(2);
      expect(res.body.cart.items.find((i: any) => i.variantSku === skuA).quantity).toBe(2);
    });

    it('is idempotent: merging the same bag again does not add up', async () => {
      const res = await merge([line(skuA, 2), line(skuB, 1)]);
      expect(res.body.cart.items.find((i: any) => i.variantSku === skuA).quantity).toBe(2);
      expect(res.body.cart.subtotal).toBe(3 * 4000);
    });

    it('keeps the larger quantity and caps at stock, skipping items that do not exist', async () => {
      const res = await merge([line(skuA, 5), line(skuB, 99), { ...line(skuA, 1), productId: new mongoose.Types.ObjectId().toString(), variantSku: 'NOPE' }]);
      expect(res.status).toBe(200);
      expect(res.body.cart.items.find((i: any) => i.variantSku === skuA).quantity).toBe(5);
      expect(res.body.cart.items.find((i: any) => i.variantSku === skuB).quantity).toBe(10);
      expect(res.body.cart.items).toHaveLength(2);
    });

    it('requires sign-in', async () => {
      expect((await request(app).post('/api/cart/merge').send({ items: [] })).status).toBe(401);
    });
  });

  describe('payment webhook', () => {
    const secret = 'whsec_phase1_test_secret';
    const original = RAZORPAY_CONFIG.webhook_secret;
    beforeAll(() => { RAZORPAY_CONFIG.webhook_secret = secret; });
    afterAll(() => { RAZORPAY_CONFIG.webhook_secret = original; });

    const send = (payload: any, signature?: string) => {
      const raw = JSON.stringify(payload);
      const sig = signature ?? crypto.createHmac('sha256', secret).update(raw).digest('hex');
      return request(app).post('/api/payments/webhook').set('Content-Type', 'application/json').set('x-razorpay-signature', sig).send(raw);
    };
    const captured = (gatewayOrderId: string, amount: number) => ({
      event: 'payment.captured',
      payload: { payment: { entity: { id: `pay_wh_${Date.now()}`, order_id: gatewayOrderId, amount } } },
    });

    it('rejects a webhook with a bad signature', async () => {
      const res = await send(captured('order_x', 100), 'deadbeef');
      expect(res.status).toBe(400);
    });

    it('confirms an order whose customer closed the tab before verifying, exactly once', async () => {
      const order = await placeOrder(buyer.token, skuA, 1);
      const gateway = await request(app).post('/api/payments/create-order').set(auth(buyer.token)).send({ orderId: order._id });

      expect((await send(captured(gateway.body.gatewayOrderId, order.total * 100))).status).toBe(200);
      // Razorpay retries deliveries; a replay must change nothing
      expect((await send(captured(gateway.body.gatewayOrderId, order.total * 100))).status).toBe(200);

      const stored = await Order.findById(order._id);
      expect(stored!.paymentStatus).toBe('paid');
      expect(stored!.orderStatus).toBe('processing');
      expect(await SupplierOrder.countDocuments({ customerOrder: order._id })).toBe(1);
    });

    it('does not confirm an order when the captured amount is wrong', async () => {
      const order = await placeOrder(buyer.token, skuA, 1);
      const gateway = await request(app).post('/api/payments/create-order').set(auth(buyer.token)).send({ orderId: order._id });
      await send(captured(gateway.body.gatewayOrderId, 100));
      expect((await Order.findById(order._id))!.paymentStatus).toBe('pending');
    });
  });

  describe('read-only demo admin', () => {
    it('can read the operations desk', async () => {
      const res = await request(app).get('/api/admin/analytics').set(auth(demoToken));
      expect(res.status).toBe(200);
      expect(res.body.metrics).toBeDefined();
    });

    it('cannot change anything', async () => {
      const stockEdit = await request(app).patch(`/api/admin/inventory/${skuA}`).set(auth(demoToken)).send({ availableStock: 0 });
      expect(stockEdit.status).toBe(403);
      expect(stockEdit.body.message).toMatch(/read-only/);
      expect((await stock(skuA)).available).toBeGreaterThan(0);

      const create = await request(app).post('/api/admin/products').set(auth(demoToken)).send({ name: 'x' });
      expect(create.status).toBe(403);
    });

    it('sees customer contact details masked', async () => {
      const res = await request(app).get('/api/admin/orders?limit=50').set(auth(demoToken));
      expect(res.status).toBe(200);
      const json = JSON.stringify(res.body);
      expect(json).not.toContain('phase1@example.com');
      expect(json).toContain('p***@example.com');
      expect(json).not.toContain('9876543210');
      expect(json).not.toContain('1 Heritage Road');
    });

    it('is not available to ordinary customers or guests', async () => {
      expect((await request(app).get('/api/admin/analytics').set(auth(buyer.token))).status).toBe(403);
      expect((await request(app).get('/api/admin/analytics')).status).toBe(401);
    });

    it('public registration cannot create any admin', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Sneaky', email: `phase1-sneaky-${stamp}@example.com`, password: 'Password@123', role: 'demo_admin' });
      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('customer');
    });
  });
});
