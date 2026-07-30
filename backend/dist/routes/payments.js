"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paymentController_1 = require("../controllers/paymentController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
router.post('/order', paymentController_1.createOrder);
router.post('/verify', paymentController_1.verifyPayment);
// Passenger Ride Bookings Payment endpoints
router.post('/booking/:bookingId/order', paymentController_1.createBookingOrder);
router.post('/booking/:bookingId/verify', paymentController_1.verifyBookingPayment);
exports.default = router;
