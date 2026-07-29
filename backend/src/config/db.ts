import mongoose from 'mongoose';
import logger from '../utils/logger';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://database:27017/vit_rideshare';
    
    mongoose.set('strictQuery', true);
    
    await mongoose.connect(mongoURI);
    
    logger.info('Successfully connected to MongoDB database.');
  } catch (error) {
    logger.error(`MongoDB connection error: ${(error as Error).message}`);
    process.exit(1);
  }
};

export default connectDB;
