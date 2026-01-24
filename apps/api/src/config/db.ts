import mongoose from 'mongoose';
import { config } from '@lumen/config';

export const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  }
};
