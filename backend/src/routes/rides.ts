import { Router } from 'express';
import {
  offerRide,
  searchRides,
  getRideDetails,
  updateRideStatus,
  createRideRequest,
  getActiveRideRequests,
  deleteRideRequest,
} from '../controllers/rideController';
import { protect, requireVerifiedDriver } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { offerRideSchema, createRideRequestSchema, updateRideStatusSchema } from '../validators/businessValidator';

const router = Router();

// Public routes for authenticated users
router.get('/', protect as any, searchRides as any);
router.get('/requests', protect as any, getActiveRideRequests as any);
router.get('/:id', protect as any, getRideDetails as any);

// Driver restricted routes
router.post('/', protect as any, requireVerifiedDriver as any, validateRequest(offerRideSchema) as any, offerRide as any);
router.patch('/:id/status', protect as any, validateRequest(updateRideStatusSchema) as any, updateRideStatus as any);

// Ride requests from passengers
router.post('/requests', protect as any, validateRequest(createRideRequestSchema) as any, createRideRequest as any);
router.delete('/requests/:id', protect as any, deleteRideRequest as any);

export default router;
