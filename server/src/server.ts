import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { validateEnv } from './config/env.js';
import { orderService } from './services/orderService.js';
import { logEvent } from './middleware/errorHandler.js';

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  validateEnv();

  // Connect database
  await connectDB();

  const app = createApp();

  const server = app.listen(PORT, () => {
    console.log(`[Footzi Server] Listening on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`[Footzi Server] Health check available at http://localhost:${PORT}/api/health`);
  });

  // Release stock held by checkouts that were abandoned before payment
  const sweepExpiredOrders = () =>
    orderService
      .expireStaleOrders()
      .then((count) => {
        if (count > 0) console.log(`[Footzi Orders] Expired ${count} unpaid order(s) and released their stock`);
      })
      .catch((error) => console.error('[Footzi Orders] Expiry sweep failed:', error.message));
  void sweepExpiredOrders();
  setInterval(sweepExpiredOrders, 5 * 60 * 1000).unref();

  // Finish in-flight requests and close the database before the host stops the process
  const shutdown = (signal: string) => {
    console.log(`[Footzi Server] ${signal} received, shutting down gracefully`);
    server.close(async () => {
      await mongoose.connection.close().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer().catch((error) => {
  console.error('[Footzi Server] Failed to start:', error);
  process.exit(1);
});

// A promise nobody handled is a bug worth knowing about, but not worth dropping every customer's request.
// An uncaught exception leaves the process in an unknown state, so it is logged and the host restarts a clean one.
process.on('unhandledRejection', (reason: any) => {
  logEvent('error', 'unhandled_rejection', { message: reason?.message ?? String(reason), stack: reason?.stack });
});
process.on('uncaughtException', (error) => {
  logEvent('error', 'uncaught_exception', { message: error.message, stack: error.stack });
  process.exit(1);
});
