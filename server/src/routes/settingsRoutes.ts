import { Router } from 'express';
import { getPublicSettings } from '../controllers/settingsController.js';

const router = Router();
router.get('/', getPublicSettings);

export default router;
