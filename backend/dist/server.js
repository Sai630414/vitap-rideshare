"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const express_session_1 = __importDefault(require("express-session"));
const connect_mongo_1 = __importDefault(require("connect-mongo"));
// Load Env variables first
dotenv_1.default.config();
// Validate Environment Variables
const envValidator_1 = require("./utils/envValidator");
(0, envValidator_1.validateEnv)(); // Throws and exits if invalid
const db_1 = __importDefault(require("./config/db"));
const seeder_1 = require("./utils/seeder");
const logger_1 = __importDefault(require("./utils/logger"));
const socketService_1 = require("./services/socketService");
const appError_1 = __importDefault(require("./utils/appError"));
const error_1 = __importDefault(require("./middleware/error"));
const cors_1 = require("./utils/cors");
const emailService_1 = require("./services/emailService");
// Import Route modules
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const vehicles_1 = __importDefault(require("./routes/vehicles"));
const licences_1 = __importDefault(require("./routes/licences"));
const rides_1 = __importDefault(require("./routes/rides"));
const bookings_1 = __importDefault(require("./routes/bookings"));
const reviews_1 = __importDefault(require("./routes/reviews"));
const chat_1 = __importDefault(require("./routes/chat"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const admin_1 = __importDefault(require("./routes/admin"));
const payments_1 = __importDefault(require("./routes/payments"));
const passport_1 = __importDefault(require("./config/passport"));
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// Enable trust proxy for Render / Vercel load balancers
app.set('trust proxy', 1);
// 1) Global Middlewares (Security headers first)
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow cross-origin resource access
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false, // let default CSP work or skip in dev
}));
// Apply CORS options
const cors_2 = __importDefault(require("cors"));
app.use((0, cors_2.default)(cors_1.corsOptions));
// Rate limiting: 200 requests per 15 minutes max (applied before body parsing)
const limiter = (0, express_rate_limit_1.default)({
    max: 200,
    windowMs: 15 * 60 * 1000,
    message: {
        status: 'fail',
        message: 'Too many requests from this IP, please try again in 15 minutes!',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', limiter);
// Custom lightweight cookie parser middleware (moved up before session)
app.use((req, _res, next) => {
    const cookieHeader = req.headers.cookie || '';
    const cookies = {};
    cookieHeader.split(';').forEach((cookie) => {
        const parts = cookie.split('=');
        if (parts.length === 2) {
            cookies[parts[0].trim()] = parts[1].trim();
        }
    });
    req.cookies = cookies;
    next();
});
// Body parser (reading JSON payloads)
app.use(express_1.default.json({ limit: '10kb' }));
// Passport & Production-ready session initialization
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: connect_mongo_1.default.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions',
        ttl: 7 * 24 * 60 * 60, // 7 days (matching JWT refresh token lifespan)
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
}));
app.use(passport_1.default.initialize());
// Serve local static uploaded files
app.use('/uploads', express_1.default.static(path_1.default.resolve('uploads')));
// Health check endpoint for deployment monitoring
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Backend is healthy and running.',
        timestamp: new Date(),
        uptime: process.uptime(),
    });
});
// 2) Route Handlers mapping
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/vehicles', vehicles_1.default);
app.use('/api/licences', licences_1.default);
app.use('/api/rides', rides_1.default);
app.use('/api/bookings', bookings_1.default);
app.use('/api/reviews', reviews_1.default);
app.use('/api/chat', chat_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/payments', payments_1.default);
// Fallback Route handler for 404
app.all('*', (req, _res, next) => {
    next(new appError_1.default(`Can't find ${req.originalUrl} on this server!`, 404));
});
// 3) Global Error handler integration
app.use(error_1.default);
// 4) Async Startup Sequence
const startServer = async () => {
    try {
        // Connect to database (with retry mechanism)
        await (0, db_1.default)();
        // Run database seeder
        await (0, seeder_1.seedDatabase)();
        // Verify SMTP configuration
        await (0, emailService_1.verifyEmailTransporter)();
        // Initialize Socket.io Server
        (0, socketService_1.initSocket)(server);
        // Spin up HTTP Server
        const PORT = process.env.PORT || 5000;
        server.listen(PORT, () => {
            logger_1.default.info(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
        });
    }
    catch (error) {
        logger_1.default.error('Startup sequence aborted due to critical error:', error);
        process.exit(1);
    }
};
startServer();
// 5) Handle Uncaught Exceptions globally
process.on('uncaughtException', (err) => {
    logger_1.default.error('UNCAUGHT EXCEPTION! Shutting down server...');
    logger_1.default.error(`${err.name}: ${err.message}`);
    logger_1.default.error(err.stack || '');
    process.exit(1);
});
// Handle Unhandled Rejections globally
process.on('unhandledRejection', (err) => {
    logger_1.default.error('UNHANDLED REJECTION! Shutting down server...');
    logger_1.default.error(`${err.name}: ${err.message}`);
    logger_1.default.error(err.stack || '');
    server.close(() => {
        process.exit(1);
    });
});
// Graceful Shutdown Handler for SIGTERM & SIGINT (essential for Render redeployments)
const gracefulShutdown = (signal) => {
    logger_1.default.info(`Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
        logger_1.default.info('HTTP and WebSocket servers closed.');
        try {
            await mongoose_1.default.connection.close();
            logger_1.default.info('MongoDB connection closed successfully.');
            process.exit(0);
        }
        catch (err) {
            logger_1.default.error('Error closing MongoDB connection:', err);
            process.exit(1);
        }
    });
    // Force shutdown after 10 seconds if connections are hanging
    setTimeout(() => {
        logger_1.default.error('Could not close connections in time, forcefully shutting down.');
        process.exit(1);
    }, 10000);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
