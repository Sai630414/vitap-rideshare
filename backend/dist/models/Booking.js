"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Booking = void 0;
const mongoose_1 = require("mongoose");
const bookingSchema = new mongoose_1.Schema({
    ride: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Ride',
        required: [true, 'Ride reference is required'],
    },
    passenger: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Passenger reference is required'],
    },
    driver: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Driver reference is required'],
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
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid'],
        default: 'pending',
    },
    seatNumber: {
        type: Number,
        default: 1,
        min: [1, 'Seat count must be at least 1'],
    },
}, { timestamps: true });
// We drop the unique index on { ride, passenger } to support sequential request submissions if rejected or cancelled.
// Instead of an index constraint, we will validate uniqueness of ACTIVE booking requests in the controller.
exports.Booking = (0, mongoose_1.model)('Booking', bookingSchema);
exports.default = exports.Booking;
