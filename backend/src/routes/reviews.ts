import { Router } from 'express';
import {
  createReview,
  createPassengerReview,
  updateReview,
  getDriverReviews,
  getPassengerReviews,
  getMyReview,
} from '../controllers/reviewController';
import { protect } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { createReviewSchema, createPassengerReviewSchema } from '../validators/businessValidator';

const router = Router();

router.use(protect as any);

// Passenger reviews driver
router.post('/', validateRequest(createReviewSchema) as any, createReview as any);

// Driver reviews passenger
router.post('/passenger', validateRequest(createPassengerReviewSchema) as any, createPassengerReview as any);

// Edit review within 24h
router.patch('/:id', updateReview as any);

// Check if current user has already submitted a review
router.get('/my-review', getMyReview as any);

// Get all reviews for a driver
router.get('/driver/:driverId', getDriverReviews as any);

// Get all reviews for a passenger
router.get('/passenger/:passengerId', getPassengerReviews as any);

export default router;
