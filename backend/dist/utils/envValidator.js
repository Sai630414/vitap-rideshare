"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnv = void 0;
const zod_1 = require("zod");
const logger_1 = __importDefault(require("./logger"));
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.string().optional().default('5000'),
    MONGO_URI: zod_1.z.string({ required_error: 'MONGO_URI is required' }),
    JWT_SECRET: zod_1.z.string({ required_error: 'JWT_SECRET is required' }),
    JWT_REFRESH_SECRET: zod_1.z.string({ required_error: 'JWT_REFRESH_SECRET is required' }),
    SESSION_SECRET: zod_1.z.string({ required_error: 'SESSION_SECRET is required' }),
    GOOGLE_CLIENT_ID: zod_1.z.string({ required_error: 'GOOGLE_CLIENT_ID is required' }),
    GOOGLE_CLIENT_SECRET: zod_1.z.string({ required_error: 'GOOGLE_CLIENT_SECRET is required' }),
    BACKEND_URL: zod_1.z.string({ required_error: 'BACKEND_URL is required' }),
    CLIENT_URL: zod_1.z.string({ required_error: 'CLIENT_URL is required' }),
    BREVO_API_KEY: zod_1.z.string({ required_error: 'BREVO_API_KEY is required' }),
    EMAIL_FROM: zod_1.z.string({ required_error: 'EMAIL_FROM is required' }),
    RAZORPAY_KEY_ID: zod_1.z.string({ required_error: 'RAZORPAY_KEY_ID is required' }),
    RAZORPAY_KEY_SECRET: zod_1.z.string({ required_error: 'RAZORPAY_KEY_SECRET is required' }),
});
const validateEnv = () => {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        logger_1.default.error('❌ Environment validation failed! Missing or invalid required variables:');
        result.error.errors.forEach((err) => {
            logger_1.default.error(`  - ${err.path.join('.')}: ${err.message}`);
        });
        process.exit(1);
    }
    logger_1.default.info('✅ Environment variables successfully validated.');
    // Validate Cloudflare R2 configuration
    const hasR2 = process.env.R2_ACCOUNT_ID &&
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY &&
        process.env.R2_BUCKET_NAME &&
        process.env.R2_PUBLIC_URL;
    if (!hasR2) {
        logger_1.default.warn('⚠️ Cloudflare R2 environment credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL) are incomplete.');
    }
    else {
        logger_1.default.info('✅ Cloudflare R2 environment variables configured.');
    }
};
exports.validateEnv = validateEnv;
