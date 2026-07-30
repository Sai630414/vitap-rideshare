"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyBookingPayment = exports.createBookingOrder = exports.refundPayment = exports.verifyPaymentDirect = exports.createOrderDirect = exports.verifyPayment = exports.createOrder = void 0;
const Driver_1 = __importDefault(require("../models/Driver"));
const User_1 = __importDefault(require("../models/User"));
const Booking_1 = __importDefault(require("../models/Booking"));
const appError_1 = __importDefault(require("../utils/appError"));
const crypto_1 = __importDefault(require("crypto"));
const razorpay_1 = __importDefault(require("razorpay"));
const logger_1 = __importDefault(require("../utils/logger"));
const notificationController_1 = require("./notificationController");
const razorpay = new razorpay_1.default({
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});
/**
 * POST /api/payments/order
 * Create a mock/real Razorpay order
 */
const createOrder = async (req, res, next) => {
    try {
        if (!req.user) {
            return next(new appError_1.default('Unauthorized', 401));
        }
        const driver = await Driver_1.default.findOne({ user: req.user._id });
        if (!driver) {
            return next(new appError_1.default('Driver application profile not found', 404));
        }
        if (driver.approvalStatus !== 'approved') {
            return next(new appError_1.default('Your application has not been approved yet.', 400));
        }
        if (driver.paymentStatus && driver.subscriptionStatus === 'Active') {
            return next(new appError_1.default('Subscription is already active. No payment required.', 400));
        }
        const amount = 50; // standard subscription fee: ₹50
        const currency = 'INR';
        const receipt = `rcpt_${req.user._id}_${Date.now()}`;
        const amountInPaise = amount * 100;
        if (amountInPaise < 100) {
            return next(new appError_1.default('Amount must be at least 100 paise.', 400));
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
    }
    catch (error) {
        logger_1.default.error('Error creating Razorpay order:', error);
        next(new appError_1.default(error.message || 'Error creating Razorpay order', 500));
    }
};
exports.createOrder = createOrder;
/**
 * POST /api/payments/verify
 * Verify payment signature, set subscription active, promote student to driver role
 */
const verifyPayment = async (req, res, next) => {
    try {
        if (!req.user) {
            return next(new appError_1.default('Unauthorized', 401));
        }
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
        const driver = await Driver_1.default.findOne({ user: req.user._id });
        if (!driver) {
            return next(new appError_1.default('Driver application profile not found', 404));
        }
        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
            return next(new appError_1.default('Missing required payment fields.', 400));
        }
        // Verify signature
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!keySecret) {
            return next(new appError_1.default('Razorpay secret key not configured on server.', 500));
        }
        const generated_signature = crypto_1.default
            .createHmac('sha256', keySecret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');
        const isVerified = generated_signature === razorpay_signature;
        if (!isVerified) {
            return next(new appError_1.default('Payment signature verification failed.', 400));
        }
        if (driver.approvalStatus !== 'approved') {
            return next(new appError_1.default('Your application has not been approved yet.', 400));
        }
        if (driver.paymentStatus && driver.subscriptionStatus === 'Active' && driver.driverStatus === 'ACTIVE') {
            res.status(200).json({
                status: 'success',
                message: 'Subscription already active.',
                data: { driver },
            });
            return;
        }
        // Set statuses
        driver.paymentStatus = true;
        driver.subscriptionStatus = 'Active';
        driver.driverStatus = 'ACTIVE';
        await driver.save();
        // Promote User
        const user = await User_1.default.findById(req.user._id);
        if (user) {
            user.role = 'driver';
            user.verifiedDriver = true;
            await user.save();
        }
        logger_1.default.info('Payment Successful');
        logger_1.default.info('Subscription Activated');
        res.status(200).json({
            status: 'success',
            message: 'Payment completed successfully. Your driver account is now active!',
            data: {
                driver,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.verifyPayment = verifyPayment;
/**
 * POST /api/create-order
 * Create a Razorpay order for driver subscription only (fixed amount)
 */
const createOrderDirect = async (req, res, next) => {
    try {
        if (!req.user) {
            return next(new appError_1.default('Unauthorized', 401));
        }
        const driver = await Driver_1.default.findOne({ user: req.user._id });
        if (!driver) {
            return next(new appError_1.default('Driver application profile not found', 404));
        }
        if (driver.approvalStatus !== 'approved') {
            return next(new appError_1.default('Your application has not been approved yet.', 400));
        }
        if (driver.paymentStatus && driver.subscriptionStatus === 'Active') {
            return next(new appError_1.default('Subscription is already active.', 400));
        }
        // Fixed subscription fee — ignore arbitrary client amounts
        const amountInPaise = 50 * 100;
        const currency = 'INR';
        const receipt = `rcpt_${req.user._id}_${Date.now()}`;
        let order;
        try {
            order = await razorpay.orders.create({
                amount: amountInPaise,
                currency,
                receipt,
            });
        }
        catch (razorpayError) {
            logger_1.default.error('Razorpay Order Creation API error:', razorpayError);
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
    }
    catch (error) {
        logger_1.default.error('Unexpected error in createOrderDirect:', error);
        next(new appError_1.default(error.message || 'Unexpected exception during order creation.', 500));
    }
};
exports.createOrderDirect = createOrderDirect;
/**
 * POST /api/verify-payment
 * Verify signature, update payment status if applicable
 */
const verifyPaymentDirect = async (req, res, next) => {
    try {
        if (!req.user) {
            return next(new appError_1.default('Unauthorized', 401));
        }
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return next(new appError_1.default('Missing required payment fields.', 400));
        }
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!keySecret) {
            logger_1.default.error('RAZORPAY_KEY_SECRET is not configured on the server.');
            return next(new appError_1.default('Razorpay configuration secret key is missing.', 500));
        }
        // Verify signature
        const generated_signature = crypto_1.default
            .createHmac('sha256', keySecret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');
        const isVerified = generated_signature === razorpay_signature;
        if (!isVerified) {
            logger_1.default.warn('Payment verification signature check failed.');
            res.status(400).json({
                status: 'fail',
                message: 'Payment signature verification failed.',
            });
            return;
        }
        const driver = await Driver_1.default.findOne({ user: req.user._id });
        if (!driver) {
            return next(new appError_1.default('Driver application profile not found. You must apply first.', 404));
        }
        if (driver.approvalStatus !== 'approved') {
            return next(new appError_1.default('Your driver profile has not been approved by an administrator yet.', 400));
        }
        if (driver.paymentStatus && driver.subscriptionStatus === 'Active' && driver.driverStatus === 'ACTIVE') {
            res.status(200).json({
                status: 'success',
                message: 'Payment completed successfully. Your driver account is now active!',
            });
            return;
        }
        driver.paymentStatus = true;
        driver.subscriptionStatus = 'Active';
        driver.driverStatus = 'ACTIVE';
        await driver.save();
        logger_1.default.info(`Updated driver payment status for user ${req.user._id}`);
        const user = await User_1.default.findById(req.user._id);
        if (user) {
            user.role = 'driver';
            user.verifiedDriver = true;
            await user.save();
            logger_1.default.info(`Promoted user ${req.user._id} to driver role`);
        }
        logger_1.default.info(`Payment verification succeeded for order: ${razorpay_order_id}`);
        res.status(200).json({
            status: 'success',
            message: 'Payment completed successfully. Your driver account is now active!',
        });
    }
    catch (error) {
        logger_1.default.error('Unexpected error during signature verification:', error);
        next(new appError_1.default(error.message || 'Unexpected exception during payment verification.', 500));
    }
};
exports.verifyPaymentDirect = verifyPaymentDirect;
/**
 * Helper to process refund via Razorpay (or mock in development)
 */
const refundPayment = async (paymentId, amountInPaise) => {
    try {
        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!keyId || !keySecret || (keyId.includes('test') && !keySecret)) {
            logger_1.default.info(`[Simulation Refund] Refunding payment ${paymentId} with amount ₹${amountInPaise / 100} successfully.`);
            return true;
        }
        const clientRazorpay = new razorpay_1.default({ key_id: keyId, key_secret: keySecret });
        await clientRazorpay.payments.refund(paymentId, { amount: amountInPaise });
        logger_1.default.info(`[Razorpay Refund] Payment ${paymentId} refunded successfully with amount ₹${amountInPaise / 100}.`);
        return true;
    }
    catch (error) {
        logger_1.default.error(`[Razorpay Refund Error] Failed to refund payment ${paymentId}:`, error);
        return false;
    }
};
exports.refundPayment = refundPayment;
/**
 * POST /api/payments/booking/:bookingId/order
 * Create a Razorpay order for an accepted booking
 */
const createBookingOrder = async (req, res, next) => {
    try {
        if (!req.user) {
            return next(new appError_1.default('Unauthorized', 401));
        }
        const { bookingId } = req.params;
        const booking = await Booking_1.default.findById(bookingId).populate('ride');
        if (!booking) {
            return next(new appError_1.default('Booking not found', 404));
        }
        // Verify ownership
        if (booking.passenger.toString() !== req.user._id.toString()) {
            return next(new appError_1.default('You are not authorized to make a payment for this booking', 403));
        }
        if (booking.status !== 'accepted') {
            return next(new appError_1.default('You can only pay for accepted bookings', 400));
        }
        if (booking.paymentStatus === 'paid') {
            return next(new appError_1.default('This booking is already paid', 400));
        }
        const ride = booking.ride;
        if (!ride) {
            return next(new appError_1.default('Ride details not found', 404));
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
    }
    catch (error) {
        logger_1.default.error('Error creating booking Razorpay order:', error);
        next(new appError_1.default(error.message || 'Error creating booking payment order', 500));
    }
};
exports.createBookingOrder = createBookingOrder;
/**
 * POST /api/payments/booking/:bookingId/verify
 * Verify Razorpay payment signature for ride booking
 */
const verifyBookingPayment = async (req, res, next) => {
    try {
        if (!req.user) {
            return next(new appError_1.default('Unauthorized', 401));
        }
        const { bookingId } = req.params;
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
        const booking = await Booking_1.default.findById(bookingId).populate('ride');
        if (!booking) {
            return next(new appError_1.default('Booking not found', 404));
        }
        // Verify ownership
        if (booking.passenger.toString() !== req.user._id.toString()) {
            return next(new appError_1.default('Unauthorized', 403));
        }
        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
            return next(new appError_1.default('Missing required payment fields.', 400));
        }
        // Verify signature
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!keySecret) {
            return next(new appError_1.default('Razorpay secret key not configured on server.', 500));
        }
        const generated_signature = crypto_1.default
            .createHmac('sha256', keySecret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');
        const isVerified = generated_signature === razorpay_signature;
        if (!isVerified) {
            return next(new appError_1.default('Payment signature verification failed.', 400));
        }
        // Bind payment to the order created for this booking
        if (booking.razorpayOrderId && booking.razorpayOrderId !== razorpay_order_id) {
            return next(new appError_1.default('Payment order does not match this booking.', 400));
        }
        if (booking.paymentStatus === 'paid') {
            res.status(200).json({
                status: 'success',
                message: 'Booking is already paid.',
                data: { booking },
            });
            return;
        }
        if (booking.status !== 'accepted') {
            return next(new appError_1.default('You can only pay for accepted bookings', 400));
        }
        // Set statuses
        booking.paymentStatus = 'paid';
        booking.razorpayPaymentId = razorpay_payment_id;
        booking.razorpayOrderId = razorpay_order_id;
        await booking.save();
        const ride = booking.ride;
        // Send notifications to driver and passenger
        await (0, notificationController_1.sendNotificationToUser)(booking.driver.toString(), 'Booking Paid 🎉', `${req.user.name} has paid for the ${booking.seatNumber} seat(s) on your ride to ${ride?.destination || 'destination'}.`, 'booking_request', booking._id);
        await (0, notificationController_1.sendNotificationToUser)(booking.passenger.toString(), 'Payment Confirmed 🚗', `Your payment for the ride to ${ride?.destination || 'destination'} was verified successfully.`, 'ride_accepted', booking._id);
        logger_1.default.info(`Booking payment successful for booking: ${bookingId}`);
        res.status(200).json({
            status: 'success',
            message: 'Booking payment completed successfully!',
            data: {
                booking,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.verifyBookingPayment = verifyBookingPayment;
