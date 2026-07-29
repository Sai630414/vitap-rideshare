import { Router } from 'express';
import {
  adminLogin,
  getDashboardStats,
  getDrivers,
  getDriverById,
  approveDriver,
  rejectDriver,
  requestResubmission,
  getStudents,
  toggleStudentStatus,
  getRides,
  cancelRideAdmin,
  getReports,
  getSettings,
  updateSettings,
  getApprovals,
} from '../controllers/adminController';
import { authenticate, requireAdmin } from '../middleware/adminAuth';

const router = Router();

// Public Admin Login Route
router.post('/login', adminLogin as any);

// Secure all admin endpoints below
router.use(authenticate as any);
router.use(requireAdmin as any);

// Analytics
router.get('/dashboard', getDashboardStats as any);
router.get('/reports', getReports as any);

// Driver Approvals
router.get('/approvals', getApprovals as any);
router.get('/drivers', getDrivers as any);
router.get('/drivers/:id', getDriverById as any);
router.put('/drivers/:id/approve', approveDriver as any);
router.put('/drivers/:id/reject', rejectDriver as any);
router.put('/drivers/:id/request-resubmission', requestResubmission as any);

// Student Management
router.get('/students', getStudents as any);
router.patch('/students/:id/status', toggleStudentStatus as any);

// Ride Management
router.get('/rides', getRides as any);
router.delete('/rides/:id', cancelRideAdmin as any);

// Configuration Settings
router.get('/settings', getSettings as any);
router.put('/settings', updateSettings as any);

export default router;
