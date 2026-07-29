"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const adminAuth_1 = require("../middleware/adminAuth");
const router = (0, express_1.Router)();
// Public Admin Login Route
router.post('/login', adminController_1.adminLogin);
// Secure all admin endpoints below
router.use(adminAuth_1.authenticate);
router.use(adminAuth_1.requireAdmin);
// Analytics
router.get('/dashboard', adminController_1.getDashboardStats);
router.get('/reports', adminController_1.getReports);
// Driver Approvals
router.get('/approvals', adminController_1.getApprovals);
router.get('/drivers', adminController_1.getDrivers);
router.get('/drivers/:id', adminController_1.getDriverById);
router.put('/drivers/:id/approve', adminController_1.approveDriver);
router.put('/drivers/:id/reject', adminController_1.rejectDriver);
router.put('/drivers/:id/request-resubmission', adminController_1.requestResubmission);
// Student Management
router.get('/students', adminController_1.getStudents);
router.patch('/students/:id/status', adminController_1.toggleStudentStatus);
// Ride Management
router.get('/rides', adminController_1.getRides);
router.delete('/rides/:id', adminController_1.cancelRideAdmin);
// Configuration Settings
router.get('/settings', adminController_1.getSettings);
router.put('/settings', adminController_1.updateSettings);
exports.default = router;
