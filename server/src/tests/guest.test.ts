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
import { testOutbox } from '../services/emailService.js';
import { orderAccessToken } from '../services/orderAccess.js';

const app = createApp();
const stamp = Date.now();
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const address = { name: 'Guest Buyer', phone: '9876543210', addressLine: '1 Heritage Road', city: 'Agra', state: 'Uttar Pradesh', pincode: '282001' };

describe('Guest checkout', () => {
  let product: any;
  let adminToken = '';
  const sku = `FTZ-GU-${stamp}-UK8`;
  const orderIds: string[] = [];
  let counter = 0;

  const email = (label: string) => `guest-${label}-${stamp}@example.com`;
  const stock = async () => {
    const inv = await Inventory.findOne({ variantSku: sku }).lean();
    return { available: inv!.availableStock, reserved: inv!.reservedStock };
  };

  const placeGuest = async (customerEmail: string, opts: { quantity?: number; couponCode?: string } = {}) => {
    const variant = product.variants[0];
    return request(app)
      .post('/api/orders/guest')
      .send({
        customerName: 'Guest Buyer',
        customerEmail,
        customerPhone: '9876543210',
        items: [{ productId: product.id, variantSku: sku, size: variant.size, color: variant.color, quantity: opts.quantity ?? 1 }],
        shippingAddress: address,
        couponCode: opts.couponCode,
      });
  };

  const placedGuest = async (customerEmail: string, opts: { quantity?: number; couponCode?: string } = {}) => {
    const res = await placeGuest(customerEmail, opts);
    expect(res.status).toBe(201);
    orderIds.push(res.body.order._id);
    return { order: res.body.order, token: res.body.accessToken as string };
  };

  const payAsGuest = async (order: any, token: string) => {
    const gateway = await request(app).post('/api/payments/create-order').set('X-Order-Token', token).send({ orderId: order._id });
    expect(gateway.status).toBe(200);
    return request(app).post('/api/payments/verify').set('X-Order-Token', token).send({
      orderId: order._id,
      razorpayOrderId: gateway.body.gatewayOrderId,
      razorpayPaymentId: `pay_guest_${Date.now()}_${counter++}`,
      razorpaySignature: 'mock_valid_signature_test_mode',
    });
  };

  const register = async (label: string) => {
    const res = await request(app).post('/api/auth/register').send({ name: `Guest Test ${label}`, email: email(`member-${label}`), password: 'Password@123' });
    expect(res.status).toBe(201);
    return { token: res.body.token as string, id: res.body.user._id as string, email: email(`member-${label}`) };
  };

  const lastMailTo = (to: string, part: string) => [...testOutbox].reverse().find((m) => m.to === to && m.subject.includes(part));

  beforeAll(async () => {
    await connectDB();
    product = await Product.create({
      name: `Guest Test Brogue ${stamp}`,
      slug: `guest-test-brogue-${stamp}`,
      description: 'Test product for the guest checkout suite',
      category: 'Oxfords',
      price: 4000,
      originalPrice: 5000,
      images: ['https://images.unsplash.com/photo-1614252235316-8c857d38b5f4'],
      colors: [{ name: 'Test Tan', hex: '#8C4E28', imageIndex: 0 }],
      sizes: ['UK 8'],
      variants: [{ sku, size: 'UK 8', color: 'Test Tan', colorHex: '#8C4E28', stock: 60 }],
    });
    await Inventory.create({ variantSku: sku, product: product._id, size: 'UK 8', color: 'Test Tan', availableStock: 60, reservedStock: 0 });
    adminToken = (await request(app).post('/api/auth/login').send({ email: 'admin@footzi.in', password: 'Footzi@2026' })).body.token;
  });

  afterAll(async () => {
    const ids = orderIds.map((id) => new mongoose.Types.ObjectId(id));
    await SupplierOrder.deleteMany({ customerOrder: { $in: ids } });
    await Payment.deleteMany({ order: { $in: ids } });
    await Order.deleteMany({ _id: { $in: ids } });
    const members = await User.find({ email: new RegExp(`^guest-.*-${stamp}@example\\.com$`) }).select('_id');
    await Cart.deleteMany({ user: { $in: members.map((u) => u._id) } });
    await User.deleteMany({ _id: { $in: members.map((u) => u._id) } });
    await Inventory.deleteMany({ variantSku: sku });
    await Product.deleteOne({ _id: product._id });
    await mongoose.connection.close();
  });

  describe('placing and paying for an order without an account', () => {
    it('creates a guest order, holds the stock and hands back the order secret', async () => {
      const before = await stock();
      const { order, token } = await placedGuest(email('place'), { quantity: 2 });

      expect(order.isGuest).toBe(true);
      expect(order.user).toBeUndefined();
      expect(order.orderStatus).toBe('pending_payment');
      expect(token).toMatch(/^[0-9a-f]{64}$/);
      expect(token).toBe(orderAccessToken(order._id));
      expect((await stock()).reserved).toBe(before.reserved + 2);
    });

    it('rejects a bad email or an empty bag', async () => {
      const bad = await placeGuest('not-an-email');
      expect(bad.status).toBe(400);
      expect(bad.body.error).toMatch(/valid email/i);

      const empty = await request(app).post('/api/orders/guest').send({
        customerName: 'G', customerEmail: email('empty'), customerPhone: '9876543210', items: [], shippingAddress: address,
      });
      expect(empty.status).toBe(400);
    });

    it('lets the guest pay, confirms the order, queues the workshop and emails a private link', async () => {
      const buyer = email('pay');
      const { order, token } = await placedGuest(buyer);
      const paid = await payAsGuest(order, token);

      expect(paid.status).toBe(200);
      expect(paid.body.verified).toBe(true);
      expect(paid.body.order.orderStatus).toBe('processing');
      expect(paid.body.supplierOrder.trackingNumber).toMatch(/^BD-AGR-/);

      const mail = lastMailTo(buyer, 'confirmed')!;
      expect(mail).toBeDefined();
      // The secret is after the # (never sent to the server), and it is the right one for this order
      expect(mail.text).toContain(`/order/${order._id}#t=${token}`);
      expect(mail.text).not.toContain(`?t=`);
    });

    it('refuses to pay without the link, with a wrong secret, or with another order\'s secret', async () => {
      const a = await placedGuest(email('pa'));
      const b = await placedGuest(email('pb'));

      const none = await request(app).post('/api/payments/create-order').send({ orderId: a.order._id });
      expect(none.status).toBe(401);

      const wrong = await request(app).post('/api/payments/create-order').set('X-Order-Token', 'f'.repeat(64)).send({ orderId: a.order._id });
      expect(wrong.status).toBe(400);
      expect(wrong.body.error).toMatch(/order not found/i);

      const swapped = await request(app).post('/api/payments/create-order').set('X-Order-Token', b.token).send({ orderId: a.order._id });
      expect(swapped.status).toBe(400);

      expect((await Order.findById(a.order._id))!.paymentStatus).toBe('pending');
    });

    it('does not let a guest secret open an order that belongs to an account', async () => {
      const member = await register('own');
      const variant = product.variants[0];
      const placed = await request(app).post('/api/orders').set(auth(member.token)).send({
        customerName: 'Member', customerEmail: member.email, customerPhone: '9876543210',
        items: [{ productId: product.id, variantSku: sku, size: variant.size, color: variant.color, quantity: 1 }],
        shippingAddress: address,
      });
      expect(placed.status).toBe(201);
      orderIds.push(placed.body.order._id);

      // The HMAC secret exists for any order id, but it only opens orders that are still guest orders
      const forged = orderAccessToken(placed.body.order._id);
      const res = await request(app).get(`/api/orders/${placed.body.order._id}`).set('X-Order-Token', forged);
      expect(res.status).toBe(404);
    });

    it('caps how many unpaid orders one email can hold, and frees a slot when one is cancelled', async () => {
      const holder = email('cap');
      const held = [];
      for (let i = 0; i < 3; i++) held.push(await placedGuest(holder));

      const fourth = await placeGuest(holder);
      expect(fourth.status).toBe(400);
      expect(fourth.body.error).toMatch(/unpaid orders waiting/i);

      const cancelled = await request(app).post(`/api/orders/${held[0].order._id}/cancel`).set('X-Order-Token', held[0].token).send({});
      expect(cancelled.status).toBe(200);
      expect((await placeGuest(holder)).status).toBe(201);
    });
  });

  describe('viewing and cancelling', () => {
    it('shows the order with tracking, never the wholesale costs, only to the holder of the link', async () => {
      const { order, token } = await placedGuest(email('view'));
      await payAsGuest(order, token);

      const mine = await request(app).get(`/api/orders/${order._id}`).set('X-Order-Token', token);
      expect(mine.status).toBe(200);
      expect(mine.body.supplierOrderId.trackingNumber).toBeTruthy();
      expect(JSON.stringify(mine.body)).not.toMatch(/totalWholesaleCost|costPerUnit|gatewaySignature/);

      expect((await request(app).get(`/api/orders/${order._id}`)).status).toBe(401);
      expect((await request(app).get(`/api/orders/${order._id}`).set('X-Order-Token', 'a'.repeat(64))).status).toBe(404);

      const someoneElse = await register('nosy');
      expect((await request(app).get(`/api/orders/${order._id}`).set(auth(someoneElse.token))).status).toBe(404);

      const staff = await request(app).get(`/api/orders/${order._id}`).set(auth(adminToken));
      expect(staff.status).toBe(200);
      expect(JSON.stringify(staff.body)).toMatch(/totalWholesaleCost/);
    });

    it('cancels an unpaid guest order and releases its stock exactly once', async () => {
      const before = await stock();
      const { order, token } = await placedGuest(email('cancel1'), { quantity: 2 });
      expect((await stock()).reserved).toBe(before.reserved + 2);

      const res = await request(app).post(`/api/orders/${order._id}/cancel`).set('X-Order-Token', token).send({ reason: 'Changed my mind' });
      expect(res.status).toBe(200);
      expect(await stock()).toEqual(before);

      expect((await request(app).post(`/api/orders/${order._id}/cancel`).set('X-Order-Token', token).send({})).status).toBe(400);
      expect(await stock()).toEqual(before);
    });

    it('cancels a paid guest order before dispatch with a full refund', async () => {
      const buyer = email('cancel2');
      const before = await stock();
      const { order, token } = await placedGuest(buyer);
      await payAsGuest(order, token);

      const res = await request(app).post(`/api/orders/${order._id}/cancel`).set('X-Order-Token', token).send({});
      expect(res.status).toBe(200);
      expect(res.body.refund).toEqual({ amount: order.total, pending: false });
      expect((await Order.findById(order._id))!.paymentStatus).toBe('refunded');
      expect(await stock()).toEqual(before);
      expect(lastMailTo(buyer, 'cancelled')).toBeDefined();

      // A guest cannot cancel someone else's order with their own secret
      const other = await placedGuest(email('cancel3'));
      expect((await request(app).post(`/api/orders/${other.order._id}/cancel`).set('X-Order-Token', token).send({})).status).toBe(400);
    });
  });

  describe('adding a guest order to an account', () => {
    it('moves the order into the account, and the guest link stops working', async () => {
      const { order, token } = await placedGuest(email('claim'));
      await payAsGuest(order, token);
      const member = await register('claimer');

      const claimed = await request(app).post(`/api/orders/${order._id}/claim`).set(auth(member.token)).send({ token });
      expect(claimed.status).toBe(200);
      expect(claimed.body.order.isGuest).toBe(false);
      expect(String(claimed.body.order.user)).toBe(member.id);

      const mine = await request(app).get('/api/orders/my-orders').set(auth(member.token));
      expect(mine.body.map((o: any) => o._id)).toContain(order._id);
      expect((await request(app).get(`/api/orders/${order._id}`).set('X-Order-Token', token)).status).toBe(404);
      expect((await request(app).get(`/api/orders/${order._id}`).set(auth(member.token))).status).toBe(200);

      // Only once
      const again = await request(app).post(`/api/orders/${order._id}/claim`).set(auth((await register('second')).token)).send({ token });
      expect(again.status).toBe(400);
    });

    it('needs sign-in and the real secret', async () => {
      const { order, token } = await placedGuest(email('claim2'));
      expect((await request(app).post(`/api/orders/${order._id}/claim`).send({ token })).status).toBe(401);

      const member = await register('thief');
      const wrong = await request(app).post(`/api/orders/${order._id}/claim`).set(auth(member.token)).send({ token: 'b'.repeat(64) });
      expect(wrong.status).toBe(400);
      expect((await Order.findById(order._id))!.isGuest).toBe(true);
    });
  });

  describe('finding an order again', () => {
    it('emails the link for a matching order number and email, in any letter case', async () => {
      const buyer = email('lookup');
      const { order, token } = await placedGuest(buyer);
      const before = testOutbox.length;

      const res = await request(app).post('/api/orders/lookup').send({ orderNumber: order.orderNumber.toLowerCase(), email: buyer.toUpperCase() });
      expect(res.status).toBe(200);
      expect(testOutbox.length - before).toBe(1);
      expect(lastMailTo(buyer, order.orderNumber)!.text).toContain(`#t=${token}`);
    });

    it('answers identically and sends nothing when the pair does not match, so nothing can be probed', async () => {
      const buyer = email('lookup2');
      const { order } = await placedGuest(buyer);
      const before = testOutbox.length;

      const known = await request(app).post('/api/orders/lookup').send({ orderNumber: order.orderNumber, email: buyer });
      const wrongEmail = await request(app).post('/api/orders/lookup').send({ orderNumber: order.orderNumber, email: email('stranger') });
      const unknown = await request(app).post('/api/orders/lookup').send({ orderNumber: 'FTZ-AGR-000000', email: buyer });

      expect(wrongEmail.status).toBe(known.status);
      expect(wrongEmail.body).toEqual(known.body);
      expect(unknown.body).toEqual(known.body);
      expect(testOutbox.length - before).toBe(1); // only the real match was emailed

      expect((await request(app).post('/api/orders/lookup').send({ orderNumber: 'x', email: 'nope' })).status).toBe(400);
    });
  });

  describe('coupons follow the customer, not the account', () => {
    it('a first-order code works once per email for guests, and a later account cannot reuse it', async () => {
      const buyer = email('coupon');
      const check = (token?: string, em: string | undefined = buyer) =>
        request(app).post('/api/coupons/validate').set(token ? auth(token) : {}).send({ code: 'AGRAFIRST', subtotal: 4000, email: em });

      expect((await check()).status).toBe(200);
      const { order } = await placedGuest(buyer, { couponCode: 'AGRAFIRST' });
      expect(order.discount).toBe(600);

      const again = await check();
      expect(again.status).toBe(400);
      expect(again.body.error).toMatch(/first order/i);
      expect((await placeGuest(buyer, { couponCode: 'AGRAFIRST' })).status).toBe(400);

      // Signing up afterwards with the same email does not give a fresh first order
      const member = await register('coupon');
      expect((await check(member.token)).status).toBe(400);
      expect((await check(member.token, email('someone-new'))).status).toBe(200);

      // Cancelling the order gives the use back
      await request(app).post(`/api/orders/${order._id}/cancel`).set('X-Order-Token', orderAccessToken(order._id)).send({});
      expect((await check()).status).toBe(200);
    });
  });

  describe('returns still need an account', () => {
    it('a guest cannot open a return', async () => {
      const { order } = await placedGuest(email('ret'));
      const res = await request(app).post('/api/returns').send({ orderId: order._id, type: 'return', items: [{ sku, quantity: 1, reason: 'Changed mind' }] });
      expect(res.status).toBe(401);
    });
  });
});
