import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import session from 'express-session';
import MongoStore from 'connect-mongo';

// Load Env variables first
dotenv.config();

// Validate Environment Variables
import { validateEnv } from './utils/envValidator';
validateEnv(); // Throws and exits if invalid

import connectDB from './config/db';
import { seedDatabase } from './utils/seeder';
import logger from './utils/logger';
import { initSocket } from './services/socketService';
import AppError from './utils/appError';
import globalErrorHandler from './middleware/error';
import { corsOptions } from './utils/cors';
import { verifyEmailTransporter } from './services/emailService';

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

const app = express();
const server = http.createServer(app);

// Enable trust proxy for Render / Vercel load balancers
app.set('trust proxy', 1);

// 1) Global Middlewares (Security headers first)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow cross-origin resource access
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false, // let default CSP work or skip in dev
  })
);

// Apply CORS options
import cors from 'cors';
app.use(cors(corsOptions));

// Rate limiting: 200 requests per 15 minutes max (applied before body parsing)
const limiter = rateLimit({
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

// Body parser (reading JSON payloads)
app.use(express.json({ limit: '10kb' }));

// Passport & Production-ready session initialization
app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
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
  })
);

app.use(passport.initialize());

// Serve local static uploaded files
app.use('/uploads', express.static(path.resolve('uploads')));

// Health check endpoint for deployment monitoring
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Backend is healthy and running.',
    timestamp: new Date(),
    uptime: process.uptime(),
  });
});

// 2) Route Handlers mapping
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

// 3) Global Error handler integration
app.use(globalErrorHandler);

// 4) Async Startup Sequence
const startServer = async () => {
  try {
    // Connect to database (with retry mechanism)
    await connectDB();

    // Run database seeder
    await seedDatabase();

    // Verify SMTP configuration
    await verifyEmailTransporter();

    // Initialize Socket.io Server
    initSocket(server);

    // Spin up HTTP Server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      logger.info(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Startup sequence aborted due to critical error:', error);
    process.exit(1);
  }
};

startServer();

// 5) Handle Uncaught Exceptions globally
process.on('uncaughtException', (err: Error) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down server...');
  logger.error(`${err.name}: ${err.message}`);
  logger.error(err.stack || '');
  process.exit(1);
});

// Handle Unhandled Rejections globally
process.on('unhandledRejection', (err: Error) => {
  logger.error('UNHANDLED REJECTION! Shutting down server...');
  logger.error(`${err.name}: ${err.message}`);
  logger.error(err.stack || '');
  server.close(() => {
    process.exit(1);
  });
});

// Graceful Shutdown Handler for SIGTERM & SIGINT (essential for Render redeployments)
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(async () => {
    logger.info('HTTP and WebSocket servers closed.');
    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed successfully.');
      process.exit(0);
    } catch (err) {
      logger.error('Error closing MongoDB connection:', err);
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds if connections are hanging
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
