import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import User, { IUser } from '../models/User';
import Driver from '../models/Driver';
import AppError from '../utils/appError';
import logger from '../utils/logger';
import { createAccessToken, createRefreshToken } from '../utils/jwt';
import { uploadToR2, deleteFromR2 } from '../services/r2Service';
import {
  sendWelcomeEmail,
  sendOTPEmail,
  sendPasswordResetEmail,
} from '../services/emailService';

const ADMIN_EMAIL = 'sai.23mic7189@vitapstudent.ac.in';

const createSendToken = (user: IUser, statusCode: number, res: Response) => {
  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);

  const cookieOptions = {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none' as const,
  };

  res.cookie('jwt', refreshToken, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token: accessToken,
    data: {
      user,
    },
  });
};

/**
 * Helper to delete uploaded files on error
 */
const cleanupUploadedFiles = (files: any) => {
  if (!files) return;
  try {
    const fileFields = Object.keys(files);
    fileFields.forEach((field) => {
      const fileArr = files[field] as Express.Multer.File[];
      if (fileArr && fileArr.length > 0) {
        const filePath = fileArr[0].path;
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    });
  } catch (err) {
    logger.error('Error cleaning up files:', err);
  }
};

/**
 * Student Registration Flow
 */
export const signup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (
      email.toLowerCase() === 'saikondareddypala@gmail.com' ||
      email.toLowerCase() === 'sai.23mic7189@vitapstudent.ac.in' ||
      req.body.role === 'admin'
    ) {
      return next(new AppError('Administrator registration is not permitted via public signup.', 400));
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (!existingUser.isVerified) {
        // Unverified user already exists, generate new OTP and resend
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        existingUser.verificationOTP = otp;
        existingUser.verificationOTPExpiry = new Date(Date.now() + 10 * 60 * 1000);
        existingUser.name = name;
        existingUser.password = password;
        await existingUser.save();

        await sendOTPEmail(email, otp);

        res.status(200).json({
          status: 'success',
          message: 'An unverified account already exists with this email. A new OTP has been sent.',
          email: existingUser.email,
        });
        return;
      }
      return next(new AppError('An account with this email already exists.', 400));
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    // Auto promote to admin role if matching administrator email
    const assignedRole = email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'student';

    const newUser = await User.create({
      name,
      email,
      password,
      role: assignedRole,
      isVerified: false,
      verificationOTP: otp,
      verificationOTPExpiry: otpExpiry,
      verifiedStudent: false,
    });

    await sendOTPEmail(email, otp);

    res.status(201).json({
      status: 'success',
      message: 'Student registration successful! Verification code sent to email.',
      email: newUser.email,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Driver Registration Flow (different flow, requires uploads & info)
 */
export const signupDriver = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    logger.info("Driver Registration Started");
    const {
      name,
      email,
      phone,
      password,
      licenceNumber,
      collegeCardNumber,
      vehicleNumber,
      vehicleModel,
      vehicleColour,
      vehicleType,
      drivingExperience,
      emergencyContact,
    } = req.body;

    if (
      email.toLowerCase() === 'saikondareddypala@gmail.com' ||
      email.toLowerCase() === 'sai.23mic7189@vitapstudent.ac.in' ||
      req.body.role === 'admin'
    ) {
      return next(new AppError('Administrator registration is not permitted via public driver signup.', 400));
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!files || !files.profilePhoto || (!files.licenceImage && !files.collegeCardImage) || !files.vehicleImage) {
      cleanupUploadedFiles(files);
      return next(new AppError('Profile photo, vehicle photo, and at least one identity document (Driving Licence or College ID Card) are required.', 400));
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      cleanupUploadedFiles(files);
      return next(new AppError('An account with this email already exists.', 400));
    }

    // Check unique fields in Driver collection
    if (licenceNumber) {
      const duplicateLicence = await Driver.findOne({ licenceNumber });
      if (duplicateLicence) {
        cleanupUploadedFiles(files);
        return next(new AppError('Licence number is already registered.', 400));
      }
    }

    if (collegeCardNumber) {
      const duplicateCard = await Driver.findOne({ collegeCardNumber });
      if (duplicateCard) {
        cleanupUploadedFiles(files);
        return next(new AppError('College ID card number is already registered.', 400));
      }
    }

    const duplicatePlate = await Driver.findOne({ vehicleNumber });
    if (duplicatePlate) {
      cleanupUploadedFiles(files);
      return next(new AppError('Vehicle number plate is already registered.', 400));
    }

    // Upload documents to Cloudflare R2
    const profileRes = await uploadToR2(files.profilePhoto[0], 'profiles');
    const profilePhotoUrl = profileRes.url;

    const vehicleRes = await uploadToR2(files.vehicleImage[0], 'vehicles');
    const vehicleImageUrl = vehicleRes.url;
    
    let licenceImageUrl = '';
    if (files.licenceImage && files.licenceImage.length > 0) {
      const licenceRes = await uploadToR2(files.licenceImage[0], 'licences');
      licenceImageUrl = licenceRes.url;
    }

    let collegeCardImageUrl = '';
    if (files.collegeCardImage && files.collegeCardImage.length > 0) {
      const collegeRes = await uploadToR2(files.collegeCardImage[0], 'college_cards');
      collegeCardImageUrl = collegeRes.url;
    }

    logger.info("Documents Uploaded");

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    // Auto promote to admin if matching ADMIN_EMAIL (highly unlikely but standard guard)
    const assignedRole = email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'driver';

    // 1) Create User credential
    let user;
    try {
      user = await User.create({
        name,
        email,
        password,
        role: assignedRole,
        isVerified: false,
        profileImage: profilePhotoUrl,
        phone,
        verificationOTP: otp,
        verificationOTPExpiry: otpExpiry,
        verifiedStudent: true,
        verifiedDriver: false,
      });

      // 2) Create Driver document
      await Driver.create({
        user: user._id,
        phone,
        licenceNumber: licenceNumber || undefined,
        collegeCardNumber: collegeCardNumber || undefined,
        vehicleNumber,
        vehicleModel,
        vehicleColour,
        vehicleType,
        drivingExperience: Number(drivingExperience),
        emergencyContact,
        licenceImage: licenceImageUrl || undefined,
        collegeCardImage: collegeCardImageUrl || undefined,
        vehicleImage: vehicleImageUrl,
        approvalStatus: 'pending',
        driverStatus: 'PENDING_APPROVAL',
        paymentStatus: false,
        documentsUploaded: true,
        emailVerified: false,
        subscriptionStatus: 'Inactive',
      });
    } catch (createError) {
      // Roll back orphaned user if driver create fails after user create
      if (user?._id) {
        await User.findByIdAndDelete(user._id).catch(() => undefined);
      }
      throw createError;
    }
    logger.info("Driver Saved");

    await sendOTPEmail(email, otp);
    logger.info("Application Created");

    res.status(201).json({
      status: 'success',
      message: 'Driver registration successful! Please verify your email code.',
      email: user.email,
    });
  } catch (error) {
    cleanupUploadedFiles(req.files);
    next(error);
  }
};

/**
 * OTP Code Verification
 */
export const verifyOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email }).select('+verificationOTP +verificationOTPExpiry');
    if (!user) {
      return next(new AppError('No user found with this email address.', 404));
    }

    if (user.isVerified) {
      return next(new AppError('Email is already verified.', 400));
    }

    if (!user.verificationOTPExpiry || user.verificationOTPExpiry.getTime() < Date.now()) {
      return next(new AppError('OTP code has expired. Please request a new code.', 400));
    }

    if (user.verificationOTP !== otp) {
      return next(new AppError('Incorrect verification code. Please try again.', 400));
    }

    user.isVerified = true;
    user.verificationOTP = undefined;
    user.verificationOTPExpiry = undefined;

    if (user.role === 'student') {
      user.verifiedStudent = true;
    }
    await user.save();

    // Sync to driver record if it exists
    await Driver.findOneAndUpdate({ user: user._id }, { emailVerified: true });

    logger.info(`OTP Verified for user: ${email}`);

    // If student or admin, log in directly
    if (user.role !== 'driver') {
      await sendWelcomeEmail(user.email, user.name, user.role);
      createSendToken(user, 200, res);
    } else {
      // For driver: email is verified, status is pending approval.
      // Send welcome but tell them to wait for approval.
      res.status(200).json({
        status: 'success',
        message: 'Email verified successfully! Your profile is pending administrator approval.',
        email: user.email,
        pendingApproval: true,
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Resend OTP
 */
export const resendOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return next(new AppError('No user found with this email address.', 404));
    }

    if (user.isVerified) {
      return next(new AppError('Email is already verified.', 400));
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationOTP = otp;
    user.verificationOTPExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendOTPEmail(email, otp);

    res.status(200).json({
      status: 'success',
      message: 'Verification code resent successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Manual Email/Password Login
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError('Incorrect email or password.', 401));
    }

    if (user.status === 'banned') {
      return next(new AppError('Your account has been banned.', 403));
    }

    // Direct to verification page if email not verified
    if (!user.isVerified) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.verificationOTP = otp;
      user.verificationOTPExpiry = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();
      await sendOTPEmail(email, otp);

      res.status(403).json({
        status: 'unverified',
        message: 'Your email address is unverified. A new verification OTP code was dispatched.',
        email: user.email,
      });
      return;
    }

    createSendToken(user, 200, res);
  } catch (error) {
    next(error);
  }
};

