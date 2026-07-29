import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import User, { IUser } from '../models/User';
import Driver from '../models/Driver';
import AppError from '../utils/appError';
import logger from '../utils/logger';
import { createAccessToken, createRefreshToken } from '../utils/jwt';
import { uploadToCloudinaryOrLocal } from '../services/cloudinaryService';
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
      vehicleRCNumber,
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

    if (!files || !files.profilePhoto || !files.licenceImage || !files.rcImage || !files.vehicleImage) {
      cleanupUploadedFiles(files);
      return next(new AppError('All required registration photos must be uploaded.', 400));
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      cleanupUploadedFiles(files);
      return next(new AppError('An account with this email already exists.', 400));
    }

    // Check unique fields in Driver collection
    const duplicateLicence = await Driver.findOne({ licenceNumber });
    if (duplicateLicence) {
      cleanupUploadedFiles(files);
      return next(new AppError('Licence number is already registered.', 400));
    }

    const duplicateRC = await Driver.findOne({ vehicleRCNumber });
    if (duplicateRC) {
      cleanupUploadedFiles(files);
      return next(new AppError('RC document number is already registered.', 400));
    }

    const duplicatePlate = await Driver.findOne({ vehicleNumber });
    if (duplicatePlate) {
      cleanupUploadedFiles(files);
      return next(new AppError('Vehicle number plate is already registered.', 400));
    }

    // Upload documents
    const profilePhotoUrl = await uploadToCloudinaryOrLocal(files.profilePhoto[0].path, 'profiles');
    const licenceImageUrl = await uploadToCloudinaryOrLocal(files.licenceImage[0].path, 'licences');
    const rcImageUrl = await uploadToCloudinaryOrLocal(files.rcImage[0].path, 'rc_documents');
    const vehicleImageUrl = await uploadToCloudinaryOrLocal(files.vehicleImage[0].path, 'vehicles');
    logger.info("Documents Uploaded");

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    // Auto promote to admin if matching ADMIN_EMAIL (highly unlikely but standard guard)
    const assignedRole = email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'driver';

    // 1) Create User credential
    const user = await User.create({
      name,
      email,
      password,
      role: assignedRole,
      isVerified: false,
      profileImage: profilePhotoUrl,
      verificationOTP: otp,
      verificationOTPExpiry: otpExpiry,
      verifiedStudent: true, // Drivers verify college email
      verifiedDriver: false, // Pending admin approval
    });

    // 2) Create Driver document
    await Driver.create({
      user: user._id,
      phone,
      licenceNumber,
      vehicleRCNumber,
      vehicleNumber,
      vehicleModel,
      vehicleColour,
      vehicleType,
      drivingExperience: Number(drivingExperience),
      emergencyContact,
      licenceImage: licenceImageUrl,
      rcImage: rcImageUrl,
      vehicleImage: vehicleImageUrl,
      approvalStatus: 'Pending',
      driverStatus: 'PENDING_APPROVAL',
      paymentStatus: false,
      documentsUploaded: true,
      emailVerified: false,
      subscriptionStatus: 'Inactive',
    });
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

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
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
    });

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

    const refreshTokenSecret =
      process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_token_key_change_in_production';

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

  res.cookie('jwt', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.redirect(
    `${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/success?token=${accessToken}`
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
      vehicleRCNumber,
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
      if (driver.approvalStatus === 'Approved') {
        return next(new AppError('You are already an approved driver.', 400));
      }
      if (driver.approvalStatus === 'Pending') {
        return next(new AppError('Your application is already pending approval.', 400));
      }
    }

    if (!driver && (!files || !files.licenceImage || !files.rcImage || !files.vehicleImage)) {
      cleanupUploadedFiles(files);
      return next(new AppError('All required vehicle and licence documents must be uploaded.', 400));
    }

    // Check unique fields in Driver collection
    const duplicateLicence = await Driver.findOne({ licenceNumber, user: { $ne: userId } });
    if (duplicateLicence) {
      cleanupUploadedFiles(files);
      return next(new AppError('Licence number is already registered.', 400));
    }

    const duplicateRC = await Driver.findOne({ vehicleRCNumber, user: { $ne: userId } });
    if (duplicateRC) {
      cleanupUploadedFiles(files);
      return next(new AppError('RC document number is already registered.', 400));
    }

    const duplicatePlate = await Driver.findOne({ vehicleNumber, user: { $ne: userId } });
    if (duplicatePlate) {
      cleanupUploadedFiles(files);
      return next(new AppError('Vehicle number plate is already registered.', 400));
    }

    // Upload documents
    let licenceImageUrl = driver?.licenceImage;
    let rcImageUrl = driver?.rcImage;
    let vehicleImageUrl = driver?.vehicleImage;

    if (files?.licenceImage) {
      licenceImageUrl = await uploadToCloudinaryOrLocal(files.licenceImage[0].path, 'licences');
    }
    if (files?.rcImage) {
      rcImageUrl = await uploadToCloudinaryOrLocal(files.rcImage[0].path, 'rc_documents');
    }
    if (files?.vehicleImage) {
      vehicleImageUrl = await uploadToCloudinaryOrLocal(files.vehicleImage[0].path, 'vehicles');
    }

    if (files) {
      logger.info("Documents Uploaded");
    }

    // Handle profile photo upload if provided
    if (files?.profilePhoto) {
      const profilePhotoUrl = await uploadToCloudinaryOrLocal(files.profilePhoto[0].path, 'profiles');
      await User.findByIdAndUpdate(userId, { profileImage: profilePhotoUrl });
      logger.info(`Profile photo updated for user: ${userId}`);
    }

    // Create or update driver application
    if (!driver) {
      driver = await Driver.create({
        user: userId,
        phone,
        licenceNumber,
        vehicleRCNumber,
        vehicleNumber,
        vehicleModel,
        vehicleColour,
        vehicleType,
        drivingExperience: Number(drivingExperience),
        emergencyContact,
        licenceImage: licenceImageUrl,
        rcImage: rcImageUrl,
        vehicleImage: vehicleImageUrl,
        approvalStatus: 'Pending',
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
      driver.vehicleRCNumber = vehicleRCNumber || driver.vehicleRCNumber;
      driver.vehicleNumber = vehicleNumber || driver.vehicleNumber;
      driver.vehicleModel = vehicleModel || driver.vehicleModel;
      driver.vehicleColour = vehicleColour || driver.vehicleColour;
      driver.vehicleType = vehicleType || driver.vehicleType;
      driver.drivingExperience = drivingExperience ? Number(drivingExperience) : driver.drivingExperience;
      driver.emergencyContact = emergencyContact || driver.emergencyContact;
      driver.licenceImage = licenceImageUrl as string;
      driver.rcImage = rcImageUrl as string;
      driver.vehicleImage = vehicleImageUrl as string;
      driver.approvalStatus = 'Pending';
      driver.driverStatus = 'PENDING_APPROVAL';
      driver.paymentStatus = false;
      driver.documentsUploaded = true;
      driver.emailVerified = req.user.isVerified;
      driver.subscriptionStatus = 'Inactive';
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