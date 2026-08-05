import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Review from '../models/Review';
import Ride from '../models/Ride';
import Booking from '../models/Booking';
import User from '../models/User';
import AppError from '../utils/appError';
import { sendNotificationToUser } from './notificationController';

// ──────────────────────────────────────────────
// Helper: recalculate & persist average rating
// ──────────────────────────────────────────────
const recalcAverageRating = async (
  userId: string,
  reviewType: 'driver' | 'passenger'
): Promise<void> => {
  const field = reviewType === 'driver' ? 'driver' : 'passenger';
  const reviews = await Review.find({ [field]: userId, reviewType });
  const count = reviews.length;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const avg = count > 0 ? parseFloat((sum / count).toFixed(2)) : 5.0;

  let trustDelta = 0;
  // Use last rating to adjust trust score
  const lastRating = reviews[count - 1]?.rating;
  if (lastRating === 5) trustDelta = 1;
  else if (lastRating && lastRating <= 2) trustDelta = -5;

  const userDoc = await User.findById(userId);
  const newTrust = Math.min(100, Math.max(50, (userDoc?.trustScore ?? 100) + trustDelta));

  await User.findByIdAndUpdate(userId, {
    $set: { rating: avg, totalRatingsCount: count, trustScore: newTrust },
  });
};

// ──────────────────────────────────────────────
// POST /api/reviews  — Passenger reviews Driver
// ──────────────────────────────────────────────
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
    if (!ride) return next(new AppError('Ride not found', 404));

    if (ride.status !== 'completed') {
      return next(new AppError('You can only review completed rides', 400));
    }

    // Verify passenger completed this ride
    const booking = await Booking.findOne({
      ride: ride._id,
      passenger: req.user.id,
      status: 'completed',
    });
    if (!booking) {
      return next(new AppError('You can only review rides you completed as a passenger', 403));
    }

    // Prevent duplicate
    const existing = await Review.findOne({
      ride: ride._id,
      passenger: req.user.id,
      reviewType: 'driver',
    });
    if (existing) {
      return next(new AppError('You have already reviewed this ride', 400));
    }

    const review = await Review.create({
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
    await sendNotificationToUser(
      ride.driver.toString(),
      'New Review Received ⭐',
      `You received a ${rating}-star review from a passenger on your ride to ${ride.destination}.`,
      'new_review',
      ride._id
    );

    res.status(201).json({ status: 'success', data: { review } });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────
// PATCH /api/reviews/:id  — Edit within 24h
// ──────────────────────────────────────────────
export const updateReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    if (!req.user) return next(new AppError('Unauthorized', 401));

    const review = await Review.findById(id);
    if (!review) return next(new AppError('Review not found', 404));

    // Ownership check
    if (review.passenger.toString() !== req.user.id && review.driver.toString() !== req.user.id) {
      return next(new AppError('You are not authorized to edit this review', 403));
    }

    // 24-hour edit window
    const ageMs = Date.now() - new Date(review.createdAt).getTime();
    if (ageMs > 24 * 60 * 60 * 1000) {
      return next(new AppError('Review can only be edited within 24 hours of submission', 403));
    }

    if (rating !== undefined) review.rating = rating;
    if (comment !== undefined) review.comment = comment;
    await review.save();

    // Recalculate affected user's rating
    const subjectId =
      review.reviewType === 'driver'
        ? review.driver.toString()
        : review.passenger.toString();
    await recalcAverageRating(subjectId, review.reviewType);

    res.status(200).json({ status: 'success', data: { review } });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────
// GET /api/reviews/driver/:driverId
// ──────────────────────────────────────────────
export const getDriverReviews = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { driverId } = req.params;
    const reviews = await Review.find({ driver: driverId, reviewType: 'driver' })
      .populate('passenger', 'name email profileImage role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: reviews.length,
      data: { reviews },
    });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────
// GET /api/reviews/passenger/:passengerId
// ──────────────────────────────────────────────
export const getPassengerReviews = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { passengerId } = req.params;
    const reviews = await Review.find({ passenger: passengerId, reviewType: 'passenger' })
      .populate('driver', 'name email profileImage verifiedDriver rating')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: reviews.length,
      data: { reviews },
    });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────
// POST /api/reviews/passenger  — Driver reviews Passenger
// ──────────────────────────────────────────────
export const createPassengerReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { rideId, passengerId, rating, comment } = req.body;
    if (!req.user) return next(new AppError('Unauthorized', 401));

    if (!rideId || !passengerId || !rating) {
      return next(new AppError('Ride ID, passenger ID, and rating are required', 400));
    }

    const ride = await Ride.findById(rideId);
    if (!ride) return next(new AppError('Ride not found', 404));

    if (ride.status !== 'completed') {
      return next(new AppError('You can only review passengers after ride completion', 400));
    }

    // Verify the requester is the driver of this ride
    if (ride.driver.toString() !== req.user.id) {
      return next(new AppError('Only the driver of this ride can review passengers', 403));
    }

    // Verify passenger actually had a completed booking
    const booking = await Booking.findOne({
      ride: ride._id,
      passenger: passengerId,
      status: 'completed',
    });
    if (!booking) {
      return next(new AppError('This passenger did not complete the ride', 403));
    }

    // Prevent duplicate driver-reviews-passenger
    const existing = await Review.findOne({
      ride: ride._id,
      driver: req.user.id,
      passenger: passengerId,
      reviewType: 'passenger',
    });
    if (existing) {
      return next(new AppError('You have already reviewed this passenger for this ride', 400));
    }

    const review = await Review.create({
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
    await sendNotificationToUser(
      passengerId,
      'New Review Received ⭐',
      `Your driver gave you a ${rating}-star review for the ride from ${ride.source} to ${ride.destination}.`,
      'new_review',
      ride._id
    );

    res.status(201).json({ status: 'success', data: { review } });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────
// GET /api/reviews/my-review?rideId=&type=driver|passenger
// ──────────────────────────────────────────────
export const getMyReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));
    const { rideId, type = 'driver', passengerId } = req.query;

    if (!rideId) return next(new AppError('rideId is required', 400));

    let query: any = { ride: rideId, reviewType: type };

    if (type === 'driver') {
      // Passenger checking if they reviewed the driver
      query.passenger = req.user.id;
    } else {
      // Driver checking if they reviewed a specific passenger
      query.driver = req.user.id;
      if (passengerId) query.passenger = passengerId;
    }

    const review = await Review.findOne(query);

    res.status(200).json({
      status: 'success',
      data: { review: review || null },
    });
  } catch (error) {
    next(error);
  }
};
