"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const passport_1 = __importDefault(require("passport"));
const validation_1 = require("../middleware/validation");
const authValidator_1 = require("../validators/authValidator");
const router = (0, express_1.Router)();
// Student / Generic Auth Routes
router.post('/signup', (0, validation_1.validateRequest)(authValidator_1.signupSchema), authController_1.signup);
router.post('/verify-otp', (0, validation_1.validateRequest)(authValidator_1.verifyOtpSchema), authController_1.verifyOTP);
router.post('/resend-otp', (0, validation_1.validateRequest)(authValidator_1.resendOtpSchema), authController_1.resendOTP);
router.post('/login', (0, validation_1.validateRequest)(authValidator_1.loginSchema), authController_1.login);
router.post('/forgot-password', (0, validation_1.validateRequest)(authValidator_1.forgotPasswordSchema), authController_1.forgotPassword);
router.post('/reset-password', (0, validation_1.validateRequest)(authValidator_1.resetPasswordSchema), authController_1.resetPassword);
router.post('/refresh', authController_1.refreshToken);
router.post('/logout', authController_1.logout);
// Driver Registration (includes file uploads)
router.post('/signup/driver', upload_1.upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'licenceImage', maxCount: 1 },
    { name: 'collegeCardImage', maxCount: 1 },
    { name: 'vehicleImage', maxCount: 1 },
]), (0, validation_1.validateRequest)(authValidator_1.driverSignupSchema), authController_1.signupDriver);
// Google OAuth
router.get("/google", passport_1.default.authenticate("google", { scope: ["profile", "email"], session: false }));
router.get("/google/callback", passport_1.default.authenticate("google", { session: false, failureRedirect: `${process.env.CLIENT_URL}/login` }), authController_1.googleCallback);
// Profile
router.get('/me', auth_1.protect, authController_1.getMe);
// Phone OTP Verification (Feature 8)
router.post('/send-phone-otp', auth_1.protect, authController_1.sendPhoneOTP);
router.post('/verify-phone-otp', auth_1.protect, authController_1.verifyPhoneOTP);
exports.default = router;
