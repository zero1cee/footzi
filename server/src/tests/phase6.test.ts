import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';

const app = createApp();
const stamp = Date.now();
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('Phase 6 - wishlist and search suggestions', () => {
  const ids: string[] = [];
  let active: any[] = [];
  let archived: any;

  const register = async (label: string) => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: `Phase Six ${label}`, email: `phase6-${label}-${stamp}@example.com`, password: 'Password@123' });
    expect(res.status).toBe(201);
    return { token: res.body.token as string, id: res.body.user._id as string };
  };

  const makeProduct = async (name: string, over: Record<string, unknown> = {}) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const p = await Product.create({
      name,
      slug,
      description: 'A test style used by the phase six suite',
      category: 'Loafers',
      price: 3000,
      originalPrice: 3500,
      images: ['https://images.unsplash.com/photo-1614252235316-8c857d38b5f4'],
      colors: [{ name: 'Tan', hex: '#8C4E28', imageIndex: 0 }],
      sizes: ['UK 8'],
      variants: [{ sku: `P6-${stamp}-${slug.slice(-6)}`, size: 'UK 8', color: 'Tan', colorHex: '#8C4E28', stock: 5 }],
      ...over,
    });
    ids.push(p.id);
    return p;
  };

  beforeAll(async () => {
    await connectDB();
    active = [
      await makeProduct(`Zephyr Sovereign Loafer ${stamp}`),
      await makeProduct(`Quartz Chelsea Boot ${stamp}`, { category: 'Boots', rating: 5 }),
      await makeProduct(`Marble Zephyr Sneaker ${stamp}`, { category: 'Sneakers' }),
    ];
    archived = await makeProduct(`Zephyr Archived Derby ${stamp}`, { isActive: false });
  });

  afterAll(async () => {
    await Product.deleteMany({ _id: { $in: ids } });
    await User.deleteMany({ email: new RegExp(`^phase6-.*-${stamp}@example\\.com$`) });
    await mongoose.connection.close();
  });

  describe('wishlist', () => {
    it('needs a signed-in customer', async () => {
      expect((await request(app).get('/api/wishlist')).status).toBe(401);
      expect((await request(app).put(`/api/wishlist/${active[0].id}`)).status).toBe(401);
    });

    it('adds a style once however many times it is added, and removes it', async () => {
      const user = await register('basic');
      const add = () => request(app).put(`/api/wishlist/${active[0].id}`).set(auth(user.token));

      expect((await add()).body.productIds).toEqual([active[0].id]);
      expect((await add()).body.productIds).toEqual([active[0].id]);
      expect((await request(app).put(`/api/wishlist/${active[1].id}`).set(auth(user.token))).body.productIds).toHaveLength(2);

      const removed = await request(app).delete(`/api/wishlist/${active[0].id}`).set(auth(user.token));
      expect(removed.body.productIds).toEqual([active[1].id]);
      // Removing something that is not there changes nothing and is not an error
      expect((await request(app).delete(`/api/wishlist/${active[0].id}`).set(auth(user.token))).body.productIds).toEqual([active[1].id]);
      expect((await request(app).delete('/api/wishlist/not-an-id').set(auth(user.token))).status).toBe(200);
      expect((await request(app).get('/api/wishlist').set(auth(user.token))).body.productIds).toEqual([active[1].id]);
    });

    it('refuses archived or unknown styles', async () => {
      const user = await register('invalid');
      const archivedTry = await request(app).put(`/api/wishlist/${archived.id}`).set(auth(user.token));
      expect(archivedTry.status).toBe(400);
      expect((await request(app).put(`/api/wishlist/${new mongoose.Types.ObjectId()}`).set(auth(user.token))).status).toBe(400);
      expect((await request(app).put('/api/wishlist/nonsense').set(auth(user.token))).status).toBe(400);
      expect((await request(app).get('/api/wishlist').set(auth(user.token))).body.productIds).toEqual([]);
    });

    it("keeps each customer's list separate", async () => {
      const a = await register('ownera');
      const b = await register('ownerb');
      await request(app).put(`/api/wishlist/${active[0].id}`).set(auth(a.token));
      expect((await request(app).get('/api/wishlist').set(auth(b.token))).body.productIds).toEqual([]);
    });

    it('merges a guest list into the account as a union, dropping anything invalid, and is safe to repeat', async () => {
      const user = await register('merge');
      await request(app).put(`/api/wishlist/${active[0].id}`).set(auth(user.token));

      const body = { productIds: [active[0].id, active[2].id, archived.id, 'mock-product-3', String(new mongoose.Types.ObjectId()), active[2].id, 42] };
      const first = await request(app).post('/api/wishlist/merge').set(auth(user.token)).send(body);
      expect(first.status).toBe(200);
      expect([...first.body.productIds].sort()).toEqual([active[0].id, active[2].id].sort());

      const again = await request(app).post('/api/wishlist/merge').set(auth(user.token)).send(body);
      expect(again.body.productIds).toHaveLength(2);

      expect((await request(app).post('/api/wishlist/merge').set(auth(user.token)).send({})).status).toBe(400);
      expect((await request(app).post('/api/wishlist/merge').set(auth(user.token)).send({ productIds: 'x' })).status).toBe(400);
    });

    it('stops at 100 styles', async () => {
      const user = await register('cap');
      const many = [];
      for (let i = 0; i < 102; i++) many.push(await makeProduct(`Bulk Style ${i} ${stamp}`));
      const res = await request(app).post('/api/wishlist/merge').set(auth(user.token)).send({ productIds: many.map((p) => p.id).slice(0, 100) });
      expect(res.body.productIds).toHaveLength(100);

      const extra = await request(app).put(`/api/wishlist/${many[101].id}`).set(auth(user.token));
      expect(extra.status).toBe(200);
      expect(extra.body.productIds).toHaveLength(100);
      expect(extra.body.productIds).not.toContain(many[101].id);
    });
  });

  describe('search suggestions', () => {
    const suggest = (q: string | object) => request(app).get('/api/products/suggest').query({ q } as any);

    it('matches the start of any word in the name, best rated first, and returns only what a suggestion needs', async () => {
      const res = await suggest('zeph');
      expect(res.status).toBe(200);
      const names = res.body.suggestions.map((s: any) => s.name);
      // "Zephyr Sovereign Loafer" (name starts with it) and "Marble Zephyr Sneaker" (second word)
      expect(names).toEqual(expect.arrayContaining([`Zephyr Sovereign Loafer ${stamp}`, `Marble Zephyr Sneaker ${stamp}`]));
      expect(names).not.toContain(`Zephyr Archived Derby ${stamp}`); // archived styles never appear
      expect(Object.keys(res.body.suggestions[0]).sort()).toEqual(['category', 'id', 'image', 'name', 'price', 'slug']);
      expect(res.headers['cache-control']).toMatch(/max-age=60/);
    });

    it('also matches a category, and ignores case', async () => {
      const res = await suggest('BOOT');
      expect(res.body.suggestions.map((s: any) => s.name)).toContain(`Quartz Chelsea Boot ${stamp}`);
    });

    it('answers nothing for short or empty queries and never fails on odd characters', async () => {
      expect((await suggest('z')).body.suggestions).toEqual([]);
      expect((await suggest('')).body.suggestions).toEqual([]);
      for (const nasty of ['(', '.*', '[a-', '\\', 'zeph(yr', `zeph${'y'.repeat(200)}`]) {
        const res = await suggest(nasty);
        expect([nasty.slice(0, 6), res.status]).toEqual([nasty.slice(0, 6), 200]);
      }
    });

    it('does not let a query operator through', async () => {
      const res = await request(app).get('/api/products/suggest?q[$ne]=x');
      expect(res.status).toBe(200);
      expect(res.body.suggestions).toEqual([]);
    });

    it('returns at most six', async () => {
      const res = await suggest('bulk');
      expect(res.body.suggestions.length).toBeLessThanOrEqual(6);
      expect(res.body.suggestions.length).toBeGreaterThan(0);
    });

    it('is not mistaken for a product slug', async () => {
      expect((await request(app).get('/api/products/suggest?q=zephyr')).body).toHaveProperty('suggestions');
    });
  });
});
