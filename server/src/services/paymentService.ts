import crypto from 'crypto';
import { razorpayInstance, RAZORPAY_CONFIG } from '../config/razorpay.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { Inventory } from '../models/Inventory.js';
import { Product } from '../models/Product.js';
import { SupplierOrder } from '../models/SupplierOrder.js';
import { supplierFulfillmentService } from './supplierFulfillmentService.js';
import { refundService } from './refundService.js';
import { emailService } from './emailService.js';

// Demo mode = the server is running on the placeholder Razorpay credentials.
const isDemoMode = (): boolean =>
  RAZORPAY_CONFIG.key_id.includes('placeholder') || RAZORPAY_CONFIG.key_secret.includes('placeholder');

const safeEqual = (a: string, b: string): boolean => {
  const x = Buffer.from(a, 'utf8');
  const y = Buffer.from(b, 'utf8');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

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

    if (order.orderStatus !== 'pending_payment') {
      throw new Error(`Order in '${order.orderStatus}' state cannot be paid for.`);
    }

    const amountInPaise = Math.round(order.total * 100);

    let gatewayOrderId = `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // With real credentials a gateway failure is a real failure; only demo mode simulates
    if (!isDemoMode()) {
      try {
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
      } catch (err: any) {
        const reason = err?.error?.description || err?.message || 'unknown gateway error';
        console.error('[Razorpay API] Order creation failed:', reason);
        throw new Error('The payment gateway is unavailable right now. Please try again.');
      }
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
      demoMode: isDemoMode(),
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

    // Idempotency: a repeated verification of an already-paid order changes nothing
    if (order.paymentStatus === 'paid') {
      return this.alreadyPaidResult(order);
    }

    // Compute HMAC SHA256 signature
    const generatedSignature = crypto
      .createHmac('sha256', RAZORPAY_CONFIG.key_secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    // The mock signature is honoured only in demo mode, i.e. while the server
    // is running on placeholder Razorpay credentials. With real keys configured,
    // nothing but a genuine HMAC is accepted.
    const isSignatureValid =
      safeEqual(generatedSignature, razorpaySignature) ||
      (isDemoMode() && razorpaySignature === 'mock_valid_signature_test_mode');

    if (order.orderStatus !== 'pending_payment') {
      // A genuine payment for an order that expired or was cancelled meanwhile: the
      // customer was charged for nothing, so it is refunded rather than just rejected.
      if (isSignatureValid && order.orderStatus === 'cancelled') {
        return this.rejectLatePayment(payment, razorpayPaymentId);
      }
      throw new Error(`Order in '${order.orderStatus}' state cannot be paid for.`);
    }

    if (!isSignatureValid) {
      payment.status = 'failed';
      payment.failureReason = 'Cryptographic signature mismatch';
      await payment.save();

      // The order is closed so its stock is released exactly once and it cannot be retried
      order.paymentStatus = 'failed';
      order.orderStatus = 'cancelled';
      order.statusHistory.push({
        status: 'cancelled',
        timestamp: new Date(),
        note: 'Payment signature verification failed. Order cancelled and stock released.',
      });
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

    const outcome = await this.fulfillPaidOrder(order, payment, razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (outcome.status === 'already_paid') {
      return this.alreadyPaidResult(order);
    }
    if (outcome.status === 'not_payable') {
      // The order expired or was cancelled while the customer was paying
      return this.rejectLatePayment(payment, razorpayPaymentId);
    }

    return {
      verified: true,
      message: 'Payment successfully verified. Order confirmed and supplier queued in Agra.',
      order: outcome.order,
      supplierOrder: outcome.supplierOrder,
    };
  }

  /**
   * Moves an unpaid order to paid and starts fulfilment. Used by both the client's
   * verify call and the Razorpay webhook. The first step is a single conditional
   * update, so however many verifications and webhooks arrive for one payment,
   * only one of them confirms the order, deducts stock and creates the supplier order.
   */
  private async fulfillPaidOrder(
    order: any,
    payment: any,
    gatewayOrderId: string,
    gatewayPaymentId: string,
    gatewaySignature: string
  ): Promise<
    | { status: 'fulfilled'; order: any; supplierOrder: any }
    | { status: 'already_paid' }
    | { status: 'not_payable' }
  > {
    const claim = await Order.updateOne(
      { _id: order._id, orderStatus: 'pending_payment', paymentStatus: { $ne: 'paid' } },
      { $set: { paymentStatus: 'paid' } }
    );
    if (claim.modifiedCount === 0) {
      const current = await Order.findById(order._id).select('paymentStatus');
      return { status: current?.paymentStatus === 'paid' ? 'already_paid' : 'not_payable' };
    }

    payment.status = 'captured';
    payment.signatureVerified = true;
    payment.gatewayPaymentId = gatewayPaymentId;
    payment.gatewaySignature = gatewaySignature;
    await payment.save();

    // Reload so the update below does not overwrite the claim made above
    const fresh = await Order.findById(order._id);
    if (!fresh) return { status: 'not_payable' };

    fresh.orderStatus = 'confirmed';
    fresh.paymentDetails = {
      gatewayOrderId,
      gatewayPaymentId,
      gatewaySignature,
      method: 'razorpay',
      paidAt: new Date(),
    };
    fresh.statusHistory.push({
      status: 'confirmed',
      timestamp: new Date(),
      note: 'Payment verified and captured via Razorpay. Order confirmed.',
    });
    await fresh.save();

    for (const item of fresh.items) {
      const inv = await Inventory.findOne({ variantSku: item.sku });
      if (inv) {
        await inv.confirmFulfillment(item.quantity);
      }
      // Keep the catalog's displayed stock in step with the sold inventory
      await Product.updateOne(
        { _id: item.product, variants: { $elemMatch: { sku: item.sku, stock: { $gte: item.quantity } } } },
        { $inc: { 'variants.$.stock': -item.quantity } }
      );
    }

    const supplierOrder = await supplierFulfillmentService.createSupplierOrder(fresh);
    if (supplierOrder) {
      fresh.supplierOrderId = supplierOrder._id as any;
      fresh.trackingNumber = supplierOrder.trackingNumber;
      fresh.carrier = supplierOrder.carrier;
      fresh.orderStatus = 'processing';
      fresh.statusHistory.push({
        status: 'processing',
        timestamp: new Date(),
        note: `Supplier fulfillment order queued in Agra workshop. Tracking: ${supplierOrder.trackingNumber}`,
      });
      await fresh.save();
    }

    void emailService.orderConfirmed(fresh);
    return { status: 'fulfilled', order: fresh, supplierOrder };
  }

  /**
   * A genuine payment arrived for an order that had already expired or been
   * cancelled. The customer was charged for nothing, so the money goes straight back.
   */
  private async rejectLatePayment(payment: any, gatewayPaymentId: string): Promise<never> {
    payment.status = 'captured';
    payment.gatewayPaymentId = gatewayPaymentId;
    await payment.save();
    const outcome = await this.refundLatePayment(payment);
    await Payment.updateOne({ _id: payment._id }, { $set: { failureReason: outcome } });
    throw new Error(
      'This order expired before the payment completed. Your payment is being refunded to your original payment method.'
    );
  }

  private async refundLatePayment(payment: any): Promise<string> {
    try {
      await refundService.refundOrder({
        orderId: payment.order,
        reference: `late-payment:${payment._id}`,
        reason: `Payment received after order ${payment.orderNumber} expired`,
      });
      return 'Payment received after the order was cancelled; refunded automatically';
    } catch (error: any) {
      console.error(`[Footzi Payment] Auto-refund failed for ${payment.orderNumber}: ${error.message}`);
      return 'Payment received after the order was cancelled; automatic refund failed, refund required';
    }
  }

  private async alreadyPaidResult(order: any) {
    const fresh = await Order.findById(order._id);
    const supplierOrder = await SupplierOrder.findOne({ customerOrder: order._id });
    return {
      verified: true,
      message: 'Payment was already verified for this order.',
      order: fresh,
      supplierOrder,
    };
  }

  // Handle Webhook Events
  async handleWebhook(body: any, webhookSignature: string, rawBody?: Buffer) {
    const secret = RAZORPAY_CONFIG.webhook_secret;
    const hasRealSecret = Boolean(secret) && !secret.includes('placeholder');

    if (hasRealSecret) {
      // Razorpay signs the exact bytes it sent, so verify against the raw body
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody ?? Buffer.from(JSON.stringify(body)))
        .digest('hex');

      if (!safeEqual(expectedSignature, webhookSignature)) {
        throw new Error('Webhook signature verification failed');
      }
    } else if (!isDemoMode()) {
      // Real payments are live but webhooks cannot be authenticated: reject them
      throw new Error('Webhook secret is not configured');
    }

    const event = body.event;
    console.log(`[Razorpay Webhook] Received event: ${event}`);

    const paymentEntity = body.payload?.payment?.entity;
    if (!paymentEntity?.order_id) {
      return { status: 'processed', event };
    }

    const payment = await Payment.findOne({ gatewayOrderId: paymentEntity.order_id });
    if (!payment) {
      return { status: 'processed', event };
    }
    payment.webhookEvents.push(body);

    if (event === 'payment.captured') {
      const order = await Order.findById(payment.order);

      // Only an authenticated webhook may confirm an order. In demo mode the
      // webhook is unauthenticated, so it is recorded but never trusted to pay.
      if (hasRealSecret && order) {
        if (paymentEntity.amount !== Math.round(order.total * 100)) {
          payment.failureReason = 'Captured amount does not match the order total';
          console.error(`[Razorpay Webhook] Amount mismatch on order ${order.orderNumber}`);
        } else if (order.paymentStatus !== 'paid') {
          const outcome = await this.fulfillPaidOrder(
            order,
            payment,
            paymentEntity.order_id,
            paymentEntity.id,
            'confirmed-by-webhook'
          );
          if (outcome.status === 'not_payable') {
            payment.status = 'captured';
            payment.gatewayPaymentId = paymentEntity.id;
            await payment.save();
            payment.failureReason = await this.refundLatePayment(payment);
            console.error(`[Razorpay Webhook] Payment for cancelled order ${order.orderNumber}: ${payment.failureReason}`);
          }
        }
      } else {
        payment.status = 'captured';
      }
    } else if (event === 'payment.failed' && payment.status !== 'captured') {
      payment.status = 'failed';
      payment.failureReason = paymentEntity.error_description || 'Gateway failed';
    }

    await payment.save();

    return { status: 'processed', event };
  }
}

export const paymentService = new PaymentService();
