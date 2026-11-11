import crypto from 'crypto';
import { razorpayInstance, RAZORPAY_CONFIG } from '../config/razorpay.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { Inventory } from '../models/Inventory.js';
import { supplierFulfillmentService } from './supplierFulfillmentService.js';

export class PaymentService {
  // Create Razorpay Gateway Order
  async createGatewayOrder(orderId: string, userId: string) {
    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
      throw new Error('Order not found.');
    }

    if (order.paymentStatus === 'paid') {
      throw new Error('This order has already been paid for.');
    }

    const amountInPaise = Math.round(order.total * 100);

    let gatewayOrderId = `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    try {
      if (RAZORPAY_CONFIG.key_id && !RAZORPAY_CONFIG.key_id.includes('placeholder')) {
        const rzpOrder = await razorpayInstance.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: order.orderNumber,
          notes: {
            orderNumber: order.orderNumber,
            customerEmail: order.customerEmail,
          },
        });
        gatewayOrderId = rzpOrder.id;
      }
    } catch (err: any) {
      console.warn('[Razorpay API] Using simulated test gateway order:', err.message);
    }

    // Save payment record
    const payment = await Payment.create({
      order: order._id,
      orderNumber: order.orderNumber,
      gateway: 'razorpay',
      gatewayOrderId,
      amount: order.total,
      currency: 'INR',
      status: 'created',
      signatureVerified: false,
    });

    order.paymentDetails = {
      gatewayOrderId,
      method: 'razorpay',
    };
    await order.save();

    return {
      orderId: order._id,
      orderNumber: order.orderNumber,
      gatewayOrderId,
      amount: order.total,
      amountInPaise,
      currency: 'INR',
      keyId: RAZORPAY_CONFIG.key_id,
      customer: {
        name: order.customerName,
        email: order.customerEmail,
        phone: order.customerPhone,
      },
    };
  }

  // Cryptographically verify Razorpay signature
  async verifyPaymentSignature(params: {
    orderId: string;
    userId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    const { orderId, userId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = params;

    // Only the patron who placed the order may verify its payment
    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
      throw new Error('Order not found.');
    }

    const payment = await Payment.findOne({ order: order._id, gatewayOrderId: razorpayOrderId });
    if (!payment) {
      throw new Error('Associated payment record not found.');
    }

    // Compute HMAC SHA256 signature
    const generatedSignature = crypto
      .createHmac('sha256', RAZORPAY_CONFIG.key_secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const expected = Buffer.from(generatedSignature, 'utf8');
    const received = Buffer.from(razorpaySignature, 'utf8');
    const hmacMatches =
      expected.length === received.length && crypto.timingSafeEqual(expected, received);

    // The mock signature is honoured only in demo mode, i.e. while the server
    // is running on placeholder Razorpay credentials. With real keys configured,
    // nothing but a genuine HMAC is accepted.
    const isDemoMode = RAZORPAY_CONFIG.key_secret.includes('placeholder');
    const isSignatureValid =
      hmacMatches || (isDemoMode && razorpaySignature === 'mock_valid_signature_test_mode');

    if (!isSignatureValid) {
      payment.status = 'failed';
      payment.failureReason = 'Cryptographic signature mismatch';
      await payment.save();

      order.paymentStatus = 'failed';
      await order.save();

      // Release reserved inventory
      for (const item of order.items) {
        const inv = await Inventory.findOne({ variantSku: item.sku });
        if (inv) {
          await inv.releaseStock(item.quantity);
        }
      }

      return {
        verified: false,
        message: 'Payment verification failed: Signature mismatch. Potential tampering detected.',
      };
    }

    // Mark payment as captured & verified
    payment.status = 'captured';
    payment.signatureVerified = true;
    payment.gatewayPaymentId = razorpayPaymentId;
    payment.gatewaySignature = razorpaySignature;
    await payment.save();

    // Update order status
    order.paymentStatus = 'paid';
    order.orderStatus = 'confirmed';
    order.paymentDetails = {
      gatewayOrderId: razorpayOrderId,
      gatewayPaymentId: razorpayPaymentId,
      gatewaySignature: razorpaySignature,
      method: 'razorpay',
      paidAt: new Date(),
    };
    order.statusHistory.push({
      status: 'confirmed',
      timestamp: new Date(),
      note: 'Payment verified and captured via Razorpay. Order confirmed.',
    });
    await order.save();

    // Confirm inventory fulfillment deduction
    for (const item of order.items) {
      const inv = await Inventory.findOne({ variantSku: item.sku });
      if (inv) {
        await inv.confirmFulfillment(item.quantity);
      }
    }

    // Trigger dropshipping supplier fulfillment order in Agra
    const supplierOrder = await supplierFulfillmentService.createSupplierOrder(order);
    if (supplierOrder) {
      order.supplierOrderId = supplierOrder._id as any;
      order.trackingNumber = supplierOrder.trackingNumber;
      order.carrier = supplierOrder.carrier;
      order.orderStatus = 'processing';
      order.statusHistory.push({
        status: 'processing',
        timestamp: new Date(),
        note: `Supplier fulfillment order queued in Agra workshop. Tracking: ${supplierOrder.trackingNumber}`,
      });
      await order.save();
    }

    return {
      verified: true,
      message: 'Payment successfully verified. Order confirmed and supplier queued in Agra.',
      order,
      supplierOrder,
    };
  }

  // Handle Webhook Events
  async handleWebhook(body: any, webhookSignature: string) {
    if (RAZORPAY_CONFIG.webhook_secret && !RAZORPAY_CONFIG.webhook_secret.includes('placeholder')) {
      const expectedSignature = crypto
        .createHmac('sha256', RAZORPAY_CONFIG.webhook_secret)
        .update(JSON.stringify(body))
        .digest('hex');

      if (expectedSignature !== webhookSignature) {
        throw new Error('Webhook signature verification failed');
      }
    }

    const event = body.event;
    console.log(`[Razorpay Webhook] Received event: ${event}`);

    if (event === 'payment.captured') {
      const paymentEntity = body.payload?.payment?.entity;
      if (paymentEntity?.order_id) {
        const payment = await Payment.findOne({ gatewayOrderId: paymentEntity.order_id });
        if (payment) {
          payment.status = 'captured';
          payment.webhookEvents.push(body);
          await payment.save();
        }
      }
    } else if (event === 'payment.failed') {
      const paymentEntity = body.payload?.payment?.entity;
      if (paymentEntity?.order_id) {
        const payment = await Payment.findOne({ gatewayOrderId: paymentEntity.order_id });
        if (payment) {
          payment.status = 'failed';
          payment.failureReason = paymentEntity.error_description || 'Gateway failed';
          payment.webhookEvents.push(body);
          await payment.save();
        }
      }
    }

    return { status: 'processed', event };
  }
}

export const paymentService = new PaymentService();
