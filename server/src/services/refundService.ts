import crypto from 'crypto';
import { razorpayInstance, RAZORPAY_CONFIG } from '../config/razorpay.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { emailService } from './emailService.js';

const isDemoMode = (): boolean =>
  RAZORPAY_CONFIG.key_id.includes('placeholder') || RAZORPAY_CONFIG.key_secret.includes('placeholder');

export interface RefundResult {
  refundId: string;
  amount: number;
  simulated: boolean;
  /** True when this reference had already been refunded, so nothing new was sent to the gateway. */
  alreadyIssued: boolean;
}

export class RefundService {
  /**
   * Sends money back to the customer's original payment method.
   *
   * `reference` identifies the business event (a return request, a cancellation)
   * and makes the call idempotent: the reference is claimed with a conditional
   * update before the gateway is contacted, so a retry or a race can never refund
   * the same event twice. If the gateway call fails, the claim is released and the
   * error is thrown so the caller can retry later.
   */
  async refundOrder(params: {
    orderId: unknown;
    reference: string;
    reason: string;
    /** Rupees. Defaults to everything still refundable. */
    amount?: number;
    notify?: boolean;
  }): Promise<RefundResult> {
    const { orderId, reference, reason, notify = true } = params;

    const payment = await Payment.findOne({
      order: orderId,
      status: { $in: ['captured', 'refunded'] },
      gatewayPaymentId: { $exists: true, $ne: null },
    }).sort({ createdAt: -1 });
    if (!payment) {
      throw new Error('No captured payment was found for this order, so there is nothing to refund.');
    }

    const existing = payment.refunds.find((r) => r.reference === reference);
    if (existing) {
      return { refundId: existing.refundId, amount: existing.amount, simulated: existing.simulated, alreadyIssued: true };
    }

    const alreadyRefunded = payment.refunds.reduce((sum, r) => sum + r.amount, 0);
    const remaining = Math.round((payment.amount - alreadyRefunded) * 100) / 100;
    const amount = Math.min(params.amount ?? remaining, remaining);
    if (!(amount > 0)) {
      throw new Error('This payment has already been refunded in full.');
    }

    const simulated = isDemoMode();

    // Claim the reference before talking to the gateway
    const claim = await Payment.updateOne(
      { _id: payment._id, 'refunds.reference': { $ne: reference } },
      {
        $push: {
          refunds: { refundId: 'pending', amount, reason, reference, simulated, status: 'pending', createdAt: new Date() },
        },
      }
    );
    if (claim.modifiedCount === 0) {
      // Another request claimed this exact refund a moment ago
      const current = await Payment.findById(payment._id);
      const mine = current?.refunds.find((r) => r.reference === reference);
      return { refundId: mine?.refundId ?? 'pending', amount: mine?.amount ?? amount, simulated, alreadyIssued: true };
    }

    let refundId: string;
    try {
      if (simulated) {
        refundId = `rfnd_demo_${crypto.randomBytes(6).toString('hex')}`;
      } else {
        const gateway: any = await razorpayInstance.payments.refund(payment.gatewayPaymentId!, {
          amount: Math.round(amount * 100),
          speed: 'normal',
          receipt: reference.slice(0, 40),
          notes: { reason: reason.slice(0, 200), reference },
        });
        refundId = gateway.id;
      }
    } catch (err: any) {
      await Payment.updateOne({ _id: payment._id }, { $pull: { refunds: { reference } } });
      const detail = err?.error?.description || err?.message || 'unknown gateway error';
      console.error(`[Footzi Refund] Gateway refused refund for ${payment.orderNumber}: ${detail}`);
      throw new Error(`The payment gateway could not process the refund: ${detail}`);
    }

    await Payment.updateOne(
      { _id: payment._id, 'refunds.reference': reference },
      { $set: { 'refunds.$.refundId': refundId, 'refunds.$.status': 'processed' } }
    );
    if (alreadyRefunded + amount >= payment.amount) {
      await Payment.updateOne({ _id: payment._id }, { $set: { status: 'refunded' } });
    }

    const order = await Order.findByIdAndUpdate(orderId, { $inc: { refundedAmount: amount } }, { new: true });
    if (order && order.refundedAmount >= order.total) {
      order.paymentStatus = 'refunded';
      await order.save();
    }
    if (order && notify) {
      void emailService.refundIssued(order, amount, reason);
    }

    return { refundId, amount, simulated, alreadyIssued: false };
  }
}

export const refundService = new RefundService();
