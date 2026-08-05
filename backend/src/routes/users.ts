import { Router } from 'express';
import {
  getUserProfile,
  updateProfile,
  uploadAvatar,
  blockUser,
  unblockUser,
  getBlocklist,
  reportUser,
  registerFCMToken,
  removeFCMToken,
} from '../controllers/userController';
import { applyDriver } from '../controllers/authController';
import { protect } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { validateRequest } from '../middleware/validation';
import { updateProfileSchema, applyDriverSchema } from '../validators/authValidator';

const router = Router();

// Protect all routes below
router.use(protect as any);

router.post(
  '/apply-driver',
  upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'licenceImage', maxCount: 1 },
    { name: 'collegeCardImage', maxCount: 1 },
    { name: 'vehicleImage', maxCount: 1 },
  ]) as any,
  validateRequest(applyDriverSchema) as any,
  applyDriver as any
);

router.put('/profile', validateRequest(updateProfileSchema) as any, updateProfile as any);
router.post('/avatar', upload.single('avatar') as any, uploadAvatar as any);
router.get('/blocked', getBlocklist as any);
router.post('/block/:id', blockUser as any);
router.post('/unblock/:id', unblockUser as any);
router.post('/report/:id', reportUser as any);
router.post('/fcm-token', registerFCMToken as any);
router.delete('/fcm-token', removeFCMToken as any);
router.get('/:id', getUserProfile as any);

export default router;
