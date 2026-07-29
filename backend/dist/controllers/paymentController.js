"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPayment = exports.createOrder = void 0;
const Driver_1 = __importDefault(require("../models/Driver"));
const User_1 = __importDefault(require("../models/User"));
const appError_1 = __importDefault(require("../utils/appError"));
const crypto_1 = __importDefault(require("crypto"));
const winston_1 = __importDefault(require("winston"));
const razorpay_1 = __importDefault(require("razorpay"));
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.json(),
    transports: [new winston_1.default.transports.Console()],
});
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
        if (driver.approvalStatus !== 'Approved' && driver.approvalStatus !== 'approved') {
            return next(new appError_1.default('Your application has not been approved yet.', 400));
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
        logger.error('Error creating Razorpay order:', error);
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
        logger.info('Payment Successful');
        logger.info('Subscription Activated');
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
