import { z } from 'zod';
import logger from './logger';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().optional().default('5000'),
  MONGO_URI: z.string({ required_error: 'MONGO_URI is required' }),
  JWT_SECRET: z.string({ required_error: 'JWT_SECRET is required' }),
  JWT_REFRESH_SECRET: z.string({ required_error: 'JWT_REFRESH_SECRET is required' }),
  SESSION_SECRET: z.string({ required_error: 'SESSION_SECRET is required' }),
  GOOGLE_CLIENT_ID: z.string({ required_error: 'GOOGLE_CLIENT_ID is required' }),
  GOOGLE_CLIENT_SECRET: z.string({ required_error: 'GOOGLE_CLIENT_SECRET is required' }),
  BACKEND_URL: z.string({ required_error: 'BACKEND_URL is required' }),
  CLIENT_URL: z.string({ required_error: 'CLIENT_URL is required' }),
  BREVO_API_KEY: z.string({ required_error: 'BREVO_API_KEY is required' }),
  EMAIL_FROM: z.string({ required_error: 'EMAIL_FROM is required' }),
  RAZORPAY_KEY_ID: z.string({ required_error: 'RAZORPAY_KEY_ID is required' }),
  RAZORPAY_KEY_SECRET: z.string({ required_error: 'RAZORPAY_KEY_SECRET is required' }),
});

export const validateEnv = (): void => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    logger.error('❌ Environment validation failed! Missing or invalid required variables:');
    result.error.errors.forEach((err) => {
      logger.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }

  logger.info('✅ Environment variables successfully validated.');

  // Validate optional Cloudinary configuration
  const hasCloudinary =
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;

  if (!hasCloudinary) {
    logger.warn(
      '⚠️ Cloudinary API keys (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are not configured. Local disk fallback will be used.'
    );
  }
};
