import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect database
  await connectDB();

  const app = createApp();

  app.listen(PORT, () => {
    console.log(`[Footzi Server] Listening on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`[Footzi Server] Health check available at http://localhost:${PORT}/api/health`);
  });
};

startServer();
