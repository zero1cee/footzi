import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import productRoutes from './routes/productRoutes.js';
import authRoutes from './routes/authRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import returnRoutes from './routes/returnRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { getCorsOrigins, isProduction } from './config/env.js';

// Resolved from this file rather than process.cwd(), so the server works
// whichever directory it is started from (src/ in dev, dist/ in production).
const SERVER_ROOT = path.resolve(__dirname, '..');
const CLIENT_DIST = path.resolve(SERVER_ROOT, '../client/dist');

export const createApp = (): Express => {
  const app = express();
  const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

  // Render (and most hosts) terminate TLS at a proxy; trust it so rate limiting
  // and logging see the real client IP.
  app.set('trust proxy', 1);

  // Security & Utility Middlewares
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'https://checkout.razorpay.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          connectSrc: ["'self'", 'https://api.razorpay.com', 'https://lumberjack.razorpay.com'],
          frameSrc: ['https://api.razorpay.com', 'https://checkout.razorpay.com'],
          objectSrc: ["'none'"],
        },
      },
    })
  );
  app.use(
    cors({
      origin: getCorsOrigins(),
      credentials: true,
    })
  );
  // rawBody is kept so the Razorpay webhook can verify its signature over the exact bytes sent
  app.use(
    express.json({
      limit: '8mb', // admin image upload sends base64 data
      verify: (req, _res, buf) => {
        (req as any).rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true }));
  if (!isTest) {
    app.use(morgan(isProduction ? 'combined' : 'dev'));
  }
  app.use('/images', express.static(path.join(SERVER_ROOT, 'public/images'), { maxAge: '7d' }));

  // Healthcheck Endpoint (not rate limited; used by the host's health probe)
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'online',
      service: 'Footzi Luxury Footwear API',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // Rate limiting: a general ceiling for the API and a strict one for credential endpoints
  if (!isTest) {
    const limiterDefaults = { standardHeaders: true, legacyHeaders: false } as const;
    app.use(
      '/api',
      rateLimit({
        ...limiterDefaults,
        windowMs: 15 * 60 * 1000,
        limit: 600,
        message: { error: 'Too many requests. Please try again shortly.' },
      })
    );
    const authLimiter = rateLimit({
      ...limiterDefaults,
      windowMs: 15 * 60 * 1000,
      limit: 20,
      message: { error: 'Too many sign-in attempts. Please try again in 15 minutes.' },
    });
    app.use('/api/auth/login', authLimiter);
    app.use('/api/auth/register', authLimiter);
  }

  // REST API Routes
  app.use('/api/products', productRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/returns', returnRoutes);
  app.use('/api/admin', adminRoutes);

  // Unknown API routes are always JSON 404s
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint route not found' });
  });

  // Serve the built React client from the same origin when it exists, with an
  // SPA fallback so deep links such as /product/:slug survive a page refresh.
  if (fs.existsSync(path.join(CLIENT_DIST, 'index.html'))) {
    app.use(
      express.static(CLIENT_DIST, {
        index: false,
        setHeaders: (res, filePath) => {
          // Vite fingerprints everything under /assets, so it is safe to cache forever
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      })
    );
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' || path.extname(req.path)) return next();
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(CLIENT_DIST, 'index.html'));
    });
  }

  // 404 Handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint route not found' });
  });

  // Central Error Handler
  app.use(errorHandler);

  return app;
};