/**
 * Forgot Password (Request secure reset token)
 */
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return next(new AppError('No account found with this email address.', 404));
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL || 'https://vitap-rideshare.vercel.app'}/reset-password?token=${resetToken}`;
    await sendPasswordResetEmail(user.email, resetUrl);

    res.status(200).json({
      status: 'success',
      message: 'Password reset link sent to your college email.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset Password (Submit new credentials)
 */
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token, password } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpiry: { $gt: new Date() },
    }).select('+resetPasswordToken +password');

    if (!user) {
      return next(new AppError('The password reset link is invalid or has expired.', 400));
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    logger.info(`Password reset successfully: ${user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'Password reset successful! Please log in.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh Access Token
 */
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;
    if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(new AppError('No refresh token. Please log in.', 401));
    }

    const refreshTokenSecret = process.env.JWT_REFRESH_SECRET;
    if (!refreshTokenSecret) {
      return next(new AppError('Server JWT configuration error.', 500));
    }

    const decoded = jwt.verify(token, refreshTokenSecret) as { id: string };

    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new AppError('User session expired.', 401));
    }

    if (user.status === 'banned') {
      return next(new AppError('Your account has been banned.', 403));
    }

    const newAccessToken = createAccessToken(user);

    res.status(200).json({
      status: 'success',
      token: newAccessToken,
    });
  } catch (error) {
    next(new AppError('Invalid or expired refresh session. Please login again.', 401));
  }
};

