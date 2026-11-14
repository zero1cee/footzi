import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import productRoutes from './routes/productRoutes.js';
import authRoutes from './routes/authRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import returnRoutes from './routes/returnRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import stockAlertRoutes from './routes/stockAlertRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestContext } from './middleware/requestContext.js';
import { reportClientError } from './controllers/clientErrorController.js';
import mongoose from 'mongoose';
import { getCorsOrigins, isProduction } from './config/env.js';
import { buildSitemap, injectSeo, publicBaseUrl, robotsTxt, seoForPath } from './services/seoService.js';

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

  app.use(requestContext);

  // Security & Utility Middlewares
  app.use(
    helmet({
      // Razorpay opens its bank / UPI / card-authentication pages in a popup and talks back to the page that
      // opened it. Helmet's default (same-origin) cuts that link, so the popup is blank and the payment fails.
      // same-origin-allow-popups keeps every other protection and lets payment popups reconnect.
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      // Sends only our origin (never a full URL) to other sites, which payment providers expect to see
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
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
  // Text responses (the app's JavaScript and CSS, JSON, HTML) shrink to a quarter of their size on the wire
  app.use(compression());
  app.use(
    cors({
      origin: getCorsOrigins(),
      credentials: true,
    })
  );
  // rawBody is kept so the Razorpay webhook can verify its signature over the exact bytes sent
  const keepRawBody = (req: any, _res: any, buf: Buffer) => {
    req.rawBody = buf;
  };
  // Only the admin image upload needs a large body (a base64 photo). Everything else is capped at
  // 100 kB, which also stops an oversized list from being used to exhaust the server's memory.
  app.use('/api/admin/products/upload-image', express.json({ limit: '8mb', verify: keepRawBody }));
  app.use(express.json({ limit: '100kb', verify: keepRawBody }));
  // Express 5 leaves req.body undefined when a request carries no body; handlers expect an object
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.body === undefined) req.body = {};
    next();
  });
  app.use(express.urlencoded({ extended: true }));
  if (!isTest) {
    morgan.token('id', (req) => (req as Request).id || '-');
    app.use(
      morgan(isProduction ? ':id :remote-addr :method :url :status :res[content-length] :response-time ms ":user-agent"' : 'dev')
    );
  }
  app.use('/images', express.static(path.join(SERVER_ROOT, 'public/images'), { maxAge: '7d' }));

  // Liveness: the process is up. Render's health check uses this, so a database blip never restarts the server.
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'online',
      service: 'Footzi Luxury Footwear API',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      uptimeSeconds: Math.round(process.uptime()),
    });
  });

  // Readiness: the shop can actually take orders, i.e. the database answers. Point your uptime monitor here.
  app.get('/api/ready', async (_req: Request, res: Response) => {
    try {
      if (mongoose.connection.readyState !== 1) throw new Error('database not connected');
      await mongoose.connection.db!.admin().ping();
      res.status(200).json({ status: 'ready', database: 'connected', timestamp: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: 'unavailable', database: 'unreachable', timestamp: new Date().toISOString() });
    }
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
    // Codes can be guessed, so checking one is limited much more tightly than the rest of the API
    app.use(
      '/api/coupons',
      rateLimit({ ...limiterDefaults, windowMs: 15 * 60 * 1000, limit: 40, message: { error: 'Too many coupon attempts. Please try again later.' } })
    );
    // Guests need no account, so placing an order and asking for an order link are limited per address
    app.use(
      '/api/orders/guest',
      rateLimit({ ...limiterDefaults, windowMs: 60 * 60 * 1000, limit: 15, message: { error: 'Too many orders from this connection. Please try again later.' } })
    );
    app.use(
      '/api/orders/lookup',
      rateLimit({ ...limiterDefaults, windowMs: 15 * 60 * 1000, limit: 10, message: { error: 'Too many requests. Please try again shortly.' } })
    );
    app.use(
      '/api/stock-alerts',
      rateLimit({ ...limiterDefaults, windowMs: 60 * 60 * 1000, limit: 20, message: { error: 'Too many requests. Please try again later.' } })
    );
    app.use(
      '/api/client-errors',
      rateLimit({ ...limiterDefaults, windowMs: 15 * 60 * 1000, limit: 30, message: { error: 'Too many reports.' } })
    );
    app.use('/api/auth/login', authLimiter);
    app.use('/api/auth/register', authLimiter);
    app.use('/api/auth/forgot-password', authLimiter);
    app.use('/api/auth/reset-password', authLimiter);
    app.use('/api/auth/change-password', authLimiter);
  }

  // REST API Routes
  app.post('/api/client-errors', reportClientError);
  app.use('/api/products', productRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/returns', returnRoutes);
  app.use('/api/coupons', couponRoutes);
  app.use('/api/wishlist', wishlistRoutes);
  app.use('/api/stock-alerts', stockAlertRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/admin', adminRoutes);

  // Unknown API routes are always JSON 404s
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint route not found' });
  });

  app.get('/robots.txt', (req: Request, res: Response) => {
    res.type('text/plain').set('Cache-Control', 'public, max-age=3600').send(robotsTxt(publicBaseUrl(req)));
  });

  app.get('/sitemap.xml', async (req: Request, res: Response) => {
    try {
      res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(await buildSitemap(publicBaseUrl(req)));
    } catch {
      res.status(503).type('text/plain').send('Sitemap temporarily unavailable');
    }
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
    const indexPath = path.join(CLIENT_DIST, 'index.html');
    const template = fs.readFileSync(indexPath, 'utf8');

    // Every page is served with its own title, description and share tags, so search engines and
    // link previews (WhatsApp, Slack) see the right product without running any JavaScript.
    // Express 5 writes a catch-all as a named wildcard (it also matches the home page)
    app.get('/{*splat}', async (req: Request, res: Response, next: NextFunction) => {
      if (path.extname(req.path)) return next();
      res.setHeader('Cache-Control', 'no-cache');
      try {
        const { seo, status } = await seoForPath(req.path, publicBaseUrl(req));
        res.status(status).type('html').send(injectSeo(template, seo));
      } catch {
        // If the database is unavailable the plain page still loads
        res.sendFile(indexPath);
      }
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
