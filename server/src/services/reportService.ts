import { Order } from '../models/Order.js';
import { User } from '../models/User.js';

const TZ = 'Asia/Kolkata';
const DAY = 86_400_000;

/** A date as YYYY-MM-DD on the shop's calendar (India), which is what a day of sales means to the owner. */
const istDay = (date: Date): string => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(date);

// The moment an order was paid; older or unpaid-then-paid orders without a timestamp fall back to when they were placed
const paidDate = { $ifNull: ['$paymentDetails.paidAt', '$createdAt'] };

const clampDays = (days: unknown): number => {
  const n = Math.floor(Number(days));
  return [7, 30, 90, 365].includes(n) ? n : 30;
};

export class ReportService {
  /**
   * Sales for the last N days. "Revenue" is money kept: what customers paid minus what was refunded.
   * Cancelled-and-refunded orders therefore net to zero instead of inflating the chart.
   */
  async sales(daysInput: unknown) {
    const days = clampDays(daysInput);
    const keys: string[] = [];
    for (let i = days - 1; i >= 0; i--) keys.push(istDay(new Date(Date.now() - i * DAY)));
    // Start of the first day in India time, expressed as an instant
    const since = new Date(`${keys[0]}T00:00:00+05:30`);

    const settled = { paymentStatus: { $in: ['paid', 'refunded'] } };

    const [daily, products, coupons, funnel] = await Promise.all([
      Order.aggregate([
        { $match: settled },
        { $addFields: { paidOn: paidDate } },
        { $match: { paidOn: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidOn', timezone: TZ } },
            gross: { $sum: '$total' },
            refunded: { $sum: '$refundedAmount' },
            orders: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $addFields: { paidOn: paidDate } },
        { $match: { paidOn: { $gte: since } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: { product: '$items.product', name: '$items.name' },
            units: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.lineTotal' },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 8 },
        { $project: { _id: 0, productId: '$_id.product', name: '$_id.name', units: 1, revenue: 1 } },
      ]),
      Order.aggregate([
        { $match: { paymentStatus: 'paid', couponCode: { $exists: true, $nin: [null, ''] } } },
        { $addFields: { paidOn: paidDate } },
        { $match: { paidOn: { $gte: since } } },
        { $group: { _id: '$couponCode', uses: { $sum: 1 }, discountGiven: { $sum: '$discount' }, revenue: { $sum: '$total' } } },
        { $sort: { uses: -1 } },
        { $limit: 8 },
        { $project: { _id: 0, code: '$_id', uses: 1, discountGiven: 1, revenue: 1 } },
      ]),
      // Of the orders started in this period, how many were paid, and how many were abandoned or cancelled unpaid
      Order.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: null,
            started: { $sum: 1 },
            paid: { $sum: { $cond: [{ $in: ['$paymentStatus', ['paid', 'refunded']] }, 1, 0] } },
            abandoned: { $sum: { $cond: [{ $and: [{ $eq: ['$orderStatus', 'cancelled'] }, { $eq: ['$paymentStatus', 'pending'] }] }, 1, 0] } },
            guest: { $sum: { $cond: ['$isGuest', 1, 0] } },
          },
        },
      ]),
    ]);

    const byDay = new Map<string, { gross: number; refunded: number; orders: number }>(daily.map((d) => [d._id as string, d]));
    const series = keys.map((date) => {
      const d = byDay.get(date);
      const gross = d?.gross ?? 0;
      const refunded = d?.refunded ?? 0;
      return { date, orders: d?.orders ?? 0, revenue: Math.round(gross - refunded), refunded: Math.round(refunded) };
    });

    const orders = series.reduce((sum, d) => sum + d.orders, 0);
    const revenue = series.reduce((sum, d) => sum + d.revenue, 0);
    const refunded = series.reduce((sum, d) => sum + d.refunded, 0);
    const f = funnel[0] ?? { started: 0, paid: 0, abandoned: 0, guest: 0 };

