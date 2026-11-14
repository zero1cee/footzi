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
import { Coupon } from '../models/Coupon.js';
import { Payment } from '../models/Payment.js';
import { SupplierOrder } from '../models/SupplierOrder.js';
import { productService } from '../services/productService.js';

const app = createApp();
const stamp = Date.now();
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const address = { name: 'Test Patron', phone: '9876543210', addressLine: '1 Heritage Road', city: 'Agra', state: 'Uttar Pradesh', pincode: '282001' };

describe('Phase 3 - catalog, coupons and workshop pipeline', () => {
  let product: any;
  let adminToken = '';
  let demoToken = '';
  const skuA = `FTZ-P3-${stamp}-UK8`;
  const skuB = `FTZ-P3-${stamp}-UK9`;
  const orderIds: string[] = [];
  const couponCodes: string[] = [];
  const productIds: string[] = [];
  const skus = [skuA, skuB];

  const register = async (label: string) => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: `Phase Three ${label}`, email: `phase3-${label}-${stamp}@example.com`, password: 'Password@123' });
    expect(res.status).toBe(201);
    return { token: res.body.token as string, id: res.body.user._id as string };
  };

  const stock = async (sku = skuA) => {
    const inv = await Inventory.findOne({ variantSku: sku }).lean();
    const prod = await Product.findOne({ 'variants.sku': sku }).lean();
    return { available: inv!.availableStock, reserved: inv!.reservedStock, catalog: prod!.variants.find((v: any) => v.sku === sku)!.stock };
  };

  const placeOrder = async (token: string, opts: { quantity?: number; couponCode?: string } = {}) => {
    const variant = product.variants[0];
    return request(app)
      .post('/api/orders')
      .set(auth(token))
      .send({
        customerName: 'Test Patron',
        customerEmail: 'phase3@example.com',
        customerPhone: '9876543210',
        items: [{ productId: product.id, variantSku: skuA, size: variant.size, color: variant.color, quantity: opts.quantity ?? 1 }],
        shippingAddress: address,
        couponCode: opts.couponCode,
      });
  };

  const placed = async (token: string, opts: { quantity?: number; couponCode?: string } = {}) => {
    const res = await placeOrder(token, opts);
    expect(res.status).toBe(201);
    orderIds.push(res.body.order._id);
    return res.body.order;
  };

  const pay = async (token: string, order: any) => {
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

  const makeCoupon = async (code: string, extra: Record<string, unknown> = {}) => {
    couponCodes.push(code);
    return Coupon.create({ code, type: 'percent', value: 10, ...extra });
  };

  const validate = (code: string, subtotal: number, token?: string) => {
    const r = request(app).post('/api/coupons/validate');
    if (token) r.set(auth(token));
    return r.send({ code, subtotal });
  };

  beforeAll(async () => {
    await connectDB();

    product = await Product.create({
      name: `Phase Three Test Boot ${stamp}`,
      slug: `phase-three-test-boot-${stamp}`,
      description: 'Test product for the phase 3 suite',
      category: 'Boots',
      price: 4000,
      originalPrice: 5000,
      images: ['https://images.unsplash.com/photo-1614252235316-8c857d38b5f4'],
      colors: [{ name: 'Test Tan', hex: '#8C4E28', imageIndex: 0 }],
      sizes: ['UK 8', 'UK 9'],
      variants: [{ sku: skuA, size: 'UK 8', color: 'Test Tan', colorHex: '#8C4E28', stock: 30 }],
    });
    productIds.push(product.id);
    await Inventory.create({ variantSku: skuA, product: product._id, size: 'UK 8', color: 'Test Tan', availableStock: 30, reservedStock: 0 });

    adminToken = (await request(app).post('/api/auth/login').send({ email: 'admin@footzi.in', password: 'Footzi@2026' })).body.token;
    demoToken = (await request(app).post('/api/auth/login').send({ email: 'demo-admin@footzi.in', password: 'Footzi@2026' })).body.token;
  });

  afterAll(async () => {
    const ids = orderIds.map((id) => new mongoose.Types.ObjectId(id));
    await SupplierOrder.deleteMany({ customerOrder: { $in: ids } });
    await Payment.deleteMany({ order: { $in: ids } });
    await Order.deleteMany({ _id: { $in: ids } });
    const mine = await User.find({ email: new RegExp(`^phase3-.*-${stamp}@example\\.com$`) }).select('_id');
    await Cart.deleteMany({ user: { $in: mine.map((u) => u._id) } });
    await Coupon.deleteMany({ code: { $in: couponCodes } });
    await Inventory.deleteMany({ variantSku: { $in: skus } });
    await Product.deleteMany({ $or: [{ _id: { $in: productIds } }, { 'variants.sku': { $in: skus } }] });
    await User.deleteMany({ email: new RegExp(`^phase3-.*-${stamp}@example\\.com$`) });
    await mongoose.connection.close();
  });

  describe('supplier pipeline', () => {
    const fulfill = (id: string, status: string, note?: string) =>
      request(app).post(`/api/admin/supplier-orders/${id}/fulfill`).set(auth(adminToken)).send({ status, note });

    it('moves forward one step at a time and never backwards', async () => {
      const user = await register('pipeline');
      const order = await placed(user.token);
      const paid = await pay(user.token, order);
      const id = paid.supplierOrder._id;

      expect((await fulfill(id, 'shipped')).status).toBe(400);
      expect((await fulfill(id, 'delivered')).status).toBe(400);
      expect((await fulfill(id, 'processing')).status).toBe(200);
      expect((await fulfill(id, 'accepted')).status).toBe(400);
      expect((await fulfill(id, 'shipped')).status).toBe(200);
      expect((await Order.findById(order._id))!.orderStatus).toBe('shipped');

      // Once shipped it cannot be cancelled, only delivered
      const cancel = await fulfill(id, 'cancelled');
      expect(cancel.status).toBe(400);
      expect(cancel.body.error).toMatch(/can only move to: delivered/);

      expect((await fulfill(id, 'delivered')).status).toBe(200);
      const done = await fulfill(id, 'processing');
      expect(done.status).toBe(400);
      expect(done.body.error).toMatch(/can no longer change/);
      expect((await Order.findById(order._id))!.orderStatus).toBe('delivered');
    });

    it('lets only one of two simultaneous updates win', async () => {
      const user = await register('race');
      const order = await placed(user.token);
      const id = (await pay(user.token, order)).supplierOrder._id;

      const [a, b] = await Promise.all([fulfill(id, 'processing'), fulfill(id, 'processing')]);
      expect([a.status, b.status].sort()).toEqual([200, 400]);
      const events = (await SupplierOrder.findById(id))!.shipmentEvents.filter((e) => e.status === 'PROCESSING');
      expect(events).toHaveLength(1);
    });

    it('a workshop cancellation refunds the customer and returns the stock', async () => {
      const user = await register('workshopcancel');
      const before = await stock();
      const order = await placed(user.token, { quantity: 2 });
      const id = (await pay(user.token, order)).supplierOrder._id;
      expect((await stock()).available).toBe(before.available - 2);

      const res = await fulfill(id, 'cancelled', 'Leather shortage');
      expect(res.status).toBe(200);
      expect(res.body.supplierOrder.status).toBe('cancelled');

      const after = await Order.findById(order._id);
      expect(after!.orderStatus).toBe('cancelled');
      expect(after!.paymentStatus).toBe('refunded');
      expect(after!.refundedAmount).toBe(order.total);
      expect(after!.statusHistory.at(-1)!.note).toBe('Leather shortage');
      expect(await stock()).toEqual(before);
      expect((await Payment.findOne({ order: order._id }))!.refunds).toHaveLength(1);

      expect((await fulfill(id, 'cancelled')).status).toBe(400);
      expect((await Payment.findOne({ order: order._id }))!.refunds).toHaveLength(1);
    });
  });

  describe('coupons', () => {
    it('ships the starter codes', async () => {
      const codes = (await Coupon.find({ code: { $in: ['FOOTZI10', 'AGRAFIRST'] } })).map((c) => c.code).sort();
      expect(codes).toEqual(['AGRAFIRST', 'FOOTZI10']);
    });

    it('checks a code against the bag and reports the discount the order will get', async () => {
      const res = await validate('footzi10', 4000);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ valid: true, code: 'FOOTZI10', type: 'percent', value: 10, discount: 400 });

      const bad = await validate('NOPE', 4000);
      expect(bad.status).toBe(400);
      expect(bad.body).toMatchObject({ valid: false, error: 'This coupon code is not valid.' });
      expect((await validate('', 4000)).status).toBe(400);
    });

    it('applies minimum order, cap, flat amounts, expiry and the active switch', async () => {
      await makeCoupon(`MIN${stamp}`, { minOrderValue: 3000 });
      const tooSmall = await validate(`MIN${stamp}`, 2500);
      expect(tooSmall.status).toBe(400);
      expect(tooSmall.body.error).toMatch(/Add ₹500 more/);
      expect((await validate(`MIN${stamp}`, 3000)).body.discount).toBe(300);

      await makeCoupon(`CAP${stamp}`, { value: 50, maxDiscount: 700 });
      expect((await validate(`CAP${stamp}`, 4000)).body.discount).toBe(700);

      await makeCoupon(`FLAT${stamp}`, { type: 'flat', value: 500 });
      expect((await validate(`FLAT${stamp}`, 4000)).body.discount).toBe(500);
      expect((await validate(`FLAT${stamp}`, 300)).body.discount).toBe(300); // never more than the bag

      await makeCoupon(`OLD${stamp}`, { expiresAt: new Date(Date.now() - 1000) });
      expect((await validate(`OLD${stamp}`, 4000)).body.error).toMatch(/expired/);

      await makeCoupon(`OFF${stamp}`, { isActive: false });
      expect((await validate(`OFF${stamp}`, 4000)).status).toBe(400);
    });

    it('applies the server discount to the order, and refuses a bad code instead of ignoring it', async () => {
      const user = await register('discount');
      const order = await placed(user.token, { couponCode: 'footzi10' });
      expect(order.couponCode).toBe('FOOTZI10');
      expect(order.discount).toBe(400);
      expect(order.total).toBe(order.subtotal - 400 + order.shippingFee);

      const bad = await placeOrder(user.token, { couponCode: 'MADEUP' });
      expect(bad.status).toBe(400);
      expect(bad.body.error).toBe('This coupon code is not valid.');
    });

    it('keeps a first-order code for first orders, and gives the use back when the order is cancelled', async () => {
      const user = await register('first');
      const before = await validate('AGRAFIRST', 4000, user.token);
      expect(before.status).toBe(200);

      const order = await placed(user.token, { couponCode: 'AGRAFIRST' });
      expect(order.discount).toBe(600);

      const again = await validate('AGRAFIRST', 4000, user.token);
      expect(again.status).toBe(400);
      expect(again.body.error).toMatch(/first order/);
      expect((await placeOrder(user.token, { couponCode: 'AGRAFIRST' })).status).toBe(400);

      // A guest preview cannot know, but the order will check
      expect((await validate('AGRAFIRST', 4000)).status).toBe(200);

      await request(app).post(`/api/orders/${order._id}/cancel`).set(auth(user.token)).send({});
      expect((await validate('AGRAFIRST', 4000, user.token)).status).toBe(200);
    });

    it('enforces per-customer and total limits', async () => {
      const code = `LIM${stamp}`;
      await makeCoupon(code, { perUserLimit: 1, usageLimit: 1 });
      const first = await register('limitfirst');
      const second = await register('limitsecond');

      const order = await placed(first.token, { couponCode: code });
      expect((await validate(code, 4000, first.token)).body.error).toMatch(/already used/i);

      const exhausted = await placeOrder(second.token, { couponCode: code });
      expect(exhausted.status).toBe(400);
      expect(exhausted.body.error).toMatch(/fully redeemed/);

      // An order that was never paid and expires frees the redemption
      await request(app).post(`/api/orders/${order._id}/cancel`).set(auth(first.token)).send({});
      expect((await placeOrder(second.token, { couponCode: code })).status).toBe(201);
    });

    it('lets an admin manage codes with validation, and nobody else', async () => {
      const code = `NEW${stamp}`;
      couponCodes.push(code);
      const send = (body: any, token = adminToken) => request(app).post('/api/admin/coupons').set(auth(token)).send(body);

      expect((await send({ code: 'x', type: 'percent', value: 10 })).status).toBe(400);
      expect((await send({ code, type: 'percent', value: 95 })).body.error).toMatch(/cannot exceed 90%/);
      expect((await send({ code, type: 'flat', value: -5 })).status).toBe(400);

      const created = await send({ code: code.toLowerCase(), type: 'percent', value: 20, description: 'Test', usageLimit: 5 });
      expect(created.status).toBe(201);
      expect(created.body.coupon.code).toBe(code);
      expect((await send({ code, type: 'percent', value: 20 })).body.error).toMatch(/already exists/);

      const id = created.body.coupon._id;
      const update = (body: any, token = adminToken) => request(app).put(`/api/admin/coupons/${id}`).set(auth(token)).send(body);
      const edited = await update({ value: 25, usageLimit: null, code: 'HIJACK' });
      expect(edited.status).toBe(200);
      expect(edited.body.coupon).toMatchObject({ code, value: 25 });
      expect(edited.body.coupon.usageLimit).toBeUndefined();
      expect((await update({ isActive: false })).body.coupon.isActive).toBe(false);
      expect((await validate(code, 4000)).status).toBe(400);
      expect((await update({})).status).toBe(400);

      const list = await request(app).get('/api/admin/coupons').set(auth(adminToken));
      expect(list.body.find((c: any) => c.code === code)).toMatchObject({ used: 0 });

      // The read-only demo admin can look, not change
      expect((await request(app).get('/api/admin/coupons').set(auth(demoToken))).status).toBe(200);
      expect((await send({ code: `DEMO${stamp}`, type: 'flat', value: 10 }, demoToken)).status).toBe(403);
      const customer = await register('couponcustomer');
      expect((await request(app).get('/api/admin/coupons').set(auth(customer.token))).status).toBe(403);
    });
  });

  describe('editing products', () => {
    const edit = (id: string, body: any, token = adminToken) => request(app).put(`/api/admin/products/${id}`).set(auth(token)).send(body);

    it('rejects bad input and ignores fields the admin is not meant to set', async () => {
      expect((await edit(product.id, { price: -5 })).status).toBe(400);
      expect((await edit(product.id, { price: 5000, originalPrice: 4000 })).body.error).toMatch(/Original price cannot be lower/);
      expect((await edit(product.id, { images: ['javascript:alert(1)'] })).status).toBe(400);
      expect((await edit(product.id, { images: ['http://insecure.example/a.jpg'] })).status).toBe(400);
      expect((await edit(product.id, { category: 'Sandals' })).status).toBe(400);
      expect((await edit(product.id, {})).status).toBe(400);
      expect((await edit('not-an-id', { name: 'Whatever' })).status).toBe(404);

      const res = await edit(product.id, { description: 'A refined description of the boot', rating: 1, reviewCount: 999, slug: 'hijacked', reviews: [{ author: 'x' }], isAdmin: true });
      expect(res.status).toBe(200);
      const fresh = await Product.findById(product.id).lean();
      expect(fresh!.description).toBe('A refined description of the boot');
      expect(fresh!.rating).toBe(4.8);
      expect(fresh!.reviewCount).toBe(0);
      expect(fresh!.slug).toBe(`phase-three-test-boot-${stamp}`);
      expect(fresh!.reviews).toHaveLength(0);
    });

    it('recomputes the discount and leaves stock alone when variants are resent', async () => {
      // Hold two pairs for an unpaid order
      const user = await register('editstock');
      await placed(user.token, { quantity: 2 });
      const held = await stock();
      expect(held.reserved).toBeGreaterThanOrEqual(2);

      const res = await edit(product.id, {
        price: 3000,
        originalPrice: 5000,
        variants: [{ sku: skuA, size: 'UK 8', color: 'Test Tan', colorHex: '#8C4E28', stock: 999 }],
      });
      expect(res.status).toBe(200);
      expect(res.body.product.discountPercent).toBe(40);
      expect(await stock()).toEqual(held); // the "999" never reaches inventory or reserved holds
    });

    it('adds a new variant with its opening stock, and refuses an SKU that belongs to another product', async () => {
      const res = await edit(product.id, {
        variants: [
          { sku: skuA, size: 'UK 8', color: 'Test Tan', colorHex: '#8C4E28' },
          { sku: skuB, size: 'UK 9', color: 'Test Tan', colorHex: '#8C4E28', stock: 7 },
        ],
      });
      expect(res.status).toBe(200);
      expect(await stock(skuB)).toEqual({ available: 7, reserved: 0, catalog: 7 });

      const other = await request(app)
        .post('/api/admin/products')
        .set(auth(adminToken))
        .send({
          name: `Phase Three Clash ${stamp}`,
          category: 'Boots',
          description: 'A boot that tries to reuse an existing SKU',
          price: 3000,
          images: ['https://images.unsplash.com/photo-1614252235316-8c857d38b5f4'],
          variants: [{ sku: skuB, size: 'UK 9', color: 'Test Tan', colorHex: '#8C4E28', stock: 3 }],
        });
      expect(other.status).toBe(400);
      expect(other.body.error).toMatch(/already used by/);
      expect((await Inventory.findOne({ variantSku: skuB }))!.availableStock).toBe(7);

      const repeat = await request(app)
        .post('/api/admin/products')
        .set(auth(adminToken))
        .send({
          name: `Phase Three Repeat ${stamp}`,
          category: 'Boots',
          description: 'A boot that repeats its own SKU twice',
          price: 3000,
          images: ['https://images.unsplash.com/photo-1614252235316-8c857d38b5f4'],
          variants: [
            { sku: `FTZ-P3-${stamp}-DUP`, size: 'UK 9', color: 'Test Tan', colorHex: '#8C4E28' },
            { sku: `FTZ-P3-${stamp}-DUP`, size: 'UK 8', color: 'Test Tan', colorHex: '#8C4E28' },
          ],
        });
      expect(repeat.status).toBe(400);
    });

    it('keeps the catalog stock equal to available plus held pairs when stock is edited', async () => {
      const before = await stock();
      const res = await request(app).patch(`/api/admin/inventory/${skuA}`).set(auth(adminToken)).send({ availableStock: 12 });
      expect(res.status).toBe(200);
      const after = await stock();
      expect(after.available).toBe(12);
      expect(after.catalog).toBe(12 + before.reserved);
    });

    it('lists archived products for admins only, and brings one back', async () => {
      const archive = await request(app).patch(`/api/admin/products/${product.id}/toggle-active`).set(auth(adminToken));
      expect(archive.body.isActive).toBe(false);

      const publicList = await request(app).get('/api/products?limit=100');
      expect(publicList.body.products.some((p: any) => p.id === product.id)).toBe(false);
      const adminList = await request(app).get('/api/admin/products').set(auth(adminToken));
      expect(adminList.status).toBe(200);
      expect(adminList.body.products.find((p: any) => p.id === product.id)).toMatchObject({ isActive: false });

      const customer = await register('catalogcustomer');
      expect((await request(app).get('/api/admin/products').set(auth(customer.token))).status).toBe(403);
      expect((await edit(product.id, { name: 'Hacked' }, demoToken)).status).toBe(403);

      const restore = await request(app).patch(`/api/admin/products/${product.id}/toggle-active`).set(auth(adminToken));
      expect(restore.body.isActive).toBe(true);
    });

    it('creates a product through validation and initialises its inventory', async () => {
      const sku = `FTZ-P3-${stamp}-NEW`;
      skus.push(sku);
      const res = await request(app)
        .post('/api/admin/products')
        .set(auth(adminToken))
        .send({
          name: `Phase Three Created ${stamp}`,
          category: 'Oxfords',
          description: 'A freshly created test oxford for phase three',
          price: 2500,
          originalPrice: 3000,
          images: ['https://images.unsplash.com/photo-1614252235316-8c857d38b5f4'],
          variants: [{ sku: sku.toLowerCase(), size: 'UK 10', color: 'Black', colorHex: '#111111', stock: 4 }],
        });
      expect(res.status).toBe(201);
      productIds.push(res.body.product._id);
      expect(res.body.product.discountPercent).toBe(17);
      expect(await stock(sku)).toEqual({ available: 4, reserved: 0, catalog: 4 });

      const dup = await request(app).post('/api/admin/products').set(auth(adminToken)).send({
        name: `Phase Three Created ${stamp}`,
        category: 'Oxfords',
        description: 'Same name again, which would collide on the URL',
        price: 2500,
        images: ['https://images.unsplash.com/photo-1614252235316-8c857d38b5f4'],
        variants: [{ sku: `FTZ-P3-${stamp}-NEW2`, size: 'UK 10', color: 'Black', colorHex: '#111111', stock: 1 }],
      });
      expect(dup.status).toBe(400);
      expect(dup.body.error).toMatch(/already exists/);
      expect((await productService.getProducts({ limit: 5, includeInactive: true })).products.length).toBeGreaterThan(0);
    });
  });

  describe('image upload', () => {
    const upload = (image: unknown) => request(app).post('/api/admin/products/upload-image').set(auth(adminToken)).send({ image });

    it('reuses an https link, and says so plainly when it cannot store a file', async () => {
      const link = await upload('https://images.unsplash.com/photo-1614252235316-8c857d38b5f4');
      expect(link.status).toBe(200);
      expect(link.body.secureUrl).toBe('https://images.unsplash.com/photo-1614252235316-8c857d38b5f4');

      const file = await upload('data:image/png;base64,iVBORw0KGgo=');
      expect(file.status).toBe(501);
      expect(file.body.error).toMatch(/not set up on this server/);

      expect((await upload('not an image')).status).toBe(400);
      expect((await upload('data:text/html;base64,PGgxPg==')).status).toBe(400);
      expect((await upload('http://insecure.example/x.jpg')).status).toBe(400);
      expect((await request(app).post('/api/admin/products/upload-image').set(auth(adminToken)).send({})).status).toBe(400);
    });
  });
});
