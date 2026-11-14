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

const app = createApp();
const stamp = Date.now();
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

// Details a real person typed at checkout: none of these may ever be shown to the next visitor of a shared demo account
const PII = {
  name: `Privacy Tester ${stamp}`,
  phone: '9811122233',
  addressLine: `${stamp} Secret Lane, Mahavir Colony`,
  pincode: '283204',
  email: `privacy-${stamp}@example.com`,
};
const address = { name: PII.name, phone: PII.phone, addressLine: PII.addressLine, city: 'Firozabad', state: 'Uttar Pradesh', pincode: PII.pincode };

describe('Shared demo accounts never show customer details', () => {
  let product: any;
  const sku = `FTZ-DP-${stamp}-UK8`;
  const orderIds: string[] = [];
  let patron = '';
  let demoAdmin = '';
  let admin = '';
  let customer = { token: '', id: '' };

  const login = async (email: string, password = 'Footzi@2026') => (await request(app).post('/api/auth/login').send({ email, password })).body.token as string;
  const place = async (token: string) => {
    const v = product.variants[0];
    const res = await request(app).post('/api/orders').set(auth(token)).send({
      customerName: PII.name, customerEmail: PII.email, customerPhone: PII.phone,
      items: [{ productId: product.id, variantSku: sku, size: v.size, color: v.color, quantity: 1 }],
      shippingAddress: address,
    });
    expect(res.status).toBe(201);
    orderIds.push(res.body.order._id);
    return res.body.order;
  };
  const leaks = (body: unknown) => {
    const raw = JSON.stringify(body);
    return [PII.name, PII.phone, PII.addressLine, PII.pincode, PII.email].filter((v) => raw.includes(v));
  };

  beforeAll(async () => {
    await connectDB();
    product = await Product.create({
      name: `Privacy Test Loafer ${stamp}`, slug: `privacy-test-loafer-${stamp}`, description: 'Test product for the demo privacy suite',
      category: 'Loafers', price: 4000, originalPrice: 4500, images: ['https://images.unsplash.com/photo-1614252235316-8c857d38b5f4'],
      colors: [{ name: 'Tan', hex: '#8C4E28', imageIndex: 0 }], sizes: ['UK 8'],
      variants: [{ sku, size: 'UK 8', color: 'Tan', colorHex: '#8C4E28', stock: 40 }],
    });
    await Inventory.create({ variantSku: sku, product: product._id, size: 'UK 8', color: 'Tan', availableStock: 40, reservedStock: 0 });
    patron = await login('patron@footzi.in');
    demoAdmin = await login('demo-admin@footzi.in');
    admin = await login('admin@footzi.in');
    const reg = await request(app).post('/api/auth/register').send({ name: 'Privacy Customer', email: `privacy-cust-${stamp}@example.com`, password: 'Password@123' });
    customer = { token: reg.body.token, id: reg.body.user._id };
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
    await User.deleteMany({ email: new RegExp(`^privacy-cust-${stamp}@`) });
    await mongoose.connection.close();
  });

  it('the shared patron account sees masked orders, in the list, by id, and after cancelling', async () => {
    const order = await place(patron);
    expect(order.orderNumber).toBeDefined();

    const list = await request(app).get('/api/orders/my-orders').set(auth(patron));
    expect(list.status).toBe(200);
    const mine = list.body.find((o: any) => o._id === order._id);
    expect(mine).toBeDefined();
    expect(leaks(list.body)).toEqual([]);
    expect(mine.orderNumber).toBe(order.orderNumber); // the order itself stays visible
    expect(mine.total).toBe(order.total);

    // A second visitor signing in with the same public demo button sees the same masked view
    const nextVisitor = await login('patron@footzi.in');
    expect(leaks((await request(app).get(`/api/orders/${order._id}`).set(auth(nextVisitor))).body)).toEqual([]);

    const cancelled = await request(app).post(`/api/orders/${order._id}/cancel`).set(auth(patron)).send({});
    expect(cancelled.status).toBe(200);
    expect(leaks(cancelled.body)).toEqual([]);
  });

  it('the read-only demo admin cannot read a real customer\'s details through the order or return pages', async () => {
    const order = await place(customer.token);

    const byId = await request(app).get(`/api/orders/${order._id}`).set(auth(demoAdmin));
    expect(byId.status).toBe(200);
    expect(leaks(byId.body)).toEqual([]);
    expect(byId.body.orderNumber).toBe(order.orderNumber);

    // The same pages stay complete for the real owner and for the real admin
    expect(leaks((await request(app).get(`/api/orders/${order._id}`).set(auth(customer.token))).body).length).toBeGreaterThanOrEqual(3);
    expect(leaks((await request(app).get(`/api/orders/${order._id}`).set(auth(admin))).body).length).toBeGreaterThanOrEqual(3);

    const ret = await ReturnRequest.create({
      returnNumber: `RET-DP-${stamp}`, order: order._id, user: customer.id, type: 'return', status: 'requested', carrier: 'x',
      items: [{ sku, productName: product.name, size: 'UK 8', color: 'Tan', quantity: 1, price: 4000, reason: 'Changed mind' }],
    } as any);
    const seen = await request(app).get(`/api/returns/${ret._id}`).set(auth(demoAdmin));
    expect(seen.status).toBe(200);
    expect(JSON.stringify(seen.body)).not.toContain(`privacy-cust-${stamp}@example.com`);
    expect(JSON.stringify(seen.body)).not.toContain('Privacy Customer');
  });

  it('the shared accounts cannot save, change or remove addresses, but real customers can', async () => {
    const body = { name: 'Someone', phone: '9876543210', addressLine: '1 Shared Road', city: 'Agra', state: 'UP', pincode: '282001' };
    for (const token of [patron, demoAdmin]) {
      const add = await request(app).post('/api/auth/addresses').set(auth(token)).send(body);
      expect(add.status).toBe(400);
      expect(add.body.error).toMatch(/shared/i);
      expect((await request(app).put('/api/auth/addresses/000000000000000000000000').set(auth(token)).send({ city: 'X' })).status).toBe(400);
      expect((await request(app).delete('/api/auth/addresses/000000000000000000000000').set(auth(token))).status).toBe(400);
    }
    const mine = await request(app).post('/api/auth/addresses').set(auth(customer.token)).send(body);
    expect(mine.status).toBe(201);
    expect(mine.body.user.addresses[0].addressLine).toBe('1 Shared Road');
  });
});
