"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load Env variables
dotenv_1.default.config();
const db_1 = __importDefault(require("./config/db"));
const seeder_1 = require("./utils/seeder");
const logger_1 = __importDefault(require("./utils/logger"));
const socketService_1 = require("./services/socketService");
const appError_1 = __importDefault(require("./utils/appError"));
const error_1 = __importDefault(require("./middleware/error"));
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
const express_session_1 = __importDefault(require("express-session"));
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// 1) Initialize DB Connection
(0, db_1.default)().then(() => {
    (0, seeder_1.seedDatabase)();
});
// 2) Initialize Socket.io Server
(0, socketService_1.initSocket)(server);
// 3) Global Middlewares
// Security HTTP Headers
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: false, // allow images loading in browser
}));
// CORS configuration (allow client credentials and domain mapping)
const corsOptions = {
    origin: process.env.CLIENT_URL || 'http://localhost:5174',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
};
app.use((0, cors_1.default)(corsOptions));
// Rate limiting: 200 requests per 15 minutes max
const limiter = (0, express_rate_limit_1.default)({
    max: 200,
    windowMs: 15 * 60 * 1000,
    message: 'Too many requests from this IP, please try again in 15 minutes!',
});
app.use('/api', limiter);
// Body parser (reading JSON payloads)
app.use(express_1.default.json({ limit: '10kb' }));
//passport initialization
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
}));
app.use(passport_1.default.initialize());
// Custom lightweight cookie parser middleware
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
// Serve local static uploaded files
app.use('/uploads', express_1.default.static(path_1.default.resolve('uploads')));
// 4) Route Handlers mapping
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
// 5) Global Error handler integration
app.use(error_1.default);
// 6) Spin up server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    logger_1.default.info(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
// Handle unhandled rejections globally
process.on('unhandledRejection', (err) => {
    logger_1.default.error(`UNHANDLED REJECTION! Shutting down server...`);
    logger_1.default.error(`${err.name}: ${err.message}`);
    server.close(() => {
        process.exit(1);
    });
});
