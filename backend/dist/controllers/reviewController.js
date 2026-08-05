"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyReview = exports.createPassengerReview = exports.getPassengerReviews = exports.getDriverReviews = exports.updateReview = exports.createReview = void 0;
const Review_1 = __importDefault(require("../models/Review"));
const Ride_1 = __importDefault(require("../models/Ride"));
const Booking_1 = __importDefault(require("../models/Booking"));
const User_1 = __importDefault(require("../models/User"));
const appError_1 = __importDefault(require("../utils/appError"));
const notificationController_1 = require("./notificationController");
const socketService_1 = require("../services/socketService");
// ──────────────────────────────────────────────
// Helper: recalculate & persist average rating
// ──────────────────────────────────────────────
const recalcAverageRating = async (userId, reviewType) => {
    const field = reviewType === 'driver' ? 'driver' : 'passenger';
    const reviews = await Review_1.default.find({ [field]: userId, reviewType });
    const count = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = count > 0 ? parseFloat((sum / count).toFixed(2)) : 5.0;
    let trustDelta = 0;
    // Use last rating to adjust trust score
    const lastRating = reviews[count - 1]?.rating;
    if (lastRating === 5)
        trustDelta = 1;
    else if (lastRating && lastRating <= 2)
        trustDelta = -5;
    const userDoc = await User_1.default.findById(userId);
    const newTrust = Math.min(100, Math.max(50, (userDoc?.trustScore ?? 100) + trustDelta));
    await User_1.default.findByIdAndUpdate(userId, {
        $set: { rating: avg, totalRatingsCount: count, trustScore: newTrust },
    });
};
// ──────────────────────────────────────────────
// POST /api/reviews  — Passenger reviews Driver
// ──────────────────────────────────────────────
const createReview = async (req, res, next) => {
    try {
        const { rideId, rating, comment } = req.body;
        if (!req.user)
            return next(new appError_1.default('Unauthorized', 401));
        if (!rideId || !rating) {
            return next(new appError_1.default('Ride ID and rating (1-5) are required', 400));
        }
        const ride = await Ride_1.default.findById(rideId);
        if (!ride)
            return next(new appError_1.default('Ride not found', 404));
        if (ride.status !== 'completed') {
            return next(new appError_1.default('You can only review completed rides', 400));
        }
        // Verify passenger completed this ride
        const booking = await Booking_1.default.findOne({
            ride: ride._id,
            passenger: req.user.id,
            status: 'completed',
        });
        if (!booking) {
            return next(new appError_1.default('You can only review rides you completed as a passenger', 403));
        }
        // Prevent duplicate
        const existing = await Review_1.default.findOne({
            ride: ride._id,
            passenger: req.user.id,
            reviewType: 'driver',
        });
        if (existing) {
            return next(new appError_1.default('You have already reviewed this ride', 400));
        }
        const review = await Review_1.default.create({
            ride: ride._id,
            driver: ride.driver,
            passenger: req.user.id,
            rating,
            comment,
            reviewType: 'driver',
        });
        // Recalculate driver's average rating
        await recalcAverageRating(ride.driver.toString(), 'driver');
        // Notify driver
        await (0, notificationController_1.sendNotificationToUser)(ride.driver.toString(), 'New Review Received ⭐', `You received a ${rating}-star review from a passenger on your ride to ${ride.destination}.`, 'new_review', ride._id);
        (0, socketService_1.sendToUser)(ride.driver.toString(), 'review_submitted', review);
        res.status(201).json({ status: 'success', data: { review } });
    }
    catch (error) {
        next(error);
    }
};
exports.createReview = createReview;
// ──────────────────────────────────────────────
// PATCH /api/reviews/:id  — Edit within 24h
// ──────────────────────────────────────────────
const updateReview = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;
        if (!req.user)
            return next(new appError_1.default('Unauthorized', 401));
        const review = await Review_1.default.findById(id);
        if (!review)
            return next(new appError_1.default('Review not found', 404));
        // Ownership check
        if (review.passenger.toString() !== req.user.id && review.driver.toString() !== req.user.id) {
            return next(new appError_1.default('You are not authorized to edit this review', 403));
        }
        // 24-hour edit window
        const ageMs = Date.now() - new Date(review.createdAt).getTime();
        if (ageMs > 24 * 60 * 60 * 1000) {
            return next(new appError_1.default('Review can only be edited within 24 hours of submission', 403));
        }
        if (rating !== undefined)
            review.rating = rating;
        if (comment !== undefined)
            review.comment = comment;
        await review.save();
        // Recalculate affected user's rating
        const subjectId = review.reviewType === 'driver'
            ? review.driver.toString()
            : review.passenger.toString();
        await recalcAverageRating(subjectId, review.reviewType);
        res.status(200).json({ status: 'success', data: { review } });
    }
    catch (error) {
        next(error);
    }
};
exports.updateReview = updateReview;
// ──────────────────────────────────────────────
// GET /api/reviews/driver/:driverId
// ──────────────────────────────────────────────
const getDriverReviews = async (req, res, next) => {
    try {
        const { driverId } = req.params;
        const reviews = await Review_1.default.find({ driver: driverId, reviewType: 'driver' })
            .populate('passenger', 'name email profileImage role')
            .sort({ createdAt: -1 });
        res.status(200).json({
            status: 'success',
            results: reviews.length,
            data: { reviews },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getDriverReviews = getDriverReviews;
// ──────────────────────────────────────────────
// GET /api/reviews/passenger/:passengerId
// ──────────────────────────────────────────────
const getPassengerReviews = async (req, res, next) => {
    try {
        const { passengerId } = req.params;
        const reviews = await Review_1.default.find({ passenger: passengerId, reviewType: 'passenger' })
            .populate('driver', 'name email profileImage verifiedDriver rating')
            .sort({ createdAt: -1 });
        res.status(200).json({
            status: 'success',
            results: reviews.length,
            data: { reviews },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getPassengerReviews = getPassengerReviews;
// ──────────────────────────────────────────────
// POST /api/reviews/passenger  — Driver reviews Passenger
// ──────────────────────────────────────────────
const createPassengerReview = async (req, res, next) => {
    try {
        const { rideId, passengerId, rating, comment } = req.body;
        if (!req.user)
            return next(new appError_1.default('Unauthorized', 401));
        if (!rideId || !passengerId || !rating) {
            return next(new appError_1.default('Ride ID, passenger ID, and rating are required', 400));
        }
        const ride = await Ride_1.default.findById(rideId);
        if (!ride)
            return next(new appError_1.default('Ride not found', 404));
        if (ride.status !== 'completed') {
            return next(new appError_1.default('You can only review passengers after ride completion', 400));
        }
        // Verify the requester is the driver of this ride
        if (ride.driver.toString() !== req.user.id) {
            return next(new appError_1.default('Only the driver of this ride can review passengers', 403));
        }
        // Verify passenger actually had a completed booking
        const booking = await Booking_1.default.findOne({
            ride: ride._id,
            passenger: passengerId,
            status: 'completed',
        });
        if (!booking) {
            return next(new appError_1.default('This passenger did not complete the ride', 403));
        }
        // Prevent duplicate driver-reviews-passenger
        const existing = await Review_1.default.findOne({
            ride: ride._id,
            driver: req.user.id,
            passenger: passengerId,
            reviewType: 'passenger',
        });
        if (existing) {
            return next(new appError_1.default('You have already reviewed this passenger for this ride', 400));
        }
        const review = await Review_1.default.create({
            ride: ride._id,
            driver: req.user.id,
            passenger: passengerId,
            rating,
            comment,
            reviewType: 'passenger',
        });
        // Recalculate passenger's average rating
        await recalcAverageRating(passengerId, 'passenger');
        // Notify passenger
        await (0, notificationController_1.sendNotificationToUser)(passengerId, 'New Review Received ⭐', `Your driver gave you a ${rating}-star review for the ride from ${ride.source} to ${ride.destination}.`, 'new_review', ride._id);
        res.status(201).json({ status: 'success', data: { review } });
    }
    catch (error) {
        next(error);
    }
};
exports.createPassengerReview = createPassengerReview;
// ──────────────────────────────────────────────
// GET /api/reviews/my-review?rideId=&type=driver|passenger
// ──────────────────────────────────────────────
const getMyReview = async (req, res, next) => {
    try {
        if (!req.user)
            return next(new appError_1.default('Unauthorized', 401));
        const { rideId, type = 'driver', passengerId } = req.query;
        if (!rideId)
            return next(new appError_1.default('rideId is required', 400));
        let query = { ride: rideId, reviewType: type };
        if (type === 'driver') {
            // Passenger checking if they reviewed the driver
            query.passenger = req.user.id;
        }
        else {
            // Driver checking if they reviewed a specific passenger
            query.driver = req.user.id;
            if (passengerId)
                query.passenger = passengerId;
        }
        const review = await Review_1.default.findOne(query);
        res.status(200).json({
            status: 'success',
            data: { review: review || null },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMyReview = getMyReview;
