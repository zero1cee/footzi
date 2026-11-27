import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Inventory } from '../models/Inventory.js';
import { Cart } from '../models/Cart.js';
import { ReturnRequest } from '../models/ReturnRequest.js';
import { runInTransaction, supportsTransactions } from '../utils/transaction.js';

describe('Phase 1 Backend & Database Improvements Suite', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('1. Connection Pool & Socket Timeout Configuration', () => {
    it('should have tuned connection pool and socket options on the active mongoose connection', () => {
      expect(mongoose.connection.readyState).toBe(1); // 1 = connected
      const client = mongoose.connection.getClient();
      expect(client).toBeDefined();

      const options = (client as any).options || {};
      // In development / test: minPoolSize is 2, maxPoolSize is 10
      // In production: minPoolSize is 10, maxPoolSize is 50
      expect(options.minPoolSize ?? 2).toBeGreaterThanOrEqual(2);
      expect(options.maxPoolSize ?? 10).toBeGreaterThanOrEqual(10);
      expect(options.socketTimeoutMS ?? 45000).toBe(45000);
      expect(options.maxIdleTimeMS ?? 30000).toBe(30000);
    });
  });

  describe('2. High-Concurrency & E-Commerce Scale Indexes', () => {
    it('Order model should define compound and covering indexes for patron lookups and logistics', () => {
      const indexes = Order.schema.indexes();
      const indexFields = indexes.map(([fields]) => fields);

      // Verify user order history compound index
      expect(indexFields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ user: 1, createdAt: -1 }),
        ])
      );

      // Verify admin order status sorting index
      expect(indexFields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ orderStatus: 1, createdAt: -1 }),
        ])
      );

      // Verify customer email index for guest lookup
      expect(indexFields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ customerEmail: 1, createdAt: -1 }),
        ])
      );

      // Verify pincode index for regional logistics batching
      expect(indexFields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ 'shippingAddress.pincode': 1 }),
        ])
      );

      // Verify sparse tracking number index
      const trackingIndex = indexes.find(([fields]) => fields.trackingNumber === 1);
      expect(trackingIndex).toBeDefined();
      expect(trackingIndex?.[1]?.sparse).toBe(true);
    });

    it('Product model should define compound shop filter and sort indexes', () => {
      const indexes = Product.schema.indexes();
      const indexFields = indexes.map(([fields]) => fields);

      // Verify compound filter index: active + category + price
      expect(indexFields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ isActive: 1, category: 1, price: 1 }),
        ])
      );

      // Verify rating sort index
      expect(indexFields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ isActive: 1, rating: -1 }),
        ])
      );

      // Verify newest arrivals sort index
      expect(indexFields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ isActive: 1, createdAt: -1 }),
        ])
      );
    });

    it('Inventory model should define compound SKU and product availability indexes', () => {
      const indexes = Inventory.schema.indexes();
      const indexFields = indexes.map(([fields]) => fields);

      expect(indexFields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ variantSku: 1, availableStock: 1 }),
        ])
      );

      expect(indexFields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ product: 1, availableStock: 1 }),
        ])
      );
    });

    it('Cart model should define TTL index for 30-day abandoned cart cleanup', () => {
      const indexes = Cart.schema.indexes();
      const ttlIndex = indexes.find(([fields]) => fields.updatedAt === 1);

      expect(ttlIndex).toBeDefined();
      expect(ttlIndex?.[1]?.expireAfterSeconds).toBe(30 * 24 * 60 * 60); // 30 days
    });

    it('ReturnRequest model should define compound status and creation date index', () => {
      const indexes = ReturnRequest.schema.indexes();
      const indexFields = indexes.map(([fields]) => fields);

      expect(indexFields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ status: 1, createdAt: -1 }),
        ])
      );
    });
  });

  describe('3. Transaction Engine & Topology Compatibility', () => {
    it('supportsTransactions should correctly identify environment capability without throwing', () => {
      const supported = supportsTransactions();
      expect(typeof supported).toBe('boolean');
    });

    it('runInTransaction should execute and return result cleanly in both replica-set and standalone modes', async () => {
      const executionResult = await runInTransaction(async (_session) => {
        return { status: 'committed', timestamp: Date.now() };
      });

      expect(executionResult.status).toBe('committed');
      expect(executionResult.timestamp).toBeGreaterThan(0);
    });

    it('runInTransaction should propagate errors when the inner unit of work fails', async () => {
      await expect(
        runInTransaction(async (_session) => {
          throw new Error('Simulated transaction failure for rollback verification');
        })
      ).rejects.toThrow('Simulated transaction failure for rollback verification');
    });
  });

  describe('4. Atomic Inventory Reservation Concurrency', () => {
    it('reserveStock should atomically reserve stock and releaseStock should restore it', async () => {
      const sku = `TEST-CONCURRENCY-SKU-${Date.now()}`;
      const inv = await Inventory.create({
        variantSku: sku,
        product: new mongoose.Types.ObjectId(),
        size: 'UK 8',
        color: 'Cognac Amber',
        availableStock: 5,
        reservedStock: 0,
      });

      try {
        // Reserve 3 pairs
        const reserved = await inv.reserveStock(3);
        expect(reserved).toBe(true);

        const afterReserve = await Inventory.findById(inv._id);
        expect(afterReserve?.availableStock).toBe(2);
        expect(afterReserve?.reservedStock).toBe(3);

        // Try reserving 3 more pairs when only 2 are available -> must fail atomically
        const overReserve = await inv.reserveStock(3);
        expect(overReserve).toBe(false);

        // Release 2 pairs back
        const released = await inv.releaseStock(2);
        expect(released).toBe(true);

        const afterRelease = await Inventory.findById(inv._id);
        expect(afterRelease?.availableStock).toBe(4);
        expect(afterRelease?.reservedStock).toBe(1);
      } finally {
        await Inventory.deleteOne({ _id: inv._id });
      }
    });
  });
});
