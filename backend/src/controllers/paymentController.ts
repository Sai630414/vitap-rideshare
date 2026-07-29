import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Driver from '../models/Driver';
import User from '../models/User';
import AppError from '../utils/appError';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import logger from '../utils/logger';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

/**
 * POST /api/payments/order
 * Create a mock/real Razorpay order
 */
export const createOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401));
    }

    const driver = await Driver.findOne({ user: req.user._id });
    if (!driver) {
      return next(new AppError('Driver application profile not found', 404));
    }

    if (driver.approvalStatus !== 'Approved' && driver.approvalStatus !== 'approved') {
      return next(new AppError('Your application has not been approved yet.', 400));
    }

    const amount = 50; // standard subscription fee: ₹50
    const currency = 'INR';
    const receipt = `rcpt_${req.user._id}_${Date.now()}`;
    const amountInPaise = amount * 100;

    if (amountInPaise < 100) {
      return next(new AppError('Amount must be at least 100 paise.', 400));
    }

    // Call Razorpay API to create an order
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt,
    });

    res.status(200).json({
      status: 'success',
      data: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      },
    });
  } catch (error: any) {
    logger.error('Error creating Razorpay order:', error);
    next(new AppError(error.message || 'Error creating Razorpay order', 500));
  }
};

/**
 * POST /api/payments/verify
 * Verify payment signature, set subscription active, promote student to driver role
 */
export const verifyPayment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401));
    }

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    const driver = await Driver.findOne({ user: req.user._id });
    if (!driver) {
      return next(new AppError('Driver application profile not found', 404));
    }

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return next(new AppError('Missing required payment fields.', 400));
    }

    // Verify signature
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return next(new AppError('Razorpay secret key not configured on server.', 500));
    }

    const generated_signature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    const isVerified = generated_signature === razorpay_signature;

    if (!isVerified) {
      return next(new AppError('Payment signature verification failed.', 400));
    }

    // Set statuses
    driver.paymentStatus = true;
    driver.subscriptionStatus = 'Active';
    driver.driverStatus = 'ACTIVE';
    await driver.save();

    // Promote User
    const user = await User.findById(req.user._id);
    if (user) {
      user.role = 'driver';
      user.verifiedDriver = true;
      await user.save();
    }

    logger.info('Payment Successful');
    logger.info('Subscription Activated');

    res.status(200).json({
      status: 'success',
      message: 'Payment completed successfully. Your driver account is now active!',
      data: {
        driver,
      },
    });
  } catch (error) {
    next(error);
  }
};
