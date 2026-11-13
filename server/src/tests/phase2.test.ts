import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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
import { orderService } from '../services/orderService.js';
import { refundService } from '../services/refundService.js';
import { testOutbox } from '../services/emailService.js';

const app = createApp();
const stamp = Date.now();
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const address = { name: 'Test Patron', phone: '9876543210', addressLine: '1 Heritage Road', city: 'Agra', state: 'Uttar Pradesh', pincode: '282001' };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('Phase 2 - accounts, refunds and email', () => {
  let product: any;
  let adminToken = '';
  let demoToken = '';
  const skuA = `FTZ-P2-${stamp}-UK8`;
  const orderIds: string[] = [];

  const register = async (label: string, password = 'Password@123') => {
    const email = `phase2-${label}-${stamp}@example.com`;
    const res = await request(app).post('/api/auth/register').send({ name: `Phase Two ${label}`, email, password });
    expect(res.status).toBe(201);
    return { token: res.body.token as string, id: res.body.user._id as string, email };
  };

  const stock = async () => {
    const inv = await Inventory.findOne({ variantSku: skuA }).lean();
    const prod = await Product.findById(product._id).lean();
    return { available: inv!.availableStock, reserved: inv!.reservedStock, catalog: prod!.variants[0].stock };
  };

  const placeOrder = async (token: string, quantity = 1) => {
    const variant = product.variants[0];
    const res = await request(app)
      .post('/api/orders')
      .set(auth(token))
      .send({
        customerName: 'Test Patron',
        customerEmail: 'phase2@example.com',
        customerPhone: '9876543210',
        items: [{ productId: product.id, variantSku: skuA, size: variant.size, color: variant.color, quantity }],
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
      razorpayPaymentId: `pay_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      razorpaySignature: 'mock_valid_signature_test_mode',
    });
    expect(res.status).toBe(200);
    return res.body;
  };

  const lastEmailTo = (to: string, subjectPart: string) =>
    [...testOutbox].reverse().find((m) => m.to === to && m.subject.includes(subjectPart));

  beforeAll(async () => {
    await connectDB();

    product = await Product.create({
      name: `Phase Two Test Derby ${stamp}`,
      slug: `phase-two-test-derby-${stamp}`,
      description: 'Test product for the phase 2 suite',
      category: 'Loafers',
      price: 4000,
      originalPrice: 5000,
      images: ['https://images.unsplash.com/photo-1614252235316-8c857d38b5f4'],
      colors: [{ name: 'Test Tan', hex: '#8C4E28', imageIndex: 0 }],
      sizes: ['UK 8'],
      variants: [{ sku: skuA, size: 'UK 8', color: 'Test Tan', colorHex: '#8C4E28', stock: 40 }],
    });
    await Inventory.create({ variantSku: skuA, product: product._id, size: 'UK 8', color: 'Test Tan', availableStock: 40, reservedStock: 0 });

    adminToken = (await request(app).post('/api/auth/login').send({ email: 'admin@footzi.in', password: 'Footzi@2026' })).body.token;
    demoToken = (await request(app).post('/api/auth/login').send({ email: 'demo-admin@footzi.in', password: 'Footzi@2026' })).body.token;
  });

  afterAll(async () => {
    const ids = orderIds.map((id) => new mongoose.Types.ObjectId(id));
    await ReturnRequest.deleteMany({ order: { $in: ids } });
    await SupplierOrder.deleteMany({ customerOrder: { $in: ids } });
    await Payment.deleteMany({ order: { $in: ids } });
    await Order.deleteMany({ _id: { $in: ids } });
    const mine = await User.find({ email: new RegExp(`^phase2-.*-${stamp}@example\\.com$`) }).select('_id');
    await Cart.deleteMany({ user: { $in: mine.map((u) => u._id) } });
    await Inventory.deleteMany({ variantSku: skuA });
    await Product.deleteOne({ _id: product._id });
    await User.deleteMany({ email: new RegExp(`^phase2-.*-${stamp}@example\\.com$`) });
    await mongoose.connection.close();
  });

  describe('changing a password', () => {
    it('needs the current password, signs out other devices and keeps this one signed in', async () => {
      const user = await register('change');

      const wrong = await request(app).post('/api/auth/change-password').set(auth(user.token)).send({ currentPassword: 'nope', newPassword: 'Brand-New-Pass1' });
      expect(wrong.status).toBe(400);
      expect(wrong.body.error).toMatch(/current password is incorrect/i);

      const short = await request(app).post('/api/auth/change-password').set(auth(user.token)).send({ currentPassword: 'Password@123', newPassword: 'short' });
      expect(short.status).toBe(400);

      await sleep(1100); // JWT issue time has one-second resolution
      const ok = await request(app).post('/api/auth/change-password').set(auth(user.token)).send({ currentPassword: 'Password@123', newPassword: 'Brand-New-Pass1' });
      expect(ok.status).toBe(200);
      expect(ok.body.user.passwordHash).toBeUndefined();

      // The old token (another device) is void, the fresh one works
      expect((await request(app).get('/api/auth/me').set(auth(user.token))).status).toBe(401);
      expect((await request(app).get('/api/auth/me').set(auth(ok.body.token))).status).toBe(200);

      // Old password stops working, new one works
      expect((await request(app).post('/api/auth/login').send({ email: user.email, password: 'Password@123' })).status).toBe(401);
      expect((await request(app).post('/api/auth/login').send({ email: user.email, password: 'Brand-New-Pass1' })).status).toBe(200);
      expect(lastEmailTo(user.email, 'password was changed')).toBeDefined();
    });

    it('refuses to change the shared demo accounts', async () => {
      const login = await request(app).post('/api/auth/login').send({ email: 'demo-admin@footzi.in', password: 'Footzi@2026' });
      const res = await request(app).post('/api/auth/change-password').set(auth(login.body.token)).send({ currentPassword: 'Footzi@2026', newPassword: 'Taken-Over-1234' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/shared/i);

      const reset = await request(app).post('/api/auth/forgot-password').send({ email: 'demo-admin@footzi.in' });
      expect(reset.status).toBe(200);
      expect(lastEmailTo('demo-admin@footzi.in', 'Reset')).toBeUndefined();
    });
  });

  describe('forgotten passwords', () => {
    it('answers the same for unknown and known emails, and only emails real accounts', async () => {
      const user = await register('forgot');
      const before = testOutbox.length;

      const unknown = await request(app).post('/api/auth/forgot-password').send({ email: `nobody-${stamp}@example.com` });
      const known = await request(app).post('/api/auth/forgot-password').send({ email: user.email });
      expect(unknown.status).toBe(200);
      expect(known.status).toBe(200);
      expect(known.body).toEqual(unknown.body);
      expect(testOutbox.length - before).toBe(1);
      expect(lastEmailTo(user.email, 'Reset your Footzi password')).toBeDefined();
    });

    it('resets with the emailed link exactly once, signs the user in and voids old sessions', async () => {
      const user = await register('reset');
      await request(app).post('/api/auth/forgot-password').send({ email: user.email });
      const mail = lastEmailTo(user.email, 'Reset your Footzi password')!;
      const token = mail.text.match(/token=([a-f0-9]{64})/)![1];

      // The raw token is never stored
      const stored = await User.findById(user.id).select('+resetTokenHash');
      expect(stored!.resetTokenHash).toBeDefined();
      expect(stored!.resetTokenHash).not.toBe(token);

      expect((await request(app).post('/api/auth/reset-password').send({ token, newPassword: 'short' })).status).toBe(400);

      await sleep(1100);
      const ok = await request(app).post('/api/auth/reset-password').send({ token, newPassword: 'Fresh-Start-Pass9' });
      expect(ok.status).toBe(200);
      expect((await request(app).get('/api/auth/me').set(auth(ok.body.token))).status).toBe(200);
      expect((await request(app).get('/api/auth/me').set(auth(user.token))).status).toBe(401);
      expect((await request(app).post('/api/auth/login').send({ email: user.email, password: 'Fresh-Start-Pass9' })).status).toBe(200);

      // Single use
      const again = await request(app).post('/api/auth/reset-password').send({ token, newPassword: 'Another-Pass-1234' });
      expect(again.status).toBe(400);
      expect(again.body.error).toMatch(/invalid or has expired/i);
    });

    it('rejects an expired or made-up token', async () => {
      const user = await register('expired');
      await request(app).post('/api/auth/forgot-password').send({ email: user.email });
      const token = lastEmailTo(user.email, 'Reset your Footzi password')!.text.match(/token=([a-f0-9]{64})/)![1];
      await User.updateOne({ _id: user.id }, { $set: { resetTokenExpires: new Date(Date.now() - 1000) } });

      expect((await request(app).post('/api/auth/reset-password').send({ token, newPassword: 'Fresh-Start-Pass9' })).status).toBe(400);
      expect((await request(app).post('/api/auth/reset-password').send({ token: 'f'.repeat(64), newPassword: 'Fresh-Start-Pass9' })).status).toBe(400);
    });
  });

  describe('profile and addresses', () => {
    it('edits the profile and manages addresses, keeping exactly one default', async () => {
      const user = await register('profile');

      const profile = await request(app).patch('/api/auth/profile').set(auth(user.token)).send({ name: 'Renamed Patron', phone: '+91 98765 43210' });
      expect(profile.status).toBe(200);
      expect(profile.body.user.name).toBe('Renamed Patron');
      expect((await request(app).patch('/api/auth/profile').set(auth(user.token)).send({})).status).toBe(400);
      expect((await request(app).patch('/api/auth/profile').set(auth(user.token)).send({ name: 'x' })).status).toBe(400);

      const first = await request(app).post('/api/auth/addresses').set(auth(user.token)).send(address);
      expect(first.body.user.addresses[0].isDefault).toBe(true); // first address is the default
      const second = await request(app).post('/api/auth/addresses').set(auth(user.token)).send({ ...address, city: 'Delhi', state: 'Delhi', pincode: '110001' });
      const [a1, a2] = second.body.user.addresses;
      expect(a2.isDefault).toBe(false);

      const edited = await request(app).put(`/api/auth/addresses/${a2._id}`).set(auth(user.token)).send({ city: 'New Delhi', isDefault: true });
      expect(edited.status).toBe(200);
      const list = edited.body.user.addresses;
      expect(list.find((a: any) => a._id === a2._id).city).toBe('New Delhi');
      expect(list.filter((a: any) => a.isDefault)).toHaveLength(1);
      expect(list.find((a: any) => a._id === a2._id).isDefault).toBe(true);

      expect((await request(app).put(`/api/auth/addresses/${a1._id}`).set(auth(user.token)).send({ pincode: '12' })).status).toBe(400);

      // Deleting the default promotes the remaining one
      const removed = await request(app).delete(`/api/auth/addresses/${a2._id}`).set(auth(user.token));
      expect(removed.status).toBe(200);
      expect(removed.body.user.addresses).toHaveLength(1);
      expect(removed.body.user.addresses[0].isDefault).toBe(true);
      expect((await request(app).delete(`/api/auth/addresses/${a2._id}`).set(auth(user.token))).status).toBe(400);
    });

    it("cannot touch another customer's address", async () => {
      const owner = await register('owner');
      const intruder = await register('intruder');
      const saved = await request(app).post('/api/auth/addresses').set(auth(owner.token)).send(address);
      const id = saved.body.user.addresses[0]._id;

      expect((await request(app).delete(`/api/auth/addresses/${id}`).set(auth(intruder.token))).status).toBe(400);
      expect((await request(app).put(`/api/auth/addresses/${id}`).set(auth(intruder.token)).send({ city: 'Hacked' })).status).toBe(400);
      const me = await request(app).get('/api/auth/me').set(auth(owner.token));
      expect(me.body.user.addresses[0].city).toBe('Agra');
    });

    it('blocks profile edits on shared demo accounts', async () => {
      const login = await request(app).post('/api/auth/login').send({ email: 'patron@footzi.in', password: 'Footzi@2026' });
      const res = await request(app).patch('/api/auth/profile').set(auth(login.body.token)).send({ name: 'Defaced' });
      expect(res.status).toBe(400);
    });
  });

  describe('cancelling a paid order', () => {
    it('refunds in full, returns the stock, cancels the workshop job and emails the customer', async () => {
      const user = await register('cancel');
      const before = await stock();
      const order = await placeOrder(user.token, 2);
      await payOrder(user.token, order);
      expect(lastEmailTo('phase2@example.com', `Order ${order.orderNumber} confirmed`)).toBeDefined();
      expect((await stock()).available).toBe(before.available - 2);

      const res = await request(app).post(`/api/orders/${order._id}/cancel`).set(auth(user.token)).send({ reason: 'Changed plans' });
      expect(res.status).toBe(200);
      expect(res.body.order.orderStatus).toBe('cancelled');
      expect(res.body.refund).toEqual({ amount: order.total, pending: false });

      const after = await Order.findById(order._id);
      expect(after!.paymentStatus).toBe('refunded');
      expect(after!.refundedAmount).toBe(order.total);
      expect(await stock()).toEqual(before);

      const payment = await Payment.findOne({ order: order._id });
      expect(payment!.status).toBe('refunded');
      expect(payment!.refunds).toHaveLength(1);
      expect(payment!.refunds[0].simulated).toBe(true);
      expect(payment!.refunds[0].amount).toBe(order.total);

      const supplier = await SupplierOrder.findOne({ customerOrder: order._id });
      expect(supplier!.status).toBe('cancelled');
      expect(lastEmailTo('phase2@example.com', `Order ${order.orderNumber} cancelled`)).toBeDefined();

      // A second cancel neither refunds nor restocks again
      expect((await request(app).post(`/api/orders/${order._id}/cancel`).set(auth(user.token)).send({})).status).toBe(400);
      expect(await stock()).toEqual(before);
      expect((await Payment.findOne({ order: order._id }))!.refunds).toHaveLength(1);
    });

    it('refuses once the order has shipped, and for other customers', async () => {
      const user = await register('shipped');
      const other = await register('shippedother');
      const order = await placeOrder(user.token);
      await payOrder(user.token, order);

      expect((await request(app).post(`/api/orders/${order._id}/cancel`).set(auth(other.token)).send({})).status).toBe(400);

      await Order.updateOne({ _id: order._id }, { $set: { orderStatus: 'shipped' } });
      const res = await request(app).post(`/api/orders/${order._id}/cancel`).set(auth(user.token)).send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/can no longer be cancelled/i);
      expect((await Payment.findOne({ order: order._id }))!.refunds).toHaveLength(0);
    });

    it('lets an admin retry a refund that failed, without ever paying twice', async () => {
      const user = await register('retry');
      const order = await placeOrder(user.token);
      await payOrder(user.token, order);
      await request(app).post(`/api/orders/${order._id}/cancel`).set(auth(user.token)).send({});

      // Pretend the gateway had refused the automatic refund
      await Payment.updateOne({ order: order._id }, { $set: { refunds: [], status: 'captured' } });
      await Order.updateOne({ _id: order._id }, { $set: { refundedAmount: 0, paymentStatus: 'paid' } });

      expect((await request(app).post(`/api/admin/orders/${order._id}/refund`).set(auth(demoToken))).status).toBe(403);
      expect((await Payment.findOne({ order: order._id }))!.refunds).toHaveLength(0);

      const retry = await request(app).post(`/api/admin/orders/${order._id}/refund`).set(auth(adminToken));
      expect(retry.status).toBe(200);
      const repeat = await request(app).post(`/api/admin/orders/${order._id}/refund`).set(auth(adminToken));
      expect(repeat.status).toBe(200);
      expect(repeat.body.refund.alreadyIssued).toBe(true);
      expect((await Payment.findOne({ order: order._id }))!.refunds).toHaveLength(1);
      expect((await Order.findById(order._id))!.refundedAmount).toBe(order.total);
    });
  });

  describe('refunds are idempotent', () => {
    it('never refunds one reference twice, or more than was paid', async () => {
      const user = await register('idem');
      const order = await placeOrder(user.token);
      await payOrder(user.token, order);

      const [a, b] = await Promise.all([
        refundService.refundOrder({ orderId: order._id, reference: 'test:one', reason: 'race', amount: 1000, notify: false }),
        refundService.refundOrder({ orderId: order._id, reference: 'test:one', reason: 'race', amount: 1000, notify: false }),
      ]);
      expect([a.alreadyIssued, b.alreadyIssued].sort()).toEqual([false, true]);

      let payment = await Payment.findOne({ order: order._id });
      expect(payment!.refunds).toHaveLength(1);
      expect((await Order.findById(order._id))!.refundedAmount).toBe(1000);
      expect((await Order.findById(order._id))!.paymentStatus).toBe('paid'); // partial refund

      // Asking for more than is left only refunds what is left
      const rest = await refundService.refundOrder({ orderId: order._id, reference: 'test:two', reason: 'rest', amount: 999999, notify: false });
      expect(rest.amount).toBe(order.total - 1000);
      await expect(
        refundService.refundOrder({ orderId: order._id, reference: 'test:three', reason: 'too much', notify: false })
      ).rejects.toThrow(/already been refunded in full/i);

      payment = await Payment.findOne({ order: order._id });
      expect(payment!.refunds.reduce((s, r) => s + r.amount, 0)).toBe(order.total);
      expect((await Order.findById(order._id))!.paymentStatus).toBe('refunded');
    });
  });

  describe('returns pay the customer back', () => {
    it('issues the refund when a return is completed, once', async () => {
      const user = await register('return');
      const order = await placeOrder(user.token);
      await payOrder(user.token, order);
      await Order.updateOne(
        { _id: order._id },
        { $set: { orderStatus: 'delivered' }, $push: { statusHistory: { status: 'delivered', timestamp: new Date() } } }
      );

      const created = await request(app)
        .post('/api/returns')
        .set(auth(user.token))
        .send({ orderId: order._id, type: 'return', items: [{ sku: skuA, quantity: 1, reason: 'Changed mind' }] });
      expect(created.status).toBe(201);
      const id = created.body.returnRequest?._id ?? created.body._id;
      const refundAmount = created.body.returnRequest?.refundAmount ?? created.body.refundAmount;
      expect(refundAmount).toBeGreaterThan(0);

      const move = (status: string) => request(app).patch(`/api/admin/returns/${id}`).set(auth(adminToken)).send({ status });
      for (const step of ['approved', 'pickup_scheduled', 'inspected']) {
        expect((await move(step)).status).toBe(200);
      }
      // No money moves before the return is closed
      expect((await Payment.findOne({ order: order._id }))!.refunds).toHaveLength(0);

      const done = await move('refund_processed');
      expect(done.status).toBe(200);
      expect(done.body.returnRequest.adminNotes).toMatch(/refund of/i);

      const payment = await Payment.findOne({ order: order._id });
      expect(payment!.refunds).toHaveLength(1);
      expect(payment!.refunds[0].amount).toBe(refundAmount);
      expect((await Order.findById(order._id))!.refundedAmount).toBe(refundAmount);
      await sleep(100);
      expect(lastEmailTo('phase2@example.com', 'Refund issued')).toBeDefined();

      // Closed requests cannot be closed again, so no second refund
      expect((await move('refund_processed')).status).toBe(400);
      expect((await Payment.findOne({ order: order._id }))!.refunds).toHaveLength(1);
    });
  });

  describe('late payments', () => {
    it('refunds a genuine payment that arrives after the order expired', async () => {
      const user = await register('late');
      const before = await stock();
      const order = await placeOrder(user.token);
      const gateway = await request(app).post('/api/payments/create-order').set(auth(user.token)).send({ orderId: order._id });

      await Order.collection.updateOne({ _id: new mongoose.Types.ObjectId(order._id) }, { $set: { createdAt: new Date(Date.now() - 60 * 60 * 1000) } });
      expect(await orderService.expireStaleOrders(30)).toBeGreaterThanOrEqual(1);
      expect((await stock()).available).toBe(before.available);

      const res = await request(app).post('/api/payments/verify').set(auth(user.token)).send({
        orderId: order._id,
        razorpayOrderId: gateway.body.gatewayOrderId,
        razorpayPaymentId: `pay_late_${Date.now()}`,
        razorpaySignature: 'mock_valid_signature_test_mode',
      });
      expect(res.status).toBe(400);

      const payment = await Payment.findOne({ order: order._id });
      expect(payment!.refunds).toHaveLength(1);
      expect(payment!.refunds[0].amount).toBe(order.total);
      expect(payment!.failureReason).toMatch(/refunded automatically/i);
      expect(payment!.status).toBe('refunded');
      expect((await Order.findById(order._id))!.orderStatus).toBe('cancelled');
      expect(await stock()).toEqual(before);
    });
  });

  describe('order details for customers', () => {
    it('shows tracking but never wholesale costs or payment signatures', async () => {
      const user = await register('detail');
      const order = await placeOrder(user.token);
      await payOrder(user.token, order);

      const res = await request(app).get(`/api/orders/${order._id}`).set(auth(user.token));
      expect(res.status).toBe(200);
      expect(res.body.supplierOrderId.trackingNumber).toBeTruthy();
      expect(Array.isArray(res.body.supplierOrderId.shipmentEvents)).toBe(true);
      const raw = JSON.stringify(res.body);
      expect(raw).not.toMatch(/totalWholesaleCost|costPerUnit|lineCost|supplierOrderNumber/);
      expect(res.body.paymentDetails.gatewaySignature).toBeUndefined();

      const list = await request(app).get('/api/orders/my-orders').set(auth(user.token));
      expect(JSON.stringify(list.body)).not.toMatch(/gatewaySignature/);

      expect((await request(app).get('/api/orders/not-an-id').set(auth(user.token))).status).toBe(404);
      const admin = await request(app).get(`/api/orders/${order._id}`).set(auth(adminToken));
      expect(JSON.stringify(admin.body)).toMatch(/totalWholesaleCost/);
    });

    it('emails shipping and delivery updates', async () => {
      const user = await register('mail');
      const order = await placeOrder(user.token);
      const paid = await payOrder(user.token, order);

      const supplierId = paid.supplierOrder._id;
      for (const status of ['processing', 'shipped', 'delivered']) {
        const res = await request(app).post(`/api/admin/supplier-orders/${supplierId}/fulfill`).set(auth(adminToken)).send({ status });
        expect(res.status).toBe(200);
      }
      expect(lastEmailTo('phase2@example.com', `Order ${order.orderNumber} has shipped`)).toBeDefined();
      expect(lastEmailTo('phase2@example.com', `Order ${order.orderNumber} delivered`)).toBeDefined();
    });
  });
});
