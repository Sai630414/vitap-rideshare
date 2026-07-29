import mongoose from 'mongoose';
import logger from '../utils/logger';

/**
 * Connects to MongoDB database with a retry mechanism.
 * @param retries Maximum number of retry attempts (default: 5)
 * @param delay Delay between attempts in milliseconds (default: 5000)
 */
export const connectDB = async (retries = 5, delay = 5000): Promise<void> => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://database:27017/vit_rideshare';
  mongoose.set('strictQuery', true);

  for (let i = 1; i <= retries; i++) {
    try {
      await mongoose.connect(mongoURI);
      logger.info('Successfully connected to MongoDB database.');
      return;
    } catch (error) {
      logger.error(`MongoDB connection attempt ${i} failed: ${(error as Error).message}`);
      if (i === retries) {
        throw error; // Propagate the error so the main startup logic handles it
      }
      logger.info(`Retrying in ${delay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

export default connectDB;
