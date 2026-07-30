import { Router } from 'express';
import {
  createBooking,
  respondToBooking,
  cancelBooking,
  getMyBookings,
  getRideBookings,
  getDriverRequests,
} from '../controllers/bookingController';
import { protect, requireVerifiedStudent } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { createBookingSchema, respondToBookingSchema } from '../validators/businessValidator';

const router = Router();

router.use(protect as any);

router.post('/', requireVerifiedStudent as any, validateRequest(createBookingSchema) as any, createBooking as any);
router.get('/my-bookings', getMyBookings as any);
router.get('/driver-requests', getDriverRequests as any);
router.get('/ride/:rideId', getRideBookings as any);
router.patch('/:id/respond', validateRequest(respondToBookingSchema) as any, respondToBooking as any);
router.patch('/:id/cancel', cancelBooking as any);

export default router;
