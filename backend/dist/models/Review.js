"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Review = void 0;
const mongoose_1 = require("mongoose");
const reviewSchema = new mongoose_1.Schema({
    ride: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Ride',
        required: [true, 'Ride reference is required'],
    },
    driver: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Driver reference is required'],
    },
    passenger: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Passenger reference is required'],
    },
    rating: {
        type: Number,
        required: [true, 'Rating (1-5) is required'],
        min: 1,
        max: 5,
    },
    comment: {
        type: String,
        trim: true,
    },
    reviewType: {
        type: String,
        enum: ['driver', 'passenger'],
        required: [true, 'Review type (driver or passenger) is required'],
        default: 'driver',
    },
}, { timestamps: true });
// Unique review per ride + passenger + reviewType
// A passenger can only review a driver once per ride (reviewType='driver')
// A driver can only review a passenger once per ride (reviewType='passenger')
reviewSchema.index({ ride: 1, passenger: 1, reviewType: 1 }, { unique: true });
// Indexes for quick lookups
reviewSchema.index({ driver: 1, reviewType: 1 });
reviewSchema.index({ passenger: 1, reviewType: 1 });
exports.Review = (0, mongoose_1.model)('Review', reviewSchema);
exports.default = exports.Review;
