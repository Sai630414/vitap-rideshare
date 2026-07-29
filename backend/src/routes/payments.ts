import { Router } from 'express';
import { createOrder, verifyPayment } from '../controllers/paymentController';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect as any);

router.post('/order', createOrder as any);
router.post('/verify', verifyPayment as any);

export default router;