/**
 * Logout User Session
 */
export const logout = (req: Request, res: Response): void => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none' as const,
  });
  res.status(200).json({ status: 'success', message: 'Logged out successfully' });
};

/**
 * Profile Fetch
 */
export const getMe = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let userJson = req.user.toJSON();
    // Populate driver details and status if driver record exists
    const driverDetails = await Driver.findOne({ user: req.user._id });
    userJson.driverDetails = driverDetails;
    
    res.status(200).json({
      status: 'success',
      data: {
        user: userJson,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Google Callback (auto-creates admin/student/driver records)
 */
export const googleCallback = (req: Request, res: Response) => {
  const user = req.user as IUser;

  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);

  // Set Refresh Token Cookie
  res.cookie("jwt", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  const isMobile = req.query.mobile === "true";

  const webClientUrl =
    process.env.WEB_CLIENT_URL ||
    "https://vitap-rideshare.vercel.app";

  const mobileAppUrl =
    process.env.MOBILE_APP_URL ||
    "waygo://auth";

  if (isMobile) {
    return res.redirect(
      `${mobileAppUrl}/success?token=${encodeURIComponent(accessToken)}`
    );
  }

  return res.redirect(
    `${webClientUrl}/auth/success?token=${encodeURIComponent(accessToken)}`
  );
};

/**
 * Logged in Student applies to become a Driver
 */
export const applyDriver = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return next(new AppError('You must be logged in to apply as a driver.', 401));
    }

    logger.info(`Driver Registration Started for user: ${userId}`);

    const {
      phone,
      licenceNumber,
      collegeCardNumber,
      vehicleNumber,
      vehicleModel,
      vehicleColour,
      vehicleType,
      drivingExperience,
      emergencyContact,
    } = req.body;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // Check if driver document already exists
    let driver = await Driver.findOne({ user: userId });
    
    if (driver) {
      if (driver.approvalStatus === 'approved') {
        return next(new AppError('You are already an approved driver.', 400));
      }
      if (driver.approvalStatus === 'pending') {
        return next(new AppError('Your application is already pending approval.', 400));
      }
      // Allow resubmission / rejected only
      if (!['rejected', 'resubmission'].includes(driver.approvalStatus)) {
        return next(new AppError(`Cannot re-apply while application status is ${driver.approvalStatus}.`, 400));
      }
    }

    if (!driver && (!files || (!files.licenceImage && !files.collegeCardImage) || !files.vehicleImage)) {
      cleanupUploadedFiles(files);
      return next(new AppError('Vehicle photo and at least one identity document (Driving Licence or College ID Card) are required.', 400));
    }

    if (!phone || !vehicleNumber || !vehicleModel || !vehicleColour || !vehicleType || drivingExperience === undefined || !emergencyContact) {
      cleanupUploadedFiles(files);
      return next(new AppError('Phone, vehicle details, driving experience, and emergency contact are required.', 400));
    }

    if (!licenceNumber && !collegeCardNumber) {
      cleanupUploadedFiles(files);
      return next(new AppError('Either Driving Licence or College ID Card details must be provided.', 400));
    }

    // Check unique fields in Driver collection
    if (licenceNumber) {
      const duplicateLicence = await Driver.findOne({ licenceNumber, user: { $ne: userId } });
      if (duplicateLicence) {
        cleanupUploadedFiles(files);
        return next(new AppError('Licence number is already registered.', 400));
      }
    }

    if (collegeCardNumber) {
      const duplicateCard = await Driver.findOne({ collegeCardNumber, user: { $ne: userId } });
      if (duplicateCard) {
        cleanupUploadedFiles(files);
        return next(new AppError('College ID card number is already registered.', 400));
      }
    }

    const duplicatePlate = await Driver.findOne({ vehicleNumber, user: { $ne: userId } });
    if (duplicatePlate) {
      cleanupUploadedFiles(files);
      return next(new AppError('Vehicle number plate is already registered.', 400));
    }

    // Upload documents
    let licenceImageUrl = driver?.licenceImage;
    let collegeCardImageUrl = driver?.collegeCardImage;
    let vehicleImageUrl = driver?.vehicleImage;

    if (files?.licenceImage?.[0]) {
      if (driver?.licenceImage) await deleteFromR2(driver.licenceImage);
      const res = await uploadToR2(files.licenceImage[0], 'licences', userId);
      licenceImageUrl = res.url;
    }
    if (files?.collegeCardImage?.[0]) {
      if (driver?.collegeCardImage) await deleteFromR2(driver.collegeCardImage);
      const res = await uploadToR2(files.collegeCardImage[0], 'college_cards', userId);
      collegeCardImageUrl = res.url;
    }
    if (files?.vehicleImage?.[0]) {
      if (driver?.vehicleImage) await deleteFromR2(driver.vehicleImage);
      const res = await uploadToR2(files.vehicleImage[0], 'vehicles', userId);
      vehicleImageUrl = res.url;
    }

    if (files) {
      logger.info("Documents Uploaded");
    }

    // Handle profile photo upload if provided
    if (files?.profilePhoto?.[0]) {
      const currentUser = await User.findById(userId);
      if (currentUser?.profileImage) {
        await deleteFromR2(currentUser.profileImage);
      }
      const profileRes = await uploadToR2(files.profilePhoto[0], 'profiles', userId);
      await User.findByIdAndUpdate(userId, { profileImage: profileRes.url });
      logger.info(`Profile photo updated for user: ${userId}`);
    }

    // Create or update driver application
    if (!driver) {
      driver = await Driver.create({
        user: userId,
        phone,
        licenceNumber: licenceNumber || undefined,
        collegeCardNumber: collegeCardNumber || undefined,
        vehicleNumber,
        vehicleModel,
        vehicleColour,
        vehicleType,
        drivingExperience: Number(drivingExperience),
        emergencyContact,
        licenceImage: licenceImageUrl || undefined,
        collegeCardImage: collegeCardImageUrl || undefined,
        vehicleImage: vehicleImageUrl,
        approvalStatus: 'pending',
        driverStatus: 'PENDING_APPROVAL',
        paymentStatus: false,
        documentsUploaded: true,
        emailVerified: req.user.isVerified,
        subscriptionStatus: 'Inactive',
      });
      logger.info(`Driver Saved in MongoDB for user: ${userId}`);
    } else {
      driver.phone = phone || driver.phone;
      driver.licenceNumber = licenceNumber || driver.licenceNumber;
      driver.collegeCardNumber = collegeCardNumber || driver.collegeCardNumber;
      driver.vehicleNumber = vehicleNumber || driver.vehicleNumber;
      driver.vehicleModel = vehicleModel || driver.vehicleModel;
      driver.vehicleColour = vehicleColour || driver.vehicleColour;
      driver.vehicleType = vehicleType || driver.vehicleType;
      driver.drivingExperience = drivingExperience !== undefined && drivingExperience !== ''
        ? Number(drivingExperience)
        : driver.drivingExperience;
      driver.emergencyContact = emergencyContact || driver.emergencyContact;
      driver.licenceImage = licenceImageUrl || driver.licenceImage;
      driver.collegeCardImage = collegeCardImageUrl || driver.collegeCardImage;
      driver.vehicleImage = vehicleImageUrl || driver.vehicleImage;
      driver.approvalStatus = 'pending';
      driver.driverStatus = 'PENDING_APPROVAL';
      driver.paymentStatus = false;
      driver.documentsUploaded = true;
      driver.emailVerified = req.user.isVerified;
      driver.subscriptionStatus = 'Inactive';
      driver.rejectionReason = undefined;
      await driver.save();
      logger.info(`Driver Saved in MongoDB (Updated) for user: ${userId}`);
    }

    if (phone && !req.user.phone) {
      await User.findByIdAndUpdate(userId, { phone });
    }

    logger.info(`Application Created for user: ${userId}`);

    res.status(200).json({
      status: 'success',
      message: 'Your driver application has been successfully created and is pending approval.',
      data: {
        driver,
      },
    });
  } catch (error) {
    cleanupUploadedFiles(req.files);
    next(error);
  }
};

