import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { ReturnRequest } from '../models/ReturnRequest.js';
import { Inventory } from '../models/Inventory.js';

const app = createApp();

describe('Returns, Exchanges & Admin Operations Suite', () => {
  let patronToken = '';
  let adminToken = '';
  let testOrder: any = null;
  let testReturnId = '';
  let testCreatedProductId = '';
  const testVariantSku = 'FTZ-TEST-LOAFER-UK8';

  beforeAll(async () => {
    await connectDB();

    // Authenticate test patron
    const patronRes = await request(app).post('/api/auth/login').send({
      email: 'patron@footzi.in',
      password: 'Footzi@2026',
    });
    patronToken = patronRes.body.token;

    // Authenticate test admin
    const adminRes = await request(app).post('/api/auth/login').send({
      email: 'admin@footzi.in',
      password: 'Footzi@2026',
    });
    adminToken = adminRes.body.token;

    const patronUser = await User.findOne({ email: 'patron@footzi.in' });

    // Create a fulfilled test order for return/exchange testing
    const sampleProduct = await Product.findOne({ isActive: true });
    testOrder = await Order.create({
      orderNumber: `FTZ-AGR-TEST-${Date.now().toString().slice(-4)}`,
      user: patronUser!._id,
      customerName: 'Arjun Kapoor',
      customerEmail: 'patron@footzi.in',
      customerPhone: '+91 98765 43210',
      items: [
        {
          product: sampleProduct?._id || new mongoose.Types.ObjectId(),
          name: sampleProduct?.name || 'Agra Belgravia Loafer',
          sku: 'FTZ-BLG-TAN-UK8',
          size: 'UK 8',
          color: 'Vintage Tan',
          quantity: 1,
          unitPrice: 3899,
          discount: 0,
          lineTotal: 3899,
          image: sampleProduct?.images[0] || 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4',
        },
      ],
      shippingAddress: {
        name: 'Arjun Kapoor',
        phone: '+91 98765 43210',
        addressLine: '42 Heritage Enclave',
        city: 'Agra',
        state: 'Uttar Pradesh',
        pincode: '282001',
      },
      subtotal: 3899,
      discount: 0,
      shippingFee: 0,
      total: 3899,
      paymentStatus: 'paid',
      orderStatus: 'delivered',
      trackingNumber: 'BD-AGR-99887766IN',
    });
  });

  afterAll(async () => {
    if (testOrder?._id) {
      await Order.deleteOne({ _id: testOrder._id });
    }
    if (testReturnId) {
      await ReturnRequest.deleteOne({ _id: testReturnId });
    }
    if (testCreatedProductId) {
      await Product.deleteOne({ _id: testCreatedProductId });
      await Inventory.deleteMany({ variantSku: testVariantSku });
    }
    await mongoose.connection.close();
  });

  it('POST /api/returns - should register a footwear size exchange request', async () => {
    const res = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${patronToken}`)
      .send({
        orderId: testOrder._id.toString(),
        type: 'exchange',
        customerComments: 'Toe box slightly snug, requesting UK 9 for optimal comfort',
        items: [
          {
            sku: 'FTZ-BLG-TAN-UK8',
            productName: testOrder.items[0].name,
            size: 'UK 8',
            color: 'Vintage Tan',
            quantity: 1,
            price: 3899,
            reason: 'Fit issue - too tight',
            replacementSize: 'UK 9',
            replacementColor: 'Vintage Tan',
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.returnRequest).toBeDefined();
    expect(res.body.returnRequest.returnNumber).toMatch(/^RET-AGR-/);
    expect(res.body.returnRequest.type).toBe('exchange');
    expect(res.body.returnRequest.status).toBe('requested');
    expect(res.body.returnRequest.pickupTrackingNumber).toMatch(/^BD-REV-/);

    testReturnId = res.body.returnRequest._id;
  });

  it('GET /api/returns/my-returns - patron should view all their returns & exchanges', async () => {
    const res = await request(app)
      .get('/api/returns/my-returns')
      .set('Authorization', `Bearer ${patronToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]._id).toBe(testReturnId);
    expect(res.body[0].order).toBeDefined();
  });

  it('GET /api/admin/returns - admin should retrieve all active returns with customer data', async () => {
    const res = await request(app)
      .get('/api/admin/returns')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find((r: any) => r._id === testReturnId);
    expect(found).toBeDefined();
    expect(found.user.email).toBe('patron@footzi.in');
  });

  it('PATCH /api/admin/returns/:id - admin should approve and dispatch replacement', async () => {
    // 1. Approve return
    const approveRes = await request(app)
      .patch(`/api/admin/returns/${testReturnId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'approved',
        adminNotes: 'Size exchange approved. Scheduled reverse pickup at customer residence.',
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.returnRequest.status).toBe('approved');

    // 2. Dispatch replacement footwear
    const dispatchRes = await request(app)
      .patch(`/api/admin/returns/${testReturnId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'replacement_dispatched',
        adminNotes: 'Agra artisan workshop prepared UK 9 replacement pair and dispatched.',
      });

    expect(dispatchRes.status).toBe(200);
    expect(dispatchRes.body.returnRequest.status).toBe('replacement_dispatched');
    expect(dispatchRes.body.returnRequest.replacementTrackingNumber).toMatch(/^BD-EXC-/);
  });

  it('POST /api/admin/products/upload-image - should upload or optimize product image via Cloudinary service', async () => {
    const res = await request(app)
      .post('/api/admin/products/upload-image')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        image: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=800&q=80',
        folder: 'footzi/products',
      });

    expect(res.status).toBe(200);
    expect(res.body.secureUrl).toBeDefined();
    expect(res.body.publicId).toBeDefined();
  });

  it('POST /api/admin/products - admin should create new shoe with variants & auto-initialize inventory', async () => {
    const res = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'The Agra Sovereign Tassel Loafer',
        category: 'Loafers',
        description: 'Hand-burnished calfskin tassel loafer inspired by Mughal archway motifs.',
        price: 4499,
        originalPrice: 6499,
        brand: 'Footzi Atelier',
        images: ['https://images.unsplash.com/photo-1614252235316-8c857d38b5f4'],
        colors: [{ name: 'Deep Mahogany', hex: '#3B2317', imageIndex: 0 }],
        sizes: ['UK 8', 'UK 9'],
        variants: [
          {
            sku: testVariantSku,
            size: 'UK 8',
            color: 'Deep Mahogany',
            colorHex: '#3B2317',
            stock: 15,
            supplierRef: 'SUP-AGR-01',
          },
        ],
        material: 'Full-Grain Calfskin Leather',
        sole: 'Handcrafted Argentine Leather Sole',
        craftsmanshipLocation: 'Handcrafted in Agra, Uttar Pradesh',
        features: ['Goodyear Welted', 'Mughal Arch Broguing', 'Memory Foam Insole'],
      });

    expect(res.status).toBe(201);
    expect(res.body.product).toBeDefined();
    expect(res.body.product.slug).toBe('the-agra-sovereign-tassel-loafer');
    expect(res.body.product.discountPercent).toBe(31);

    testCreatedProductId = res.body.product._id;

    // Verify inventory record was automatically created
    const inv = await Inventory.findOne({ variantSku: testVariantSku });
    expect(inv).toBeDefined();
    expect(inv?.availableStock).toBe(15);
  });

  it('PATCH /api/admin/inventory/:sku - admin should adjust variant stock level directly', async () => {
    const res = await request(app)
      .patch(`/api/admin/inventory/${testVariantSku}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ availableStock: 25 });

    expect(res.status).toBe(200);
    expect(res.body.inventory.availableStock).toBe(25);

    const inv = await Inventory.findOne({ variantSku: testVariantSku });
    expect(inv?.availableStock).toBe(25);
  });

  it('PATCH /api/admin/products/:id/toggle-active - admin should deactivate and reactivate product', async () => {
    const res = await request(app)
      .patch(`/api/admin/products/${testCreatedProductId}/toggle-active`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(false);

    // Toggle back
    const res2 = await request(app)
      .patch(`/api/admin/products/${testCreatedProductId}/toggle-active`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res2.status).toBe(200);
    expect(res2.body.isActive).toBe(true);
  });

  it('GET /api/admin/analytics - should include return and cancellation statistics', async () => {
    const res = await request(app)
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.metrics.totalReturnsCount).toBeGreaterThanOrEqual(1);
    expect(res.body.metrics.returnRatePercent).toBeDefined();
  });
});
