import { Router } from 'express';
import multer from 'multer';
import { uploadToR2 } from '../controllers/r2Controller';

const router = Router();

// Store uploaded file in memory temporarily
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

router.post('/upload', upload.single('file'), uploadToR2);

export default router;