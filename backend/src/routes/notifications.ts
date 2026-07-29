import { Router } from 'express';
import {
  getMyNotifications,
  markAllAsRead,
  markAsRead,
} from '../controllers/notificationController';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect as any);

router.get('/', getMyNotifications as any);
router.patch('/mark-read', markAllAsRead as any);
router.patch('/:id/read', markAsRead as any);

export default router;
