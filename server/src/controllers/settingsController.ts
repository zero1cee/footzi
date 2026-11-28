import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { settingsService } from '../services/settingsService.js';
import { updateSettingsSchema } from '../validators/settingsValidators.js';
import { cacheService } from '../utils/cache.js';

/** What the storefront needs: shipping rules, the return window, the banner. Public, and cached for a minute with ETag support. */
export const getPublicSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = await settingsService.get();
    const etag = cacheService.generateETag(settings);

    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    res.setHeader('ETag', etag);

    if (cacheService.isFresh(req.headers['if-none-match'] as string, etag)) {
      res.status(304).end();
      return;
    }

    res.status(200).json(settings);
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
