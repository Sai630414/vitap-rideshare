import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Review from '../models/Review';
import Ride from '../models/Ride';
import Booking from '../models/Booking';
import User from '../models/User';
import AppError from '../utils/appError';

export const createReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { rideId, rating, comment } = req.body;
    if (!req.user) return next(new AppError('Unauthorized', 401));

    if (!rideId || !rating) {
      return next(new AppError('Ride ID and rating (1-5) are required', 400));
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return next(new AppError('Ride not found', 404));
    }

    if (ride.status !== 'completed') {
      return next(new AppError('You can only review completed rides', 400));
    }

    // Verify passenger had an accepted booking
    const booking = await Booking.findOne({
      ride: ride._id,
      passenger: req.user.id,
      status: 'accepted',
    });

    if (!booking) {
      return next(new AppError('You did not have an accepted seat booking in this ride', 403));
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({
      ride: ride._id,
      passenger: req.user.id,
    });

    if (existingReview) {
      return next(new AppError('You have already reviewed this ride', 400));
    }

    // Create review
    const review = await Review.create({
      ride: ride._id,
      driver: ride.driver,
      passenger: req.user.id,
      rating,
      comment,
    });

    // Recalculate driver average rating
    const driverReviews = await Review.find({ driver: ride.driver });
    const ratingsCount = driverReviews.length;
    const ratingsSum = driverReviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = ratingsSum / ratingsCount;

    // Adjust trustScore based on rating: 5 stars increases it, <=2 stars decreases it
    const driver = await User.findById(ride.driver);
    let newTrustScore = driver?.trustScore || 100;
    if (rating === 5) {
      newTrustScore = Math.min(100, newTrustScore + 1); // incremental gain
    } else if (rating <= 2) {
      newTrustScore = Math.max(50, newTrustScore - 5); // penalize poor ratings
    }

    await User.findByIdAndUpdate(ride.driver, {
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
  } catch (error) {
    next(error);
  }
};

export const getDriverReviews = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { driverId } = req.params;
    const reviews = await Review.find({ driver: driverId })
      .populate('passenger', 'name email profileImage role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: reviews.length,
      data: {
        reviews,
      },
    });
  } catch (error) {
    next(error);
  }
};
