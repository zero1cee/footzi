import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { SupplierOrder } from '../models/SupplierOrder.js';

const app = createApp();

describe('Order Lifecycle & Payment Integration Suite', () => {
  let patronToken = '';
  let adminToken = '';
  let targetProduct: any = null;
  let createdOrderId = '';
  let gatewayOrderId = '';

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

    // Fetch sample product
    targetProduct = await Product.findOne({ slug: 'agra-belgravia-penny-loafer' });
  });

  afterAll(async () => {
    // Clean up created orders
    if (createdOrderId) {
      await Order.deleteOne({ _id: createdOrderId });
      await SupplierOrder.deleteMany({ customerOrder: createdOrderId });
    }
    await mongoose.connection.close();
  });

  it('POST /api/orders - should create customer order with server-calculated prices & stock reservation', async () => {
    const variant = targetProduct.variants[0];

    const orderPayload = {
      customerName: 'Arjun Kapoor',
      customerEmail: 'patron@footzi.in',
      customerPhone: '+91 98765 43210',
      items: [
        {
          productId: targetProduct._id.toString(),
          variantSku: variant.sku,
          size: variant.size,
          color: variant.color,
          quantity: 1,
        },
      ],
      shippingAddress: {
        name: 'Arjun Kapoor',
        phone: '+91 98765 43210',
        addressLine: '42 Heritage Enclave, Civil Lines',
        city: 'Agra',
        state: 'Uttar Pradesh',
        pincode: '282001',
      },
      couponCode: 'FOOTZI10',
    };

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${patronToken}`)
      .send(orderPayload);

    expect(res.status).toBe(201);
    expect(res.body.order).toHaveProperty('orderNumber');
    expect(res.body.order.orderStatus).toBe('pending_payment');
    expect(res.body.order.paymentStatus).toBe('pending');

    const expectedSubtotal = variant.priceOverride ?? targetProduct.price;
    const expectedDiscount = Math.round(expectedSubtotal * 0.1);
    expect(res.body.order.subtotal).toBe(expectedSubtotal);
    expect(res.body.order.discount).toBe(expectedDiscount);

    createdOrderId = res.body.order._id;
  });

  it('POST /api/payments/create-order - should generate Razorpay order with amount in paise', async () => {
    const res = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${patronToken}`)
      .send({ orderId: createdOrderId });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('gatewayOrderId');
    expect(res.body).toHaveProperty('amountInPaise');
    expect(res.body.currency).toBe('INR');

    gatewayOrderId = res.body.gatewayOrderId;
  });

  it('POST /api/payments/verify - should verify payment signature and trigger Agra supplier fulfillment', async () => {
    // Submit verification
    const res = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${patronToken}`)
      .send({
        orderId: createdOrderId,
        razorpayOrderId: gatewayOrderId,
        razorpayPaymentId: 'pay_test_98765',
        razorpaySignature: 'mock_valid_signature_test_mode',
      });

    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(true);
    expect(res.body.order.paymentStatus).toBe('paid');
    expect(res.body.order.orderStatus).toBe('processing');
    expect(res.body.supplierOrder).toBeDefined();
    expect(res.body.supplierOrder.trackingNumber).toMatch(/^BD-AGR-/);
  });

  it('POST /api/admin/supplier-orders/:id/fulfill - admin should transition supplier fulfillment pipeline', async () => {
    // Fetch supplier order for our created order
    const supplierOrder = await SupplierOrder.findOne({ customerOrder: createdOrderId });
    expect(supplierOrder).toBeDefined();

    // The workshop pipeline cannot skip a step
    const skipped = await request(app)
      .post(`/api/admin/supplier-orders/${supplierOrder!._id}/fulfill`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'delivered' });
    expect(skipped.status).toBe(400);
    expect(skipped.body.error).toMatch(/can only move to: processing, cancelled/);

    const processing = await request(app)
      .post(`/api/admin/supplier-orders/${supplierOrder!._id}/fulfill`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'processing' });
    expect(processing.status).toBe(200);

    // Transition to 'shipped'
    const res = await request(app)
      .post(`/api/admin/supplier-orders/${supplierOrder!._id}/fulfill`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'shipped',
        note: 'Dispatched from BlueDart Agra Logistics Hub',
      });

    expect(res.status).toBe(200);
    expect(res.body.supplierOrder.status).toBe('shipped');

    // Verify customer order was also updated
    const updatedCustomerOrder = await Order.findById(createdOrderId);
    expect(updatedCustomerOrder?.orderStatus).toBe('shipped');
  });

  it('GET /api/admin/analytics - should return live business metrics from database', async () => {
    const res = await request(app)
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('metrics');
    expect(res.body.metrics).toHaveProperty('totalRevenue');
    expect(res.body.metrics).toHaveProperty('totalPaidOrders');
    expect(res.body.metrics.totalPaidOrders).toBeGreaterThanOrEqual(1);
    expect(res.body).toHaveProperty('recentOrders');
  });
});
