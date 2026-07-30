"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyDriver = exports.googleCallback = exports.getMe = exports.logout = exports.refreshToken = exports.resetPassword = exports.forgotPassword = exports.login = exports.resendOTP = exports.verifyOTP = exports.signupDriver = exports.signup = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const User_1 = __importDefault(require("../models/User"));
const Driver_1 = __importDefault(require("../models/Driver"));
const appError_1 = __importDefault(require("../utils/appError"));
const logger_1 = __importDefault(require("../utils/logger"));
const jwt_1 = require("../utils/jwt");
const cloudinaryService_1 = require("../services/cloudinaryService");
const emailService_1 = require("../services/emailService");
const ADMIN_EMAIL = 'sai.23mic7189@vitapstudent.ac.in';
const createSendToken = (user, statusCode, res) => {
    const accessToken = (0, jwt_1.createAccessToken)(user);
    const refreshToken = (0, jwt_1.createRefreshToken)(user);
    const cookieOptions = {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
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
const cleanupUploadedFiles = (files) => {
    if (!files)
        return;
    try {
        const fileFields = Object.keys(files);
        fileFields.forEach((field) => {
            const fileArr = files[field];
            if (fileArr && fileArr.length > 0) {
                const filePath = fileArr[0].path;
                if (fs_1.default.existsSync(filePath)) {
                    fs_1.default.unlinkSync(filePath);
                }
            }
        });
    }
    catch (err) {
        logger_1.default.error('Error cleaning up files:', err);
    }
};
/**
 * Student Registration Flow
 */
const signup = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        if (email.toLowerCase() === 'saikondareddypala@gmail.com' ||
            email.toLowerCase() === 'sai.23mic7189@vitapstudent.ac.in' ||
            req.body.role === 'admin') {
            return next(new appError_1.default('Administrator registration is not permitted via public signup.', 400));
        }
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            if (!existingUser.isVerified) {
                // Unverified user already exists, generate new OTP and resend
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                existingUser.verificationOTP = otp;
                existingUser.verificationOTPExpiry = new Date(Date.now() + 10 * 60 * 1000);
                existingUser.name = name;
                existingUser.password = password;
                await existingUser.save();
                await (0, emailService_1.sendOTPEmail)(email, otp);
                res.status(200).json({
                    status: 'success',
                    message: 'An unverified account already exists with this email. A new OTP has been sent.',
                    email: existingUser.email,
                });
                return;
            }
            return next(new appError_1.default('An account with this email already exists.', 400));
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        // Auto promote to admin role if matching administrator email
        const assignedRole = email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'student';
        const newUser = await User_1.default.create({
            name,
            email,
            password,
            role: assignedRole,
            isVerified: false,
            verificationOTP: otp,
            verificationOTPExpiry: otpExpiry,
            verifiedStudent: false,
        });
        await (0, emailService_1.sendOTPEmail)(email, otp);
        res.status(201).json({
            status: 'success',
            message: 'Student registration successful! Verification code sent to email.',
            email: newUser.email,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.signup = signup;
/**
 * Driver Registration Flow (different flow, requires uploads & info)
 */
const signupDriver = async (req, res, next) => {
    try {
        logger_1.default.info("Driver Registration Started");
        const { name, email, phone, password, licenceNumber, collegeCardNumber, vehicleNumber, vehicleModel, vehicleColour, vehicleType, drivingExperience, emergencyContact, } = req.body;
        if (email.toLowerCase() === 'saikondareddypala@gmail.com' ||
            email.toLowerCase() === 'sai.23mic7189@vitapstudent.ac.in' ||
            req.body.role === 'admin') {
            return next(new appError_1.default('Administrator registration is not permitted via public driver signup.', 400));
        }
        const files = req.files;
        if (!files || !files.profilePhoto || (!files.licenceImage && !files.collegeCardImage) || !files.vehicleImage) {
            cleanupUploadedFiles(files);
            return next(new appError_1.default('Profile photo, vehicle photo, and at least one identity document (Driving Licence or College ID Card) are required.', 400));
        }
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            cleanupUploadedFiles(files);
            return next(new appError_1.default('An account with this email already exists.', 400));
        }
        // Check unique fields in Driver collection
        if (licenceNumber) {
            const duplicateLicence = await Driver_1.default.findOne({ licenceNumber });
            if (duplicateLicence) {
                cleanupUploadedFiles(files);
                return next(new appError_1.default('Licence number is already registered.', 400));
            }
        }
        if (collegeCardNumber) {
            const duplicateCard = await Driver_1.default.findOne({ collegeCardNumber });
            if (duplicateCard) {
                cleanupUploadedFiles(files);
                return next(new appError_1.default('College ID card number is already registered.', 400));
            }
        }
        const duplicatePlate = await Driver_1.default.findOne({ vehicleNumber });
        if (duplicatePlate) {
            cleanupUploadedFiles(files);
            return next(new appError_1.default('Vehicle number plate is already registered.', 400));
        }
        // Upload documents
        const profilePhotoUrl = await (0, cloudinaryService_1.uploadToCloudinaryOrLocal)(files.profilePhoto[0].path, 'profiles');
        const vehicleImageUrl = await (0, cloudinaryService_1.uploadToCloudinaryOrLocal)(files.vehicleImage[0].path, 'vehicles');
        let licenceImageUrl = '';
        if (files.licenceImage && files.licenceImage.length > 0) {
            licenceImageUrl = await (0, cloudinaryService_1.uploadToCloudinaryOrLocal)(files.licenceImage[0].path, 'licences');
        }
        let collegeCardImageUrl = '';
        if (files.collegeCardImage && files.collegeCardImage.length > 0) {
            collegeCardImageUrl = await (0, cloudinaryService_1.uploadToCloudinaryOrLocal)(files.collegeCardImage[0].path, 'college_cards');
        }
        logger_1.default.info("Documents Uploaded");
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        // Auto promote to admin if matching ADMIN_EMAIL (highly unlikely but standard guard)
        const assignedRole = email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'driver';
        // 1) Create User credential
        let user;
        try {
            user = await User_1.default.create({
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
            await Driver_1.default.create({
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
        }
        catch (createError) {
            // Roll back orphaned user if driver create fails after user create
            if (user?._id) {
                await User_1.default.findByIdAndDelete(user._id).catch(() => undefined);
            }
            throw createError;
        }
        logger_1.default.info("Driver Saved");
        await (0, emailService_1.sendOTPEmail)(email, otp);
        logger_1.default.info("Application Created");
        res.status(201).json({
            status: 'success',
            message: 'Driver registration successful! Please verify your email code.',
            email: user.email,
        });
    }
    catch (error) {
        cleanupUploadedFiles(req.files);
        next(error);
    }
};
exports.signupDriver = signupDriver;
/**
 * OTP Code Verification
 */
const verifyOTP = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        const user = await User_1.default.findOne({ email }).select('+verificationOTP +verificationOTPExpiry');
        if (!user) {
            return next(new appError_1.default('No user found with this email address.', 404));
        }
        if (user.isVerified) {
            return next(new appError_1.default('Email is already verified.', 400));
        }
        if (!user.verificationOTPExpiry || user.verificationOTPExpiry.getTime() < Date.now()) {
            return next(new appError_1.default('OTP code has expired. Please request a new code.', 400));
        }
        if (user.verificationOTP !== otp) {
            return next(new appError_1.default('Incorrect verification code. Please try again.', 400));
        }
        user.isVerified = true;
        user.verificationOTP = undefined;
        user.verificationOTPExpiry = undefined;
        if (user.role === 'student') {
            user.verifiedStudent = true;
        }
        await user.save();
        // Sync to driver record if it exists
        await Driver_1.default.findOneAndUpdate({ user: user._id }, { emailVerified: true });
        logger_1.default.info(`OTP Verified for user: ${email}`);
        // If student or admin, log in directly
        if (user.role !== 'driver') {
            await (0, emailService_1.sendWelcomeEmail)(user.email, user.name, user.role);
            createSendToken(user, 200, res);
        }
        else {
            // For driver: email is verified, status is pending approval.
            // Send welcome but tell them to wait for approval.
            res.status(200).json({
                status: 'success',
                message: 'Email verified successfully! Your profile is pending administrator approval.',
                email: user.email,
                pendingApproval: true,
            });
        }
    }
    catch (error) {
        next(error);
    }
};
exports.verifyOTP = verifyOTP;
/**
 * Resend OTP
 */
const resendOTP = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await User_1.default.findOne({ email });
        if (!user) {
            return next(new appError_1.default('No user found with this email address.', 404));
        }
        if (user.isVerified) {
            return next(new appError_1.default('Email is already verified.', 400));
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationOTP = otp;
        user.verificationOTPExpiry = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();
        await (0, emailService_1.sendOTPEmail)(email, otp);
        res.status(200).json({
            status: 'success',
            message: 'Verification code resent successfully.',
        });
    }
    catch (error) {
        next(error);
    }
};
exports.resendOTP = resendOTP;
/**
 * Manual Email/Password Login
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User_1.default.findOne({ email }).select('+password');
        if (!user || !(await user.comparePassword(password))) {
            return next(new appError_1.default('Incorrect email or password.', 401));
        }
        if (user.status === 'banned') {
            return next(new appError_1.default('Your account has been banned.', 403));
        }
        // Direct to verification page if email not verified
        if (!user.isVerified) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            user.verificationOTP = otp;
            user.verificationOTPExpiry = new Date(Date.now() + 10 * 60 * 1000);
            await user.save();
            await (0, emailService_1.sendOTPEmail)(email, otp);
            res.status(403).json({
                status: 'unverified',
                message: 'Your email address is unverified. A new verification OTP code was dispatched.',
                email: user.email,
            });
            return;
        }
        createSendToken(user, 200, res);
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
/**
 * Forgot Password (Request secure reset token)
 */
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await User_1.default.findOne({ email });
        if (!user) {
            return next(new appError_1.default('No account found with this email address.', 404));
        }
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        const hashedToken = crypto_1.default.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
        await user.save({ validateBeforeSave: false });
        const resetUrl = `${process.env.CLIENT_URL || 'https://vitap-rideshare.vercel.app'}/reset-password?token=${resetToken}`;
        await (0, emailService_1.sendPasswordResetEmail)(user.email, resetUrl);
        res.status(200).json({
            status: 'success',
            message: 'Password reset link sent to your college email.',
        });
    }
    catch (error) {
        next(error);
    }
};
exports.forgotPassword = forgotPassword;
/**
 * Reset Password (Submit new credentials)
 */
const resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.body;
        const hashedToken = crypto_1.default.createHash('sha256').update(token).digest('hex');
        const user = await User_1.default.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpiry: { $gt: new Date() },
        }).select('+resetPasswordToken +password');
        if (!user) {
            return next(new appError_1.default('The password reset link is invalid or has expired.', 400));
        }
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpiry = undefined;
        await user.save();
        logger_1.default.info(`Password reset successfully: ${user.email}`);
        res.status(200).json({
            status: 'success',
            message: 'Password reset successful! Please log in.',
        });
    }
    catch (error) {
        next(error);
    }
};
exports.resetPassword = resetPassword;
/**
 * Refresh Access Token
 */
