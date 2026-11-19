import dotenv from 'dotenv';
dotenv.config({ quiet: true }); // dotenv 17 prints a tip on every start unless told to be quiet

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';

/**
 * Ensures the public read-only demo admin exists in the database.
 * Safe to run against any database without overwriting real customer data.
 */
export const ensureDemoAdminUser = async (): Promise<void> => {
  const existing = await User.findOne({ email: 'demo-admin@footzi.in' });
  if (existing) return;

  const passwordHash = await bcrypt.hash('Footzi@2026', await bcrypt.genSalt(10));

  await User.findOneAndUpdate(
    { email: 'demo-admin@footzi.in' },
    {
      name: 'Demo Admin',
      email: 'demo-admin@footzi.in',
      passwordHash,
      role: 'demo_admin',
      addresses: [],
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  console.log('[Demo Admin] demo-admin@footzi.in is ready (read-only, password: Footzi@2026)');
};

const run = async () => {
  await connectDB();
  await ensureDemoAdminUser();
  await mongoose.connection.close();
  process.exit(0);
};

// Run automatically when executed directly via CLI
if (process.argv[1] && process.argv[1].includes('ensureDemoAdmin')) {
  run().catch((error) => {
    console.error('[Demo Admin Error]', error);
    process.exit(1);
  });
}
