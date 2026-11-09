import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/footzi';

  try {
    await mongoose.connect(uri);
    console.log(`[Footzi DB] MongoDB connected successfully to ${uri}`);
  } catch (error) {
    console.warn(`[Footzi DB Warning] Could not connect to MongoDB at ${uri}. Running in in-memory / simulated mode.`);
  }
};
