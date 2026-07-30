"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rideController_1 = require("../controllers/rideController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const businessValidator_1 = require("../validators/businessValidator");
const router = (0, express_1.Router)();
// Public routes for authenticated users
router.get('/', auth_1.protect, rideController_1.searchRides);
router.get('/requests', auth_1.protect, rideController_1.getActiveRideRequests);
// My rides — must come before /:id to avoid 'mine' being parsed as an ObjectId
router.get('/mine', auth_1.protect, rideController_1.getMyRides);
router.get('/:id', auth_1.protect, rideController_1.getRideDetails);
// Driver restricted routes
router.post('/', auth_1.protect, auth_1.requireVerifiedDriver, (0, validation_1.validateRequest)(businessValidator_1.offerRideSchema), rideController_1.offerRide);
router.patch('/:id/status', auth_1.protect, (0, validation_1.validateRequest)(businessValidator_1.updateRideStatusSchema), rideController_1.updateRideStatus);
// Ride requests from passengers
router.post('/requests', auth_1.protect, (0, validation_1.validateRequest)(businessValidator_1.createRideRequestSchema), rideController_1.createRideRequest);
router.delete('/requests/:id', auth_1.protect, rideController_1.deleteRideRequest);
exports.default = router;
