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
    // Validate optional Cloudinary configuration
    const hasCloudinary = process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET;
    if (!hasCloudinary) {
        logger_1.default.warn('⚠️ Cloudinary API keys (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are not configured. Local disk fallback will be used.');
    }
};
exports.validateEnv = validateEnv;
