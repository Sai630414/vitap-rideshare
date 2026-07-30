import { Router } from 'express';
import {
  registerVehicle,
  getMyVehicles,
  deleteVehicle,
} from '../controllers/vehicleController';
import { protect } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { registerVehicleSchema } from '../validators/businessValidator';

const router = Router();

router.use(protect as any);

router.post('/', validateRequest(registerVehicleSchema) as any, registerVehicle as any);
router.get('/my-vehicles', getMyVehicles as any);
router.delete('/:id', deleteVehicle as any);

export default router;
