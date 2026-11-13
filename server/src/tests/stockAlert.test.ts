import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { connectDB } from '../config/db.js';
import { Product } from '../models/Product.js';
import { Inventory } from '../models/Inventory.js';
import { StockAlert } from '../models/StockAlert.js';
import { stockAlertService } from '../services/stockAlertService.js';
import { testOutbox } from '../services/emailService.js';

const app = createApp();
const stamp = Date.now();
const DAY = 86_400_000;

describe('Back-in-stock alerts', () => {
  let product: any;
  let archived: any;
  let adminToken = '';
  const skuOut = `FTZ-SA-${stamp}-OUT`;
  const skuIn = `FTZ-SA-${stamp}-IN`;
  const skuArchived = `FTZ-SA-${stamp}-ARC`;
  const manySkus = Array.from({ length: 11 }, (_, i) => `FTZ-SA-${stamp}-M${i}`);
  const emails = new Set<string>();

  const email = (label: string) => {
    const e = `alert-${label}-${stamp}@example.com`;
    emails.add(e);
    return e;
  };
  const ask = (em: string, sku: string) => request(app).post('/api/stock-alerts').send({ email: em, sku });
  const mailsTo = (to: string) => testOutbox.filter((m) => m.to === to && m.subject.startsWith('Back in stock'));
  const restock = (sku: string, qty: number) => Inventory.updateOne({ variantSku: sku }, { $set: { availableStock: qty } });
  const soldOut = (sku: string) => Inventory.updateOne({ variantSku: sku }, { $set: { availableStock: 0 } });

  const makeProduct = async (name: string, variants: { sku: string; stock: number }[], over: Record<string, unknown> = {}) => {
    const p = await Product.create({
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: 'A test style used by the stock alert suite',
      category: 'Boots',
      price: 4000,
      originalPrice: 4500,
      images: ['https://images.unsplash.com/photo-1614252235316-8c857d38b5f4'],
      colors: [{ name: 'Tan', hex: '#8C4E28', imageIndex: 0 }],
      sizes: ['UK 8'],
      variants: variants.map((v, i) => ({ sku: v.sku, size: 'UK 8', color: `Color ${i}`, colorHex: '#8C4E28', stock: v.stock })),
      ...over,
    });
    for (const v of variants) {
      await Inventory.create({ variantSku: v.sku, product: p._id, size: 'UK 8', color: 'Tan', availableStock: v.stock, reservedStock: 0 });
    }
    return p;
  };

  beforeAll(async () => {
    await connectDB();
    product = await makeProduct(`Alert Test Boot ${stamp}`, [{ sku: skuOut, stock: 0 }, { sku: skuIn, stock: 5 }]);
    archived = await makeProduct(`Alert Archived Boot ${stamp}`, [{ sku: skuArchived, stock: 0 }], { isActive: false });
    await makeProduct(`Alert Many Boot ${stamp}`, manySkus.map((sku) => ({ sku, stock: 0 })));
    adminToken = (await request(app).post('/api/auth/login').send({ email: 'admin@footzi.in', password: 'Footzi@2026' })).body.token;
  });

  afterAll(async () => {
    await StockAlert.deleteMany({ email: { $in: [...emails] } });
    await Inventory.deleteMany({ variantSku: { $in: [skuOut, skuIn, skuArchived, ...manySkus] } });
    await Product.deleteMany({ name: new RegExp(`^Alert .* ${stamp}$`) });
    await mongoose.connection.close();
  });

  describe('asking to be told', () => {
    it('records a request for a sold-out size, and asking again changes nothing', async () => {
      const em = email('basic');
      const first = await ask(em, skuOut);
      expect(first.status).toBe(200);
      expect(first.body.message).toMatch(/email you once/i);
      expect((await ask(em, skuOut.toLowerCase())).status).toBe(200);

      expect(await StockAlert.countDocuments({ email: em })).toBe(1);
      const record = await StockAlert.findOne({ email: em }).lean();
      expect(record).toMatchObject({ sku: skuOut, productName: `Alert Test Boot ${stamp}`, size: 'UK 8' });
      expect(record!.notifiedAt).toBeUndefined();
      // Kept for about six months while it waits
      expect(record!.expiresAt.getTime() - Date.now()).toBeGreaterThan(170 * DAY);
    });

    it('refuses a size that is in stock, an unknown one, an archived style, and bad input', async () => {
      const inStock = await ask(email('in'), skuIn);
      expect(inStock.status).toBe(409);
      expect(inStock.body.error).toMatch(/in stock right now/i);

      expect((await ask(email('unknown'), 'FTZ-NOPE-0000')).status).toBe(404);
      expect((await ask(email('arc'), skuArchived)).status).toBe(404);
      expect((await ask('not-an-email', skuOut)).status).toBe(400);
      expect((await ask(email('badsku'), 'x')).status).toBe(400);
      expect((await request(app).post('/api/stock-alerts').send({})).status).toBe(400);
      expect(await StockAlert.countDocuments({ email: { $in: [email('in'), email('unknown'), email('arc')] } })).toBe(0);
    });

    it('caps how many sizes one address can wait on, so the form cannot flood an inbox', async () => {
      const em = email('cap');
      for (let i = 0; i < 10; i++) expect((await ask(em, manySkus[i])).status).toBe(200);

      const eleventh = await ask(em, manySkus[10]);
      expect(eleventh.status).toBe(429);
      // Repeating one of the ten is still fine
      expect((await ask(em, manySkus[0])).status).toBe(200);
    });
  });

  describe('telling them', () => {
    it('sends nothing while the size is still sold out', async () => {
      const em = email('still');
      await soldOut(skuOut);
      await ask(em, skuOut);
      await stockAlertService.sweep();
      expect(mailsTo(em)).toHaveLength(0);
      expect((await StockAlert.findOne({ email: em }))!.notifiedAt).toBeUndefined();
    });

    it('emails everyone waiting, once, when the size returns, with a link to the style', async () => {
      const a = email('wait-a');
      const b = email('wait-b');
      await soldOut(skuOut);
      await ask(a, skuOut);
      await ask(b, skuOut);

      await restock(skuOut, 3);
      const sent = await stockAlertService.sweep();
      expect(sent).toBeGreaterThanOrEqual(2);

      for (const em of [a, b]) {
        const mails = mailsTo(em);
        expect(mails).toHaveLength(1);
        expect(mails[0].subject).toBe(`Back in stock: Alert Test Boot ${stamp} in UK 8`);
        expect(mails[0].text).toContain(`/product/alert-test-boot-${stamp}`);
        expect(mails[0].text).toMatch(/one-time message/i);
      }

      // Sent requests are marked and scheduled for deletion within about a month
      const record = await StockAlert.findOne({ email: a }).lean();
      expect(record!.notifiedAt).toBeDefined();
      expect(record!.expiresAt.getTime() - Date.now()).toBeLessThan(31 * DAY);

      // A second sweep finds nobody new
      await stockAlertService.sweep();
      expect(mailsTo(a)).toHaveLength(1);
    });

    it('never emails anyone twice even when two sweeps run at the same moment', async () => {
      const em = email('race');
      await soldOut(skuOut);
      await ask(em, skuOut);
      await restock(skuOut, 2);

      await Promise.all([stockAlertService.sweep(), stockAlertService.sweep(), stockAlertService.sweep()]);
      expect(mailsTo(em)).toHaveLength(1);
    });

    it('lets someone ask again after the size sells out once more', async () => {
      const em = email('again');
      await soldOut(skuOut);
      await ask(em, skuOut);
      await restock(skuOut, 1);
      await stockAlertService.sweep();
      expect(mailsTo(em)).toHaveLength(1);

      await soldOut(skuOut);
      expect((await ask(em, skuOut)).status).toBe(200);
      expect((await StockAlert.findOne({ email: em }))!.notifiedAt).toBeUndefined();
      await restock(skuOut, 1);
      await stockAlertService.sweep();
      expect(mailsTo(em)).toHaveLength(2);
    });

    it('an admin adding stock tells people straight away', async () => {
      const em = email('admin');
      await soldOut(skuOut);
      await ask(em, skuOut);

      const res = await request(app).patch(`/api/admin/inventory/${skuOut}`).set('Authorization', `Bearer ${adminToken}`).send({ availableStock: 4 });
      expect(res.status).toBe(200);
      for (let i = 0; i < 20 && mailsTo(em).length === 0; i++) await new Promise((r) => setTimeout(r, 50));
      expect(mailsTo(em)).toHaveLength(1);
    });
  });
});
