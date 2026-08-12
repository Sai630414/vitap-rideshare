import { Router } from 'express';
import { getRouteEstimate } from '../controllers/routeController';
import { protect } from '../middleware/auth';

const router = Router();

// Endpoint: POST /api/routes/estimate
router.post('/estimate', protect as any, getRouteEstimate as any);

export default router;
