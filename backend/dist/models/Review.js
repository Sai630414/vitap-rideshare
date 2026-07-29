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
}, { timestamps: true });
// Unique review per ride passenger
reviewSchema.index({ ride: 1, passenger: 1 }, { unique: true });
exports.Review = (0, mongoose_1.model)('Review', reviewSchema);
exports.default = exports.Review;
