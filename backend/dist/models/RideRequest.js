"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RideRequest = void 0;
const mongoose_1 = require("mongoose");
const rideRequestSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User reference is required'],
    },
    source: {
        type: String,
        required: [true, 'Source location name is required'],
        trim: true,
    },
    destination: {
        type: String,
        required: [true, 'Destination location name is required'],
        trim: true,
    },
    pickupLocation: {
        address: { type: String, required: true },
        coordinates: {
            type: [Number],
            required: true,
        },
    },
    dropLocation: {
        address: { type: String, required: true },
        coordinates: {
            type: [Number],
            required: true,
        },
    },
    departureDate: {
        type: Date,
        required: [true, 'Requested date is required'],
    },
    departureTime: {
        type: String,
        required: [true, 'Requested time range/hour is required'],
        trim: true,
    },
    seatsNeeded: {
        type: Number,
        default: 1,
        min: 1,
    },
    description: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        enum: ['active', 'fulfilled', 'cancelled'],
        default: 'active',
    },
}, { timestamps: true });
exports.RideRequest = (0, mongoose_1.model)('RideRequest', rideRequestSchema);
exports.default = exports.RideRequest;
