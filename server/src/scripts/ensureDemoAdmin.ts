import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';

/**
 * Adds (or resets) the public read-only demo admin without touching any other data,
 * so it is safe to run against a database that already has real customers.
 */
const run = async () => {
  await connectDB();
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
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log('[Demo Admin] demo-admin@footzi.in is ready (read-only, password: Footzi@2026)');
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((error) => {
  console.error('[Demo Admin Error]', error);
  process.exit(1);
});
