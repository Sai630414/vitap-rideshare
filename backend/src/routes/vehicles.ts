import { Router } from 'express';
import {
  registerVehicle,
  uploadVehicleRC,
  getMyVehicles,
  deleteVehicle,
} from '../controllers/vehicleController';
import { protect } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.use(protect as any);

router.post('/', registerVehicle as any);
router.post('/:id/rc', upload.single('rc') as any, uploadVehicleRC as any);
router.get('/my-vehicles', getMyVehicles as any);
router.delete('/:id', deleteVehicle as any);

export default router;
