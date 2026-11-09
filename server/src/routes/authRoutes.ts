import { Router } from 'express';
import { register, login, logout, getMe, addAddress } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Public auth endpoints
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// Protected endpoints
router.get('/me', authenticate, getMe);
router.post('/addresses', authenticate, addAddress);

export default router;
