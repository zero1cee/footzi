import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { reportService, toCsv } from '../services/reportService.js';

export const getSalesReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.status(200).json(await reportService.sales(req.query.days));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.status(200).json(await reportService.customers(req.query));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/** Real customer details in a file the demo admin could keep: refused outright for that account. */
const refuseDemo = (req: AuthRequest, res: Response): boolean => {
  if (req.user?.role === 'demo_admin') {
    res.status(403).json({ error: 'Exports are disabled in the read-only demo.' });
    return true;
  }
  return false;
};

const sendCsv = (res: Response, filename: string, body: string) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  // A byte-order mark so Excel reads the rupee sign and names correctly
  res.status(200).send(`﻿${body}`);
};

export const exportOrdersCsv = async (req: AuthRequest, res: Response): Promise<void> => {
  if (refuseDemo(req, res)) return;
  try {
    const orders = await reportService.orderRows(req.query.from, req.query.to);
    const header = ['Order', 'Placed', 'Customer', 'Email', 'Phone', 'Guest', 'Order status', 'Payment', 'Items', 'Subtotal', 'Discount', 'Coupon', 'Shipping', 'Total', 'Refunded', 'City', 'State', 'Pincode', 'Tracking'];
    const rows = orders.map((o) => [
      o.orderNumber,
      o.createdAt,
      o.customerName,
      o.customerEmail,
      o.customerPhone,
      o.isGuest ? 'yes' : 'no',
      o.orderStatus,
      o.paymentStatus,
      o.items.map((i) => `${i.quantity} x ${i.name} (${i.size}, ${i.color})`).join('; '),
      o.subtotal,
      o.discount,
      o.couponCode ?? '',
      o.shippingFee,
      o.total,
      o.refundedAmount ?? 0,
      o.shippingAddress?.city,
      o.shippingAddress?.state,
      o.shippingAddress?.pincode,
      o.trackingNumber ?? '',
    ]);
    sendCsv(res, `footzi-orders-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(header, rows));
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const exportCustomersCsv = async (req: AuthRequest, res: Response): Promise<void> => {
  if (refuseDemo(req, res)) return;
  try {
    const customers = await reportService.allCustomers();
    const header = ['Name', 'Email', 'Phone', 'Has account', 'Orders', 'Total spent', 'First order', 'Last order'];
    const rows = customers.map((c: any) => [c.customerName, c.email, c.customerPhone, c.hasAccount ? 'yes' : 'no', c.orders, c.spent, c.firstOrderAt, c.lastOrderAt]);
    sendCsv(res, `footzi-customers-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(header, rows));
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
