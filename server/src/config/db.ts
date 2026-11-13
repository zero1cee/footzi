import mongoose from 'mongoose';
import { isProduction } from './env.js';
import { ensureDefaultCoupons } from '../services/couponService.js';

// Never print credentials embedded in the connection string
const redact = (uri: string): string => uri.replace(/\/\/[^@/]+@/, '//***:***@');

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/footzi';

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
    console.log(`[Footzi DB] MongoDB connected successfully to ${redact(uri)}`);
    await ensureDefaultCoupons().catch((e) => console.error('[Footzi DB] Could not seed default coupons:', e.message));
  } catch (error: any) {
    if (isProduction) {
      // Without a database every request would hang; fail loudly so the host restarts us
      console.error(`[Footzi DB] Could not connect to MongoDB at ${redact(uri)}: ${error.message}`);
      throw error;
    }
    console.warn(`[Footzi DB Warning] Could not connect to MongoDB at ${redact(uri)}. API requests will fail until it is available.`);
  }
};
