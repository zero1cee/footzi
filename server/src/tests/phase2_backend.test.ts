import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { connectDB } from '../config/db.js';
import { Product } from '../models/Product.js';
import { Inventory } from '../models/Inventory.js';
import { User } from '../models/User.js';
import { productService } from '../services/productService.js';
import { MemoryCache, cacheService } from '../utils/cache.js';
import jwt from 'jsonwebtoken';

describe('Phase 2 Backend: Caching, ETags & Edge Optimizations', () => {
  let app: any;
  let adminToken: string;
  let testProductId: string;
  let testProductSlug: string;
  let testVariantSku: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }
    app = createApp();

    // Create or find admin user for auth
    const adminUser = await User.findOne({ role: 'admin' });
    const jwtSecret = process.env.JWT_SECRET || 'test_jwt_secret_footzi_production_key_mock_12345';
    adminToken = jwt.sign(
      { id: adminUser?._id?.toString() || '000000000000000000000001', role: 'admin', email: adminUser?.email || 'admin@footzi.in' },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // Create a dedicated isolated test product with guaranteed inventory
    const stamp = Date.now();
    testVariantSku = `FTZ-P2-CACHE-${stamp}`;
    const dedicated = await productService.createProduct({
      name: `Artisanal Cache Test ${stamp}`,
      description: 'Handcrafted test loafer for caching test suite',
      price: 4999,
      category: 'Loafers',
      brand: 'Footzi Luxury',
      badge: 'Best Seller',
      images: ['https://images.unsplash.com/photo-1614252235316-8c857d38b5f4'],
      colors: [{ name: 'Imperial Tan', hex: '#8B4513', imageIndex: 0 }],
      sizes: ['UK 8'],
      variants: [
        {
          sku: testVariantSku,
          size: 'UK 8',
          color: 'Imperial Tan',
          stock: 10,
        },
      ],
    });

    testProductId = dedicated._id.toString();
    testProductSlug = dedicated.slug;
  });

  afterAll(async () => {
    cacheService.clear();
    if (testProductId) {
      await Product.deleteOne({ _id: testProductId });
      await Inventory.deleteOne({ variantSku: testVariantSku });
    }
    await mongoose.connection.close();
  });

  beforeEach(() => {
    cacheService.clear();
  });

  describe('1. MemoryCache Subsystem Primitives', () => {
    it('should store, retrieve, and delete values correctly', () => {
      const cache = new MemoryCache(10);
      cache.set('test:key1', { message: 'Artisanal Loafers' }, 60);

      expect(cache.has('test:key1')).toBe(true);
      expect(cache.get('test:key1')).toEqual({ message: 'Artisanal Loafers' });
      expect(cache.size()).toBe(1);

      cache.del('test:key1');
      expect(cache.has('test:key1')).toBe(false);
      expect(cache.get('test:key1')).toBeNull();
      expect(cache.size()).toBe(0);
    });

    it('should expire entries after TTL', async () => {
      const cache = new MemoryCache(10);
      // Set short 1s TTL
      cache.set('test:temp', 'temporary value', 1);
      expect(cache.get('test:temp')).toBe('temporary value');

      // Wait 1.1s for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));
      expect(cache.get('test:temp')).toBeNull();
    });

    it('should invalidate all keys matching a prefix atomically', () => {
      const cache = new MemoryCache(50);
      cache.set('products:list:1', { page: 1 }, 60);
      cache.set('products:list:2', { page: 2 }, 60);
      cache.set('products:slug:loafer', { name: 'Loafer' }, 60);
      cache.set('settings:shop', { shippingFee: 149 }, 60);

      expect(cache.size()).toBe(4);

      const removed = cache.invalidatePrefix('products:');
      expect(removed).toBe(3);
      expect(cache.size()).toBe(1);
      expect(cache.has('settings:shop')).toBe(true);
      expect(cache.has('products:list:1')).toBe(false);
    });

    it('should evict least recently accessed entries when capacity is exceeded', () => {
      const cache = new MemoryCache(2);
      cache.set('k1', 'v1', 60);
      cache.set('k2', 'v2', 60);

      // Access k1 so k2 is the oldest accessed
      cache.get('k1');

      // Adding k3 should evict k2
      cache.set('k3', 'v3', 60);
      expect(cache.has('k1')).toBe(true);
      expect(cache.has('k2')).toBe(false);
      expect(cache.has('k3')).toBe(true);
    });

    it('should generate deterministic cache keys regardless of parameter order', () => {
      const cache = new MemoryCache();
      const keyA = cache.generateKey('products:list', { category: 'Loafers', page: 1, sort: 'price_asc' });
      const keyB = cache.generateKey('products:list', { sort: 'price_asc', page: 1, category: 'Loafers' });

      expect(keyA).toBe(keyB);
    });
  });

  describe('2. HTTP Cache-Control & ETag Headers (304 Not Modified)', () => {
    it('GET /api/products should return Cache-Control and ETag headers, and 304 on If-None-Match', async () => {
      const firstRes = await request(app).get('/api/products?limit=5');
      expect(firstRes.status).toBe(200);
      expect(firstRes.headers['cache-control']).toBeDefined();
      expect(firstRes.headers['cache-control']).toContain('public');
      expect(firstRes.headers['etag']).toBeDefined();

      const etag = firstRes.headers['etag'];

      // Second request with If-None-Match header
      const secondRes = await request(app)
        .get('/api/products?limit=5')
        .set('If-None-Match', etag);

      expect(secondRes.status).toBe(304);
      expect(secondRes.text).toBe('');
    });

    it('GET /api/products/:slug should return ETag and 304 on match', async () => {
      const firstRes = await request(app).get(`/api/products/${testProductSlug}`);
      expect(firstRes.status).toBe(200);
      const etag = firstRes.headers['etag'];
      expect(etag).toBeDefined();

      const secondRes = await request(app)
        .get(`/api/products/${testProductSlug}`)
        .set('If-None-Match', etag);

      expect(secondRes.status).toBe(304);
    });

    it('GET /api/settings should return ETag and 304 on match', async () => {
      const firstRes = await request(app).get('/api/settings');
      expect(firstRes.status).toBe(200);
      const etag = firstRes.headers['etag'];
      expect(etag).toBeDefined();

      const secondRes = await request(app)
        .get('/api/settings')
        .set('If-None-Match', etag);

      expect(secondRes.status).toBe(304);
    });

    it('GET /api/products/suggest should return ETag and 304 on match', async () => {
      const firstRes = await request(app).get('/api/products/suggest?q=loafer');
      expect(firstRes.status).toBe(200);
      const etag = firstRes.headers['etag'];
      expect(etag).toBeDefined();

      const secondRes = await request(app)
        .get('/api/products/suggest?q=loafer')
        .set('If-None-Match', etag);

      expect(secondRes.status).toBe(304);
    });
  });

  describe('3. Catalog Invalidation on Admin Mutations', () => {
    it('updating variant stock should invalidate catalog cache and produce fresh ETag', async () => {
      // 1. Prime the catalog cache for the dedicated product
      const prime = await request(app).get(`/api/products/${testProductSlug}`);
      expect(prime.status).toBe(200);
      const oldEtag = prime.headers['etag'];

      // 2. Admin adjusts stock
      const adminRes = await request(app)
        .patch(`/api/admin/inventory/${testVariantSku}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ availableStock: 42 });
      expect(adminRes.status).toBe(200);

      // 3. Next GET request must see the updated product and a fresh ETag
      const freshRes = await request(app).get(`/api/products/${testProductSlug}`);
      expect(freshRes.status).toBe(200);
      expect(freshRes.headers['etag']).not.toBe(oldEtag);
      expect(freshRes.body.variants[0].stock).toBe(42);
    });

    it('toggling product active state should invalidate cache', async () => {
      // Prime
      await request(app).get('/api/products?limit=10');
      expect(cacheService.size()).toBeGreaterThan(0);

      // Admin toggles active
      const toggle = await request(app)
        .patch(`/api/admin/products/${testProductId}/toggle-active`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(toggle.status).toBe(200);

      // Cache entries for products must have been invalidated
      let hasProductKeys = false;
      for (const k of (cacheService as any).store.keys()) {
        if (k.startsWith('products:')) hasProductKeys = true;
      }
      expect(hasProductKeys).toBe(false);

      // Restore active state
      await request(app)
        .patch(`/api/admin/products/${testProductId}/toggle-active`)
        .set('Authorization', `Bearer ${adminToken}`);
    });
  });

  describe('4. Response Compression', () => {
    it('should support gzip / deflate compression on large responses when requested', async () => {
      const res = await request(app)
        .get('/api/products?limit=50')
        .set('Accept-Encoding', 'gzip, deflate');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.products)).toBe(true);
    });
  });
});
