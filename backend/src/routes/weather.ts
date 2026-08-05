import { Router } from 'express';
import { getWeather } from '../controllers/weatherController';
import { protect } from '../middleware/auth';

const router = Router();

// Weather is only accessible to authenticated users
router.get('/', protect as any, getWeather);

export default router;
