import { Request, Response } from 'express';
import { z } from 'zod';
import { stockAlertService, StockAlertError } from '../services/stockAlertService.js';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
  sku: z.string().trim().regex(/^[A-Za-z0-9_-]{4,40}$/, 'Choose a size first'),
});

export const subscribeToStockAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, sku } = schema.parse(req.body);
    await stockAlertService.subscribe(email, sku);
    res.status(200).json({ message: "We'll email you once, as soon as this size is back in stock." });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: error.issues[0]?.message || 'Please check the details and try again.' });
      return;
    }
    res.status(error instanceof StockAlertError ? error.status : 400).json({ error: error.message });
  }
};
