import { Router } from 'express';
import {
  signup,
  signupDriver,
  verifyOTP,
  resendOTP,
  login,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
  getMe,
  googleCallback,
} from '../controllers/authController';
import { protect } from '../middleware/auth';
import { upload } from '../middleware/upload';
import passport from 'passport';
import { validateRequest } from '../middleware/validation';
import {
  signupSchema,
  driverSignupSchema,
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/authValidator';

const router = Router();

// Student / Generic Auth Routes
router.post('/signup', validateRequest(signupSchema) as any, signup as any);
router.post('/verify-otp', validateRequest(verifyOtpSchema) as any, verifyOTP as any);
router.post('/resend-otp', validateRequest(resendOtpSchema) as any, resendOTP as any);
router.post('/login', validateRequest(loginSchema) as any, login as any);
router.post('/forgot-password', validateRequest(forgotPasswordSchema) as any, forgotPassword as any);
router.post('/reset-password', validateRequest(resetPasswordSchema) as any, resetPassword as any);
router.post('/refresh', refreshToken as any);
router.post('/logout', logout as any);

// Driver Registration (includes file uploads)
router.post(
  '/signup/driver',
  upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'licenceImage', maxCount: 1 },
    { name: 'collegeCardImage', maxCount: 1 },
    { name: 'vehicleImage', maxCount: 1 },
  ]) as any,
  validateRequest(driverSignupSchema) as any,
  signupDriver as any
);

// Google OAuth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));
router.get("/google/callback", passport.authenticate("google", { session: false, failureRedirect: `${process.env.CLIENT_URL}/login` }), googleCallback);

// Profile
router.get('/me', protect as any, getMe as any);

export default router;
