import { Router } from 'express';
import {
  createOrder,
  verifyPayment,
  createBookingOrder,
  verifyBookingPayment,
} from '../controllers/paymentController';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect as any);

router.post('/order', createOrder as any);
router.post('/verify', verifyPayment as any);

// Passenger Ride Bookings Payment endpoints
router.post('/booking/:bookingId/order', createBookingOrder as any);
router.post('/booking/:bookingId/verify', verifyBookingPayment as any);

export default router;
