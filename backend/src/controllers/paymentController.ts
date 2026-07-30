import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Driver from '../models/Driver';
import User from '../models/User';
import Booking from '../models/Booking';
import Ride from '../models/Ride';
import AppError from '../utils/appError';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import logger from '../utils/logger';
import { sendNotificationToUser } from './notificationController';

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

/**
 * POST /api/create-order
 * Create a Razorpay order from requested amount
 */
export const createOrderDirect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401));
    }

    const { amount } = req.body;

    // Validate amount
    if (amount === undefined || amount === null) {
      return next(new AppError('Amount is required.', 400));
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount)) {
      return next(new AppError('Amount must be a number.', 400));
    }

    if (numericAmount < 100) {
      return next(new AppError('Amount must be at least 100 paise.', 400));
    }

    const currency = 'INR';
    const receipt = `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Call Razorpay API
    let order;
    try {
      order = await razorpay.orders.create({
        amount: numericAmount,
        currency,
        receipt,
      });
    } catch (razorpayError: any) {
      logger.error('Razorpay Order Creation API error:', razorpayError);
      
      // Handle Razorpay authentication errors specifically
      if (razorpayError.statusCode === 401 || (razorpayError.message && razorpayError.message.includes('auth'))) {
        res.status(401).json({
          status: 'fail',
          message: 'Razorpay authentication failed. Check API credentials.',
        });
        return;
      }
      res.status(razorpayError.statusCode || 502).json({
        status: 'fail',
        message: razorpayError.message || 'Razorpay order creation failed.',
      });
      return;
    }

    res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error: any) {
    logger.error('Unexpected error in createOrderDirect:', error);
    next(new AppError(error.message || 'Unexpected exception during order creation.', 500));
  }
};

/**
 * POST /api/verify-payment
 * Verify signature, update payment status if applicable
 */
export const verifyPaymentDirect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401));
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return next(new AppError('Missing required payment fields.', 400));
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      logger.error('RAZORPAY_KEY_SECRET is not configured on the server.');
      return next(new AppError('Razorpay configuration secret key is missing.', 500));
    }

    // Verify signature
    const generated_signature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const isVerified = generated_signature === razorpay_signature;

    if (!isVerified) {
      logger.warn('Payment verification signature check failed.');
      res.status(400).json({
        status: 'fail',
        message: 'Payment signature verification failed.',
      });
      return;
    }

    // Update existing payment status if applicable
    const driver = await Driver.findOne({ user: req.user._id });
    if (!driver) {
      return next(new AppError('Driver application profile not found. You must apply first.', 404));
    }

    if (driver.approvalStatus !== 'Approved' && driver.approvalStatus !== 'approved') {
      return next(new AppError('Your driver profile has not been approved by an administrator yet.', 400));
    }

    driver.paymentStatus = true;
    driver.subscriptionStatus = 'Active';
    driver.driverStatus = 'ACTIVE';
    await driver.save();
    logger.info(`Updated driver payment status for user ${req.user._id}`);

    const user = await User.findById(req.user._id);
    if (user) {
      user.role = 'driver';
      user.verifiedDriver = true;
      await user.save();
      logger.info(`Promoted user ${req.user._id} to driver role`);
    }

    logger.info(`Payment verification succeeded for order: ${razorpay_order_id}`);

    res.status(200).json({
      status: 'success',
      message: 'Payment completed successfully. Your driver account is now active!',
    });
  } catch (error: any) {
    logger.error('Unexpected error during signature verification:', error);
    next(new AppError(error.message || 'Unexpected exception during payment verification.', 500));
  }
};

/**
 * Helper to process refund via Razorpay (or mock in development)
 */
export const refundPayment = async (paymentId: string, amountInPaise: number): Promise<boolean> => {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret || (keyId.includes('test') && !keySecret)) {
      logger.info(`[Simulation Refund] Refunding payment ${paymentId} with amount ₹${amountInPaise / 100} successfully.`);
      return true;
    }

    const clientRazorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    await clientRazorpay.payments.refund(paymentId, { amount: amountInPaise });
    logger.info(`[Razorpay Refund] Payment ${paymentId} refunded successfully with amount ₹${amountInPaise / 100}.`);
    return true;
  } catch (error) {
    logger.error(`[Razorpay Refund Error] Failed to refund payment ${paymentId}:`, error);
    return false;
  }
};

/**
 * POST /api/payments/booking/:bookingId/order
 * Create a Razorpay order for an accepted booking
 */
export const createBookingOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401));
    }

    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId).populate('ride');

    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    // Verify ownership
    if (booking.passenger.toString() !== req.user._id.toString()) {
      return next(new AppError('You are not authorized to make a payment for this booking', 403));
    }

    if (booking.status !== 'accepted') {
      return next(new AppError('You can only pay for accepted bookings', 400));
    }

    if (booking.paymentStatus === 'paid') {
      return next(new AppError('This booking is already paid', 400));
    }

    const ride = booking.ride as any;
    if (!ride) {
      return next(new AppError('Ride details not found', 404));
    }

    const totalAmount = booking.seatNumber * ride.price;
    const amountInPaise = totalAmount * 100;
    const currency = 'INR';
    const receipt = `rcpt_booking_${booking._id}_${Date.now()}`;

    // Call Razorpay API
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt,
    });

    // Save order ID on booking
    booking.razorpayOrderId = order.id;
    await booking.save();

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
    logger.error('Error creating booking Razorpay order:', error);
    next(new AppError(error.message || 'Error creating booking payment order', 500));
  }
};

/**
 * POST /api/payments/booking/:bookingId/verify
 * Verify Razorpay payment signature for ride booking
 */
export const verifyBookingPayment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401));
    }

    const { bookingId } = req.params;
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    const booking = await Booking.findById(bookingId).populate('ride');
    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    // Verify ownership
    if (booking.passenger.toString() !== req.user._id.toString()) {
      return next(new AppError('Unauthorized', 403));
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
    booking.paymentStatus = 'paid';
    booking.razorpayPaymentId = razorpay_payment_id;
    booking.razorpayOrderId = razorpay_order_id;
    await booking.save();

    const ride = booking.ride as any;

    // Send notifications to driver and passenger
    await sendNotificationToUser(
      booking.driver.toString(),
      'Booking Paid 🎉',
      `${req.user.name} has paid for the ${booking.seatNumber} seat(s) on your ride to ${ride?.destination || 'destination'}.`,
      'booking_request',
      booking._id
    );

    await sendNotificationToUser(
      booking.passenger.toString(),
      'Payment Confirmed 🚗',
      `Your payment for the ride to ${ride?.destination || 'destination'} was verified successfully.`,
      'ride_accepted',
      booking._id
    );

    logger.info(`Booking payment successful for booking: ${bookingId}`);

    res.status(200).json({
      status: 'success',
      message: 'Booking payment completed successfully!',
      data: {
        booking,
      },
    });
  } catch (error) {
    next(error);
  }
};

