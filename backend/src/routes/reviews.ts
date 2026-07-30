import { Router } from 'express';
import { createReview, getDriverReviews } from '../controllers/reviewController';
import { protect } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { createReviewSchema } from '../validators/businessValidator';

const router = Router();

router.use(protect as any);

router.post('/', validateRequest(createReviewSchema) as any, createReview as any);
router.get('/driver/:driverId', getDriverReviews as any);

export default router;
