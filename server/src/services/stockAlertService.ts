import mongoose from 'mongoose';
import { StockAlert } from '../models/StockAlert.js';
import { Product } from '../models/Product.js';
import { Inventory } from '../models/Inventory.js';
import { emailService, appUrl } from './emailService.js';
import { logEvent } from '../middleware/errorHandler.js';

const DAY = 86_400_000;
const WAIT_MONTHS_DAYS = 180; // how long a request waits for the size to return
const KEEP_AFTER_SENDING_DAYS = 30;
/** One address can wait on this many sizes at once, so the form cannot be used to flood someone's inbox. */
const MAX_WAITING_PER_EMAIL = 10;

export class StockAlertError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export class StockAlertService {
  /**
   * Records that this address wants to hear when a sold-out size is back. Asking twice is harmless.
   * A size that is in stock right now is refused, so the form cannot be used for anything but a real wait.
   */
  async subscribe(email: string, sku: string): Promise<void> {
    const cleanSku = sku.trim().toUpperCase();
    const product = await Product.findOne({ isActive: true, 'variants.sku': cleanSku }).select('name variants').lean();
    const variant = product?.variants.find((v) => v.sku.toUpperCase() === cleanSku);
    if (!product || !variant) throw new StockAlertError('That size is not available.', 404);

    const inv = await Inventory.findOne({ variantSku: cleanSku }).select('availableStock').lean();
    if ((inv?.availableStock ?? 0) > 0) throw new StockAlertError('Good news: this size is in stock right now.', 409);

    const clean = email.trim().toLowerCase();
    const waiting = await StockAlert.countDocuments({ email: clean, notifiedAt: { $exists: false } });
    const already = await StockAlert.exists({ email: clean, sku: cleanSku });
    if (!already && waiting >= MAX_WAITING_PER_EMAIL) {
      throw new StockAlertError('You are already waiting on several sizes. We will email you as each comes back.', 429);
    }

    // Upsert keeps one record per email and size. A request that was already sent is re-armed, so someone
    // who missed the pair last time can ask again when it sells out once more.
    await StockAlert.updateOne(
      { email: clean, sku: cleanSku },
      {
        $set: { product: product._id, productName: product.name, size: variant.size, color: variant.color, expiresAt: new Date(Date.now() + WAIT_MONTHS_DAYS * DAY) },
        $unset: { notifiedAt: '' },
      },
      { upsert: true }
    );
  }

  /**
   * Emails everyone waiting on a size that is back in stock. Each request is claimed with one conditional
   * update before its email is sent, so two overlapping runs (or a restart mid-run) can never email anyone twice.
   */
  async sweep(): Promise<number> {
    const waiting = await StockAlert.distinct('sku', { notifiedAt: { $exists: false } });
    if (waiting.length === 0) return 0;

    const back = await Inventory.find({ variantSku: { $in: waiting }, availableStock: { $gt: 0 } }).select('variantSku').lean();
    const backSkus = back.map((i) => i.variantSku);
    if (backSkus.length === 0) return 0;

    const alerts = await StockAlert.find({ sku: { $in: backSkus }, notifiedAt: { $exists: false } }).limit(500);
    let sent = 0;
    for (const alert of alerts) {
      const claimed = await StockAlert.findOneAndUpdate(
        { _id: alert._id, notifiedAt: { $exists: false } },
        { $set: { notifiedAt: new Date(), expiresAt: new Date(Date.now() + KEEP_AFTER_SENDING_DAYS * DAY) } }
      );
      if (!claimed) continue;

      const product = await Product.findById(alert.product).select('slug').lean();
      const delivered = await emailService.backInStock(
        { to: alert.email, productName: alert.productName, size: alert.size, color: alert.color },
        `${appUrl()}/product/${product?.slug ?? ''}`
      );
      if (delivered) sent += 1;
      else logEvent('warn', 'stock_alert_not_delivered', { sku: alert.sku });
    }
    return sent;
  }
}

export const stockAlertService = new StockAlertService();
