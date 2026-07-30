"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ride = void 0;
const mongoose_1 = require("mongoose");
const rideSchema = new mongoose_1.Schema({
    driver: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Driver reference is required'],
    },
    vehicle: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: [true, 'Vehicle reference is required'],
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
            validate: {
                validator: (v) => v.length === 2,
                message: 'Pickup coordinates must be [longitude, latitude]',
            },
        },
    },
    dropLocation: {
        address: { type: String, required: true },
        coordinates: {
            type: [Number],
            required: true,
            validate: {
                validator: (v) => v.length === 2,
                message: 'Drop coordinates must be [longitude, latitude]',
            },
        },
    },
    departureDate: {
        type: Date,
        required: [true, 'Departure date is required'],
    },
    departureTime: {
        type: String,
        required: [true, 'Departure time (HH:MM) is required'],
        trim: true,
    },
    price: {
        type: Number,
        required: [true, 'Price per seat is required'],
        min: [0, 'Price cannot be negative'],
    },
    availableSeats: {
        type: Number,
        required: [true, 'Available seats count is required'],
        min: [0, 'Seats cannot be negative'],
    },
    description: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
        default: 'scheduled',
    },
    recurring: {
        isRecurring: { type: Boolean, default: false },
        days: { type: [String] },
    },
    routePoints: {
        coordinates: { type: [[Number]], default: [] },
    },
}, { timestamps: true });
// Index for query searching
rideSchema.index({ 'pickupLocation.coordinates': '2dsphere' });
rideSchema.index({ 'dropLocation.coordinates': '2dsphere' });
rideSchema.index({ driver: 1, status: 1, departureDate: 1 });
rideSchema.index({ status: 1, departureDate: 1 });
rideSchema.index({ source: 1, destination: 1, departureDate: 1 });
exports.Ride = (0, mongoose_1.model)('Ride', rideSchema);
exports.default = exports.Ride;
