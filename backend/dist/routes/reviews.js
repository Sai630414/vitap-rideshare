"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reviewController_1 = require("../controllers/reviewController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const businessValidator_1 = require("../validators/businessValidator");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
// Passenger reviews driver
router.post('/', (0, validation_1.validateRequest)(businessValidator_1.createReviewSchema), reviewController_1.createReview);
// Driver reviews passenger
router.post('/passenger', (0, validation_1.validateRequest)(businessValidator_1.createPassengerReviewSchema), reviewController_1.createPassengerReview);
// Edit review within 24h
router.patch('/:id', reviewController_1.updateReview);
// Check if current user has already submitted a review
router.get('/my-review', reviewController_1.getMyReview);
// Get all reviews for a driver
router.get('/driver/:driverId', reviewController_1.getDriverReviews);
// Get all reviews for a passenger
router.get('/passenger/:passengerId', reviewController_1.getPassengerReviews);
exports.default = router;
