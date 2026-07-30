"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDriverReviews = exports.createReview = void 0;
const Review_1 = __importDefault(require("../models/Review"));
const Ride_1 = __importDefault(require("../models/Ride"));
const Booking_1 = __importDefault(require("../models/Booking"));
const User_1 = __importDefault(require("../models/User"));
const appError_1 = __importDefault(require("../utils/appError"));
const createReview = async (req, res, next) => {
    try {
        const { rideId, rating, comment } = req.body;
        if (!req.user)
            return next(new appError_1.default('Unauthorized', 401));
        if (!rideId || !rating) {
            return next(new appError_1.default('Ride ID and rating (1-5) are required', 400));
        }
        const ride = await Ride_1.default.findById(rideId);
        if (!ride) {
            return next(new appError_1.default('Ride not found', 404));
        }
        if (ride.status !== 'completed') {
            return next(new appError_1.default('You can only review completed rides', 400));
        }
        // Verify passenger completed this ride (status becomes 'completed' after ride completion)
        const booking = await Booking_1.default.findOne({
            ride: ride._id,
            passenger: req.user.id,
            status: 'completed',
        });
        if (!booking) {
            return next(new appError_1.default('You can only review rides you completed as a passenger', 403));
        }
        // Check if already reviewed
        const existingReview = await Review_1.default.findOne({
            ride: ride._id,
            passenger: req.user.id,
        });
        if (existingReview) {
            return next(new appError_1.default('You have already reviewed this ride', 400));
        }
        // Create review
        const review = await Review_1.default.create({
            ride: ride._id,
            driver: ride.driver,
            passenger: req.user.id,
            rating,
            comment,
        });
        // Recalculate driver average rating
        const driverReviews = await Review_1.default.find({ driver: ride.driver });
        const ratingsCount = driverReviews.length;
        const ratingsSum = driverReviews.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = ratingsSum / ratingsCount;
        // Adjust trustScore based on rating: 5 stars increases it, <=2 stars decreases it
        const driver = await User_1.default.findById(ride.driver);
        let newTrustScore = driver?.trustScore || 100;
        if (rating === 5) {
            newTrustScore = Math.min(100, newTrustScore + 1); // incremental gain
        }
        else if (rating <= 2) {
            newTrustScore = Math.max(50, newTrustScore - 5); // penalize poor ratings
        }
        await User_1.default.findByIdAndUpdate(ride.driver, {
            $set: {
                rating: parseFloat(avgRating.toFixed(2)),
                totalRatingsCount: ratingsCount,
                trustScore: newTrustScore,
            },
        });
        res.status(201).json({
            status: 'success',
            data: {
                review,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createReview = createReview;
const getDriverReviews = async (req, res, next) => {
    try {
        const { driverId } = req.params;
        const reviews = await Review_1.default.find({ driver: driverId })
            .populate('passenger', 'name email profileImage role')
            .sort({ createdAt: -1 });
        res.status(200).json({
            status: 'success',
            results: reviews.length,
            data: {
                reviews,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getDriverReviews = getDriverReviews;
