"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Booking = void 0;
const mongoose_1 = require("mongoose");
const bookingSchema = new mongoose_1.Schema({
    ride: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Ride',
        required: [true, 'Ride reference is required'],
        index: true,
    },
    passenger: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Passenger reference is required'],
        index: true,
    },
    driver: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Driver reference is required'],
        index: true,
    },
    pickup: {
        type: String,
        required: [true, 'Pickup point address is required'],
        trim: true,
    },
    drop: {
        type: String,
        required: [true, 'Drop point address is required'],
        trim: true,
    },
    message: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed', 'expired'],
        default: 'pending',
        index: true,
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'refunded'],
        default: 'pending',
    },
    seatNumber: {
        type: Number,
        default: 1,
        min: [1, 'Seat count must be at least 1'],
    },
    razorpayOrderId: {
        type: String,
        index: { unique: true, sparse: true },
    },
    razorpayPaymentId: {
        type: String,
        index: { unique: true, sparse: true },
    },
}, { timestamps: true });
// Prevent duplicate active bookings for the same passenger on the same ride
bookingSchema.index({ ride: 1, passenger: 1 }, {
    unique: true,
    partialFilterExpression: {
        status: { $in: ['pending', 'accepted'] },
    },
});
exports.Booking = (0, mongoose_1.model)('Booking', bookingSchema);
exports.default = exports.Booking;
