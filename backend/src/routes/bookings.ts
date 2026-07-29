import { Router } from 'express';
import {
  createBooking,
  respondToBooking,
  cancelBooking,
  getMyBookings,
  getRideBookings,
  getDriverRequests,
} from '../controllers/bookingController';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect as any);

router.post('/', createBooking as any);
router.get('/my-bookings', getMyBookings as any);
router.get('/driver-requests', getDriverRequests as any);
router.get('/ride/:rideId', getRideBookings as any);
router.patch('/:id/respond', respondToBooking as any);
router.patch('/:id/cancel', cancelBooking as any);

export default router;