const refreshToken = async (req, res, next) => {
    try {
        let token;
        if (req.cookies && req.cookies.jwt) {
            token = req.cookies.jwt;
        }
        if (!token) {
            return next(new appError_1.default('No refresh token. Please log in.', 401));
        }
        const refreshTokenSecret = process.env.JWT_REFRESH_SECRET;
        if (!refreshTokenSecret) {
            return next(new appError_1.default('Server JWT configuration error.', 500));
        }
        const decoded = jsonwebtoken_1.default.verify(token, refreshTokenSecret);
        const user = await User_1.default.findById(decoded.id);
        if (!user) {
            return next(new appError_1.default('User session expired.', 401));
        }
        if (user.status === 'banned') {
            return next(new appError_1.default('Your account has been banned.', 403));
        }
        const newAccessToken = (0, jwt_1.createAccessToken)(user);
        res.status(200).json({
            status: 'success',
            token: newAccessToken,
        });
    }
    catch (error) {
        next(new appError_1.default('Invalid or expired refresh session. Please login again.', 401));
    }
};
exports.refreshToken = refreshToken;
/**
 * Logout User Session
 */
const logout = (req, res) => {
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
    });
    res.status(200).json({ status: 'success', message: 'Logged out successfully' });
};
exports.logout = logout;
/**
 * Profile Fetch
 */
