import { Router } from 'express';
import { createReview, getDriverReviews } from '../controllers/reviewController';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect as any);

router.post('/', createReview as any);
router.get('/driver/:driverId', getDriverReviews as any);

export default router;
