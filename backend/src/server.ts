import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';

// Load Env variables
dotenv.config();

import connectDB from './config/db';
import { seedDatabase } from './utils/seeder';
import logger from './utils/logger';
import { initSocket } from './services/socketService';
import AppError from './utils/appError';
import globalErrorHandler from './middleware/error';

// Import Route modules
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import vehicleRoutes from './routes/vehicles';
import licenceRoutes from './routes/licences';
import rideRoutes from './routes/rides';
import bookingRoutes from './routes/bookings';
import reviewRoutes from './routes/reviews';
import chatRoutes from './routes/chat';
import notificationRoutes from './routes/notifications';
import adminRoutes from './routes/admin';
import paymentRoutes from './routes/payments';
import passport from './config/passport';
import session from "express-session";

const app = express();
const server = http.createServer(app);

// 1) Initialize DB Connection
connectDB().then(() => {
  seedDatabase();
});

// 2) Initialize Socket.io Server
initSocket(server);



// 3) Global Middlewares
// Security HTTP Headers
app.use(
  helmet({
    crossOriginResourcePolicy: false, // allow images loading in browser
  })
);

// CORS configuration (allow client credentials and domain mapping)
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5174',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
};
app.use(cors(corsOptions));

// Rate limiting: 200 requests per 15 minutes max
const limiter = rateLimit({
  max: 200,
  windowMs: 15 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in 15 minutes!',
});
app.use('/api', limiter);

// Body parser (reading JSON payloads)
app.use(express.json({ limit: '10kb' }));

//passport initialization
app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());


// Custom lightweight cookie parser middleware
app.use((req: any, _res: Response, next: NextFunction) => {
  const cookieHeader = req.headers.cookie || '';
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((cookie: string) => {
    const parts = cookie.split('=');
    if (parts.length === 2) {
      cookies[parts[0].trim()] = parts[1].trim();
    }
  });
  req.cookies = cookies;
  next();
});

// Serve local static uploaded files
app.use('/uploads', express.static(path.resolve('uploads')));

// 4) Route Handlers mapping
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/licences', licenceRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

// Fallback Route handler for 404
app.all('*', (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// 5) Global Error handler integration
app.use(globalErrorHandler);

// 6) Spin up server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled rejections globally
process.on('unhandledRejection', (err: Error) => {
  logger.error(`UNHANDLED REJECTION! Shutting down server...`);
  logger.error(`${err.name}: ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});