    return {
      days,
      series,
      totals: {
        revenue,
        orders,
        refunded,
        averageOrderValue: orders > 0 ? Math.round((revenue + refunded) / orders) : 0,
      },
      funnel: {
        started: f.started,
        paid: f.paid,
        abandoned: f.abandoned,
        guestOrders: f.guest,
        conversionPercent: f.started > 0 ? Math.round((f.paid / f.started) * 1000) / 10 : 0,
      },
      topProducts: products,
      coupons,
    };
  }

  /**
   * Everyone who has paid for an order, grouped by email so that a person who ordered as a guest and later
   * with an account counts once. Name and email fields use the keys the demo-admin masking already hides.
   */
  async customers(params: { search?: unknown; sort?: unknown; page?: unknown; limit?: unknown }) {
    const search = typeof params.search === 'string' ? params.search.trim().slice(0, 60) : '';
    const sortKey = ({ spent: 'spent', orders: 'orders', recent: 'lastOrderAt' } as Record<string, string>)[String(params.sort)] ?? 'spent';
    const page = Math.max(1, Math.floor(Number(params.page)) || 1);
    const limit = Math.min(100, Math.max(1, Math.floor(Number(params.limit)) || 20));

    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pipeline: any[] = [
      { $match: { paymentStatus: { $in: ['paid', 'refunded'] } } },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: { $toLower: '$customerEmail' },
          customerName: { $last: '$customerName' },
          customerPhone: { $last: '$customerPhone' },
          orders: { $sum: 1 },
          spent: { $sum: { $subtract: ['$total', '$refundedAmount'] } },
          firstOrderAt: { $min: '$createdAt' },
          lastOrderAt: { $max: '$createdAt' },
          hasAccount: { $max: { $cond: [{ $eq: ['$isGuest', true] }, 0, 1] } },
        },
      },
      { $project: { _id: 0, email: '$_id', customerName: 1, customerPhone: 1, orders: 1, spent: { $round: ['$spent', 0] }, firstOrderAt: 1, lastOrderAt: 1, hasAccount: { $eq: ['$hasAccount', 1] } } },
      ...(search ? [{ $match: { $or: [{ email: { $regex: escaped, $options: 'i' } }, { customerName: { $regex: escaped, $options: 'i' } }] } }] : []),
      { $sort: { [sortKey]: -1, email: 1 } },
      {
        $facet: {
          rows: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          total: [{ $count: 'n' }],
        },
      },
    ];

    const [result] = await Order.aggregate(pipeline);
    const total: number = result?.total?.[0]?.n ?? 0;
    const accounts = await User.countDocuments({ role: 'customer' });
    return { customers: result?.rows ?? [], total, page, totalPages: Math.ceil(total / limit) || 1, accounts };
  }

  /** Every customer, for the spreadsheet: the screen pages through them, the file walks all the pages. */
  async allCustomers(max = 20_000) {
    const all: any[] = [];
    for (let page = 1; ; page++) {
      const result = await this.customers({ sort: 'spent', limit: 100, page });
      all.push(...result.customers);
      if (page >= result.totalPages || all.length >= max) break;
    }
    return all.slice(0, max);
  }

  /** Orders as spreadsheet rows, newest first. Capped so one request cannot pull the whole database. */
  async orderRows(fromInput?: unknown, toInput?: unknown) {
    const to = toInput ? new Date(`${String(toInput)}T23:59:59.999+05:30`) : new Date();
    const from = fromInput ? new Date(`${String(fromInput)}T00:00:00+05:30`) : new Date(to.getTime() - 30 * DAY);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) throw new Error('Use dates like 2026-11-30.');
    if (to.getTime() - from.getTime() > 366 * DAY) throw new Error('Choose a range of a year or less.');
    return Order.find({ createdAt: { $gte: from, $lte: to } }).sort({ createdAt: -1 }).limit(20_000).lean();
  }
}

export const reportService = new ReportService();

/**
 * A spreadsheet cell. A value that starts with = + - @ would be run as a formula when the file is opened,
 * and customers choose their own names, so those are defused with a leading apostrophe.
 */
export const csvCell = (value: unknown): string => {
  let text = value instanceof Date ? value.toISOString() : String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const toCsv = (header: string[], rows: unknown[][]): string =>
  [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