const getMe = async (req, res, next) => {
    try {
        let userJson = req.user.toJSON();
        // Populate driver details and status if driver record exists
        const driverDetails = await Driver_1.default.findOne({ user: req.user._id });
        userJson.driverDetails = driverDetails;
        res.status(200).json({
            status: 'success',
            data: {
                user: userJson,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMe = getMe;
/**
 * Google Callback (auto-creates admin/student/driver records)
 */
const googleCallback = (req, res) => {
    const user = req.user;
    const accessToken = (0, jwt_1.createAccessToken)(user);
    const refreshToken = (0, jwt_1.createRefreshToken)(user);
    res.cookie('jwt', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.redirect(`${process.env.CLIENT_URL || 'https://vitap-rideshare.vercel.app'}/auth/success?token=${accessToken}`);
};
exports.googleCallback = googleCallback;
/**
 * Logged in Student applies to become a Driver
 */
const applyDriver = async (req, res, next) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return next(new appError_1.default('You must be logged in to apply as a driver.', 401));
        }
        logger_1.default.info(`Driver Registration Started for user: ${userId}`);
        const { phone, licenceNumber, collegeCardNumber, vehicleNumber, vehicleModel, vehicleColour, vehicleType, drivingExperience, emergencyContact, } = req.body;
        const files = req.files;
        // Check if driver document already exists
        let driver = await Driver_1.default.findOne({ user: userId });
        if (driver) {
            if (driver.approvalStatus === 'approved') {
                return next(new appError_1.default('You are already an approved driver.', 400));
            }
            if (driver.approvalStatus === 'pending') {
                return next(new appError_1.default('Your application is already pending approval.', 400));
            }
            // Allow resubmission / rejected only
            if (!['rejected', 'resubmission'].includes(driver.approvalStatus)) {
                return next(new appError_1.default(`Cannot re-apply while application status is ${driver.approvalStatus}.`, 400));
            }
        }
        if (!driver && (!files || (!files.licenceImage && !files.collegeCardImage) || !files.vehicleImage)) {
            cleanupUploadedFiles(files);
            return next(new appError_1.default('Vehicle photo and at least one identity document (Driving Licence or College ID Card) are required.', 400));
        }
        if (!phone || !vehicleNumber || !vehicleModel || !vehicleColour || !vehicleType || drivingExperience === undefined || !emergencyContact) {
            cleanupUploadedFiles(files);
            return next(new appError_1.default('Phone, vehicle details, driving experience, and emergency contact are required.', 400));
        }
        if (!licenceNumber && !collegeCardNumber) {
            cleanupUploadedFiles(files);
            return next(new appError_1.default('Either Driving Licence or College ID Card details must be provided.', 400));
        }
        // Check unique fields in Driver collection
        if (licenceNumber) {
            const duplicateLicence = await Driver_1.default.findOne({ licenceNumber, user: { $ne: userId } });
            if (duplicateLicence) {
                cleanupUploadedFiles(files);
                return next(new appError_1.default('Licence number is already registered.', 400));
            }
        }
        if (collegeCardNumber) {
            const duplicateCard = await Driver_1.default.findOne({ collegeCardNumber, user: { $ne: userId } });
            if (duplicateCard) {
                cleanupUploadedFiles(files);
                return next(new appError_1.default('College ID card number is already registered.', 400));
            }
        }
        const duplicatePlate = await Driver_1.default.findOne({ vehicleNumber, user: { $ne: userId } });
        if (duplicatePlate) {
            cleanupUploadedFiles(files);
            return next(new appError_1.default('Vehicle number plate is already registered.', 400));
        }
        // Upload documents
        let licenceImageUrl = driver?.licenceImage;
        let collegeCardImageUrl = driver?.collegeCardImage;
        let vehicleImageUrl = driver?.vehicleImage;
        if (files?.licenceImage) {
            licenceImageUrl = await (0, cloudinaryService_1.uploadToCloudinaryOrLocal)(files.licenceImage[0].path, 'licences');
        }
        if (files?.collegeCardImage) {
            collegeCardImageUrl = await (0, cloudinaryService_1.uploadToCloudinaryOrLocal)(files.collegeCardImage[0].path, 'college_cards');
        }
        if (files?.vehicleImage) {
            vehicleImageUrl = await (0, cloudinaryService_1.uploadToCloudinaryOrLocal)(files.vehicleImage[0].path, 'vehicles');
        }
        if (files) {
            logger_1.default.info("Documents Uploaded");
        }
        // Handle profile photo upload if provided
        if (files?.profilePhoto) {
            const profilePhotoUrl = await (0, cloudinaryService_1.uploadToCloudinaryOrLocal)(files.profilePhoto[0].path, 'profiles');
            await User_1.default.findByIdAndUpdate(userId, { profileImage: profilePhotoUrl });
            logger_1.default.info(`Profile photo updated for user: ${userId}`);
        }
        // Create or update driver application
        if (!driver) {
            driver = await Driver_1.default.create({
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
            logger_1.default.info(`Driver Saved in MongoDB for user: ${userId}`);
        }
        else {
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
            logger_1.default.info(`Driver Saved in MongoDB (Updated) for user: ${userId}`);
        }
        if (phone && !req.user.phone) {
            await User_1.default.findByIdAndUpdate(userId, { phone });
        }
        logger_1.default.info(`Application Created for user: ${userId}`);
        res.status(200).json({
            status: 'success',
            message: 'Your driver application has been successfully created and is pending approval.',
            data: {
                driver,
            },
        });
    }
    catch (error) {
        cleanupUploadedFiles(req.files);
        next(error);
    }
};
exports.applyDriver = applyDriver;
