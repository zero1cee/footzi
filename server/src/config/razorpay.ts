import Razorpay from 'razorpay';

const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key_id';
const key_secret = process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret_key';

export const razorpayInstance = new Razorpay({
  key_id,
  key_secret,
});

export const RAZORPAY_CONFIG = {
  key_id,
  key_secret,
  webhook_secret: process.env.RAZORPAY_WEBHOOK_SECRET || 'placeholder_webhook_secret',
};
