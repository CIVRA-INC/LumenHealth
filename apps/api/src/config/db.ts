import mongoose from 'mongoose';
import { config } from '@lumen/config';
import { logger } from '../core/logger';

export const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    logger.info('mongodb connected');
  } catch (err) {
    logger.error('database connection failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
};
