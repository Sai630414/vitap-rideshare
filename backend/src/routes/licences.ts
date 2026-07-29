import { Router } from 'express';
import { uploadLicence, getMyLicence } from '../controllers/licenceController';
import { protect } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.use(protect as any);

router.post(
  '/',
  upload.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 },
  ]) as any,
  uploadLicence as any
);
router.get('/my-licence', getMyLicence as any);

export default router;