// ──────────────────────────────────────────────
// Feature 8: Send Phone OTP via AWS SNS (or Mock)
// ──────────────────────────────────────────────
export const sendPhoneOTP = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { phone } = req.body;
    if (!req.user) return next(new AppError('Unauthorized', 401));

    if (!phone || !/^\+?[1-9]\d{9,14}$/.test(phone.replace(/\s+/g, ''))) {
      return next(new AppError('Valid phone number with country code (e.g. +919876543210) is required', 400));
    }

    const user = await User.findById(req.user.id);
    if (!user) return next(new AppError('User not found', 404));

    // Rate-limiting check: max 5 attempts per session
    if ((user.phoneVerificationAttempts ?? 0) >= 5) {
      const ageMs = Date.now() - new Date(user.updatedAt).getTime();
      if (ageMs < 15 * 60 * 1000) {
        return next(new AppError('Too many verification attempts. Please wait 15 minutes before retrying.', 429));
      }
      user.phoneVerificationAttempts = 0;
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.phone = phone;
    user.phoneOTP = otp;
    user.phoneOTPExpiry = expiry;
    user.phoneVerificationAttempts = (user.phoneVerificationAttempts ?? 0) + 1;
    await user.save();

    // Import smsService dynamically to avoid circular issues
    const { sendSMS } = await import('../services/smsService');
    await sendSMS(phone, `[VIT RideShare] Your phone verification OTP code is: ${otp}. Valid for 10 minutes.`);

    res.status(200).json({
      status: 'success',
      message: `Verification OTP sent to ${phone}`,
    });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────
// Feature 8: Verify Phone OTP
// ──────────────────────────────────────────────
export const verifyPhoneOTP = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { otp } = req.body;
    if (!req.user) return next(new AppError('Unauthorized', 401));

    if (!otp || otp.length !== 6) {
      return next(new AppError('6-digit OTP is required', 400));
    }

    const user = await User.findById(req.user.id).select('+phoneOTP');
    if (!user) return next(new AppError('User not found', 404));

    if (!user.phoneOTP || !user.phoneOTPExpiry) {
      return next(new AppError('No active phone OTP request found. Please request a new OTP.', 400));
    }

    if (Date.now() > new Date(user.phoneOTPExpiry).getTime()) {
      return next(new AppError('OTP has expired. Please request a new OTP.', 400));
    }

    if (user.phoneOTP !== otp.toString().trim()) {
      return next(new AppError('Invalid OTP code. Please check and try again.', 400));
    }

    user.phoneVerified = true;
    user.phoneVerifiedAt = new Date();
    user.phoneOTP = undefined;
    user.phoneOTPExpiry = undefined;
    user.phoneVerificationAttempts = 0;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: '📱 Phone number verified successfully!',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};
