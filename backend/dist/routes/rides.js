"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rideController_1 = require("../controllers/rideController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Public routes for authenticated users
router.get('/', auth_1.protect, rideController_1.searchRides);
router.get('/requests', auth_1.protect, rideController_1.getActiveRideRequests);
router.get('/:id', auth_1.protect, rideController_1.getRideDetails);
// Driver restricted routes
router.post('/', auth_1.protect, auth_1.requireVerifiedDriver, rideController_1.offerRide);
router.patch('/:id/status', auth_1.protect, rideController_1.updateRideStatus);
// Ride requests from passengers
router.post('/requests', auth_1.protect, rideController_1.createRideRequest);
router.delete('/requests/:id', auth_1.protect, rideController_1.deleteRideRequest);
exports.default = router;
