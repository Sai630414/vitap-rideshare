import { Router } from 'express';
import {
  getOrCreateChat,
  sendMessage,
  getChatMessages,
  getUserChats,
  markAsSeen,
} from '../controllers/chatController';
import { protect } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.use(protect as any);

router.post('/', getOrCreateChat as any);
router.get('/', getUserChats as any);
router.post('/:chatId/messages', upload.single('image') as any, sendMessage as any);
router.get('/:chatId/messages', getChatMessages as any);
router.patch('/:chatId/seen', markAsSeen as any);

export default router;
