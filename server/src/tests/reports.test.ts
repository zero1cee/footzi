import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { connectDB } from '../config/db.js';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { csvCell, toCsv } from '../services/reportService.js';

const app = createApp();
const stamp = Date.now();
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const HOUR = 3_600_000;
const DAY = 86_400_000;
const istDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);

describe('Admin reports', () => {
  let adminToken = '';
  let demoToken = '';
  let customerToken = '';
  const ids: mongoose.Types.ObjectId[] = [];
  const code = `RPT${stamp}`;
  const productName = `Report Test Loafer ${stamp}`;
  const productId = new mongoose.Types.ObjectId();
  // A day far in the past that no other test writes to
  const base = new Date(Date.now() - 200 * DAY);
  base.setUTCHours(6, 30, 0, 0); // 12:00 in India
  const dayKey = istDay(base);

  const item = (qty: number, lineTotal: number) => ({
    product: productId, name: productName, sku: `RPT-${stamp}`, size: 'UK 8', color: 'Tan', quantity: qty, unitPrice: lineTotal / qty, discount: 0, lineTotal, image: 'x.jpg',
  });

  const makeOrder = async (n: number, over: Record<string, unknown>, paidAt: Date) => {
    const order = await Order.create({
      orderNumber: `FTZ-RPT-${stamp}-${n}`,
      user: new mongoose.Types.ObjectId(),
      customerName: 'Report Person',
      customerEmail: `rep-${stamp}-a@example.com`,
      customerPhone: '9876543210',
      items: [item(1, 1000)],
      shippingAddress: { name: 'R', phone: '9876543210', addressLine: '1 Road', city: 'Agra', state: 'UP', pincode: '282001' },
      subtotal: 1000, discount: 0, shippingFee: 0, total: 1000,
      paymentStatus: 'paid', orderStatus: 'delivered', refundedAmount: 0,
      ...over,
    } as any);
    await Order.collection.updateOne({ _id: (order as any)._id }, { $set: { createdAt: paidAt, 'paymentDetails.paidAt': paidAt } });
    ids.push((order as any)._id as mongoose.Types.ObjectId);
    return order;
  };

  beforeAll(async () => {
    await connectDB();
    adminToken = (await request(app).post('/api/auth/login').send({ email: 'admin@footzi.in', password: 'Footzi@2026' })).body.token;
    demoToken = (await request(app).post('/api/auth/login').send({ email: 'demo-admin@footzi.in', password: 'Footzi@2026' })).body.token;
    customerToken = (await request(app).post('/api/auth/register').send({ name: 'Report Customer', email: `rep-cust-${stamp}@example.com`, password: 'Password@123' })).body.token;

    // Day D: three settled orders and one unpaid
    await makeOrder(1, { total: 1000, items: [item(2, 900)], couponCode: code, discount: 100 }, base);
    await makeOrder(2, { total: 2000, subtotal: 2000, refundedAmount: 500, items: [item(1, 2000)] }, new Date(base.getTime() + HOUR));
    await makeOrder(3, { total: 1500, subtotal: 1500, refundedAmount: 1500, paymentStatus: 'refunded', orderStatus: 'cancelled', items: [item(1, 1500)] }, new Date(base.getTime() + 2 * HOUR));
    await makeOrder(4, { paymentStatus: 'pending', orderStatus: 'pending_payment', total: 9999, subtotal: 9999 }, new Date(base.getTime() + 3 * HOUR));
    // 18:40 UTC is 00:10 the next morning in India: it belongs to the next day
    const late = new Date(base);
    late.setUTCHours(18, 40, 0, 0);
    await makeOrder(5, { total: 700, subtotal: 700, items: [item(1, 700)], customerEmail: `REP-${stamp}-B@example.com`, customerName: 'Guest Person', isGuest: true, user: undefined }, late);
  });

  afterAll(async () => {
    await Order.deleteMany({ _id: { $in: ids } });
    await User.deleteMany({ email: new RegExp(`^rep-cust-${stamp}@`) });
    await mongoose.connection.close();
  });

  describe('sales report', () => {
    const sales = (days: number | string, token = adminToken) => request(app).get(`/api/admin/reports/sales?days=${days}`).set(auth(token));

    it('is for staff only, and read-only for the demo admin', async () => {
      expect((await request(app).get('/api/admin/reports/sales')).status).toBe(401);
      expect((await sales(30, customerToken)).status).toBe(403);
      expect((await sales(30, demoToken)).status).toBe(200);
    });

    it('returns a full series of days, zero-filled, for the period asked', async () => {
      for (const days of [7, 30, 90, 365]) {
        const res = await sales(days);
        expect(res.body.series).toHaveLength(days);
        expect(res.body.series.at(-1).date).toBe(istDay(new Date()));
      }
      // Anything else falls back to 30 days
      expect((await sales(5)).body.days).toBe(30);
      expect((await sales('abc')).body.days).toBe(30);
    });

    it('counts money kept: payments minus refunds, ignoring unpaid orders, grouped by the shop\'s own day', async () => {
      const day = (await sales(365)).body.series.find((d: any) => d.date === dayKey);
      // 1000 + 2000 + 1500 paid, 500 + 1500 refunded, the 9999 unpaid order ignored
      expect(day).toEqual({ date: dayKey, orders: 3, revenue: 2500, refunded: 2000 });

      const next = istDay(new Date(base.getTime() + DAY));
      expect((await sales(365)).body.series.find((d: any) => d.date === next)).toMatchObject({ orders: 1, revenue: 700 });
    });

    it('works out averages, best sellers and coupon results', async () => {
      const res = await sales(365);
      expect(res.body.totals.averageOrderValue).toBeGreaterThan(0);

      const best = res.body.topProducts.find((p: any) => p.name === productName);
      // Paid (not refunded) orders only: 2 pairs for 900 on order 1, one for 2000 on order 2, one for 700 on the next day
      expect(best).toMatchObject({ units: 4, revenue: 3600 });

      const coupon = res.body.coupons.find((c: any) => c.code === code);
      expect(coupon).toMatchObject({ uses: 1, discountGiven: 100 });
    });

    it('reports how many started orders were paid or abandoned', async () => {
      const f = (await sales(365)).body.funnel;
      expect(f.started).toBeGreaterThanOrEqual(5);
      expect(f.paid).toBeGreaterThanOrEqual(4);
      expect(f.conversionPercent).toBeGreaterThan(0);
      expect(f.conversionPercent).toBeLessThanOrEqual(100);
    });
  });

  describe('overview figures', () => {
    it('Revenue Kept on the dashboard subtracts refunds, in agreement with the sales report', async () => {
      // Other test files create orders at the same time, so compare against the database read at the same moment and retry
      let last: any;
      for (let attempt = 0; attempt < 6; attempt++) {
        const res = await request(app).get('/api/admin/analytics').set(auth(adminToken));
        expect(res.status).toBe(200);
        const paid = await Order.find({ paymentStatus: 'paid' }).select('total refundedAmount').lean();
        const expected = Math.round(paid.reduce((sum, o) => sum + o.total - (o.refundedAmount ?? 0), 0));
        const refunded = Math.round(paid.reduce((sum, o) => sum + (o.refundedAmount ?? 0), 0));
        last = { got: [res.body.metrics.totalRevenue, res.body.metrics.refundedFromPaid, res.body.metrics.totalPaidOrders], want: [expected, refunded, paid.length] };
        if (JSON.stringify(last.got) === JSON.stringify(last.want)) break;
      }
      expect(last.got).toEqual(last.want);
      // The partly refunded fixture order (2000 paid, 500 back) is in the paid group and counts as 1500
      expect(last.got[1]).toBeGreaterThanOrEqual(500);
    });
  });

  describe('customers', () => {
    const customers = (query = '', token = adminToken) => request(app).get(`/api/admin/customers${query}`).set(auth(token));

    it('groups orders by email whatever the letter case, with money kept, and flags guests', async () => {
      const res = await customers(`?search=rep-${stamp}`);
      expect(res.status).toBe(200);
      const member = res.body.customers.find((c: any) => c.email === `rep-${stamp}-a@example.com`);
      const guest = res.body.customers.find((c: any) => c.email === `rep-${stamp}-b@example.com`);

      expect(member).toMatchObject({ orders: 3, spent: 2500, hasAccount: true, customerName: 'Report Person' });
      expect(guest).toMatchObject({ orders: 1, spent: 700, hasAccount: false, customerName: 'Guest Person' });
      expect(res.body.accounts).toBeGreaterThanOrEqual(1);
    });

    it('searches by name, sorts, and pages', async () => {
      expect((await customers('?search=Guest%20Person')).body.customers.map((c: any) => c.customerName)).toContain('Guest Person');
      expect((await customers('?search=no-such-person-xyz')).body.total).toBe(0);

      const bySpend = (await customers(`?search=rep-${stamp}&sort=spent`)).body.customers.map((c: any) => c.spent);
      expect(bySpend).toEqual([...bySpend].sort((a: number, b: number) => b - a));

      const page1 = await customers(`?search=rep-${stamp}&limit=1&page=1`);
      const page2 = await customers(`?search=rep-${stamp}&limit=1&page=2`);
      expect(page1.body.totalPages).toBe(2);
      expect(page1.body.customers[0].email).not.toBe(page2.body.customers[0].email);
    });

    it('handles odd characters in the search without failing', async () => {
      for (const q of ['(', '.*', '[a-', '\\', 'a'.repeat(300)]) {
        expect((await customers(`?search=${encodeURIComponent(q)}`)).status).toBe(200);
      }
    });

    it('hides every customer\'s name and contact details from the demo admin', async () => {
      const res = await customers(`?search=rep-${stamp}`, demoToken);
      expect(res.status).toBe(200);
      const raw = JSON.stringify(res.body);
      expect(raw).not.toContain(`rep-${stamp}-a@example.com`);
      expect(raw).not.toContain('Report Person');
      expect(raw).not.toContain('Guest Person');
      expect(raw).not.toContain('9876543210');
      expect(res.body.customers[0].orders).toBeGreaterThan(0); // the numbers stay
    });

    it('is for staff only', async () => {
      expect((await request(app).get('/api/admin/customers')).status).toBe(401);
      expect((await customers('', customerToken)).status).toBe(403);
    });
  });

  describe('spreadsheet exports', () => {
    it('downloads orders as a CSV with a header and the right money', async () => {
      const from = istDay(new Date(base.getTime() - DAY));
      const to = istDay(new Date(base.getTime() + 2 * DAY));
      const res = await request(app).get(`/api/admin/export/orders.csv?from=${from}&to=${to}`).set(auth(adminToken));

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="footzi-orders-\d{4}-\d{2}-\d{2}\.csv"/);
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.text.charCodeAt(0)).toBe(0xfeff);
      const lines = res.text.slice(1).split('\r\n');
      expect(lines[0]).toBe('Order,Placed,Customer,Email,Phone,Guest,Order status,Payment,Items,Subtotal,Discount,Coupon,Shipping,Total,Refunded,City,State,Pincode,Tracking');
      const row = lines.find((l) => l.startsWith(`FTZ-RPT-${stamp}-2,`))!;
      expect(row).toContain(',paid,');
      expect(row).toContain(`1 x ${productName} (UK 8, Tan)`);
      expect(row).toContain(',2000,0,,0,2000,500,');
      expect(lines.some((l) => l.startsWith(`FTZ-RPT-${stamp}-5,`) && l.includes(',yes,'))).toBe(true);
    });

    it('rejects a bad or enormous date range', async () => {
      const bad = await request(app).get('/api/admin/export/orders.csv?from=not-a-date').set(auth(adminToken));
      expect(bad.status).toBe(400);
      const huge = await request(app).get('/api/admin/export/orders.csv?from=2020-01-01&to=2026-01-01').set(auth(adminToken));
      expect(huge.status).toBe(400);
      expect(huge.body.error).toMatch(/a year or less/i);
    });

    it('exports customers, and refuses both files to the demo admin and to customers', async () => {
      const res = await request(app).get('/api/admin/export/customers.csv').set(auth(adminToken));
      expect(res.status).toBe(200);
      expect(res.text).toContain(`rep-${stamp}-a@example.com`);
      expect(res.text.split('\r\n')[0]).toBe('﻿Name,Email,Phone,Has account,Orders,Total spent,First order,Last order');

      for (const path of ['/api/admin/export/orders.csv', '/api/admin/export/customers.csv']) {
        expect((await request(app).get(path).set(auth(demoToken))).status).toBe(403);
        expect((await request(app).get(path).set(auth(customerToken))).status).toBe(403);
        expect((await request(app).get(path)).status).toBe(401);
      }
    });
  });

  describe('spreadsheet cells', () => {
    it('defuses formulas that a customer could plant in their own name', () => {
      expect(csvCell('=HYPERLINK("http://evil.example","x")')).toBe('"\'=HYPERLINK(""http://evil.example"",""x"")"');
      expect(csvCell('+91 98765 43210')).toBe("'+91 98765 43210");
      expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
      expect(csvCell('-2+3')).toBe("'-2+3");
    });

    it('quotes commas, quotes and line breaks, and writes dates and blanks cleanly', () => {
      expect(csvCell('Rao, Asha')).toBe('"Rao, Asha"');
      expect(csvCell('say "hi"')).toBe('"say ""hi"""');
      expect(csvCell('two\nlines')).toBe('"two\nlines"');
      expect(csvCell(null)).toBe('');
      expect(csvCell(undefined)).toBe('');
      expect(csvCell(0)).toBe('0');
      expect(csvCell(new Date('2026-11-01T10:00:00.000Z'))).toBe('2026-11-01T10:00:00.000Z');
      expect(toCsv(['a', 'b'], [[1, 'x,y']])).toBe('a,b\r\n1,"x,y"\r\n');
    });
  });
});
