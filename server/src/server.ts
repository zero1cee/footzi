import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { validateEnv } from './config/env.js';

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
