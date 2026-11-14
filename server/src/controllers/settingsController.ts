import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { settingsService } from '../services/settingsService.js';
import { updateSettingsSchema } from '../validators/settingsValidators.js';

/** What the storefront needs: shipping rules, the return window, the banner. Public, and cached for a minute. */
export const getPublicSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.status(200).json(await settingsService.get());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getSettingsAdmin = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.status(200).json(await settingsService.get());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateSettingsAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patch = updateSettingsSchema.parse(req.body);
    const settings = await settingsService.update(patch, req.user?.email);
    res.status(200).json({ message: 'Settings saved. New orders use them straight away; the storefront picks them up within a couple of minutes.', settings });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: error.issues[0]?.message || 'Please check the values', details: error.issues });
      return;
    }
    res.status(400).json({ error: error.message });
  }
};
