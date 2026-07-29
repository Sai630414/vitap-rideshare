"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.resendOtpSchema = exports.verifyOtpSchema = exports.loginSchema = exports.driverSignupSchema = exports.signupSchema = exports.updateProfileSchema = exports.googleLoginSchema = void 0;
const zod_1 = require("zod");
const studentEmailRegex = /^[a-zA-Z0-9._%+-]+@vitapstudent\.ac\.in$/;
const collegeEmailRegex = /^[a-zA-Z0-9._%+-]+@(vitapstudent\.ac\.in|vitap\.ac\.in)$/;
exports.googleLoginSchema = zod_1.z.object({
    body: zod_1.z.object({
        idToken: zod_1.z.string({
            required_error: 'Google ID token is required',
        }),
    }),
});
exports.updateProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(2, 'Name must be at least 2 characters').optional(),
        phone: zod_1.z.string().min(10, 'Phone number must be at least 10 digits').optional(),
        registrationNumber: zod_1.z.string().min(5, 'Registration number must be valid').optional(),
        year: zod_1.z.number().min(1).max(4).optional(),
        branch: zod_1.z.string().min(2, 'Branch name must be valid').optional(),
    }),
});
/**
 * Student Manual Registration Validator
 */
exports.signupSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        name: zod_1.z
            .string({ required_error: 'Full name is required' })
            .min(2, 'Name must be at least 2 characters'),
        email: zod_1.z
            .string({ required_error: 'Email is required' })
            .email('Invalid email address')
            .refine((val) => studentEmailRegex.test(val), {
            message: 'Only @vitapstudent.ac.in emails are allowed for students',
        }),
        password: zod_1.z
            .string({ required_error: 'Password is required' })
            .min(8, 'Password must be at least 8 characters')
            .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
        confirmPassword: zod_1.z.string({ required_error: 'Confirm password is required' }),
    })
        .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    }),
});
/**
 * Driver Manual Registration Validator
 */
exports.driverSignupSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        name: zod_1.z
            .string({ required_error: 'Full name is required' })
            .min(2, 'Name must be at least 2 characters'),
        email: zod_1.z
            .string({ required_error: 'College email is required' })
            .email('Invalid email address')
            .refine((val) => collegeEmailRegex.test(val), {
            message: 'Only @vitapstudent.ac.in or @vitap.ac.in emails are allowed for drivers',
        }),
        phone: zod_1.z
            .string({ required_error: 'Phone number is required' })
            .min(10, 'Phone number must be at least 10 digits'),
        password: zod_1.z
            .string({ required_error: 'Password is required' })
            .min(8, 'Password must be at least 8 characters')
            .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
        confirmPassword: zod_1.z.string({ required_error: 'Confirm password is required' }),
        licenceNumber: zod_1.z
            .string({ required_error: 'Driving Licence Number is required' })
            .min(5, 'Licence number is invalid')
            .toUpperCase(),
        vehicleRCNumber: zod_1.z
            .string({ required_error: 'Vehicle RC Number is required' })
            .min(5, 'RC number is invalid')
            .toUpperCase(),
        vehicleNumber: zod_1.z
            .string({ required_error: 'Vehicle Number is required' })
            .min(5, 'Vehicle registration plate number is invalid')
            .toUpperCase(),
        vehicleModel: zod_1.z
            .string({ required_error: 'Vehicle Model is required' })
            .min(2, 'Vehicle model description must be specified'),
        vehicleColour: zod_1.z
            .string({ required_error: 'Vehicle Colour is required' })
            .min(2, 'Vehicle color must be specified'),
        vehicleType: zod_1.z.enum(['bike', 'car'], {
            required_error: 'Vehicle type must be bike or car',
        }),
        drivingExperience: zod_1.z
            .string({ required_error: 'Driving experience is required' })
            .transform((val) => Number(val))
            .refine((val) => !isNaN(val) && val >= 0, {
            message: 'Driving experience must be a non-negative number of years',
        }),
        emergencyContact: zod_1.z
            .string({ required_error: 'Emergency Contact phone is required' })
            .min(10, 'Emergency contact phone is invalid'),
    })
        .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    }),
});
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z
            .string({ required_error: 'Email is required' })
            .email('Invalid email address'),
        password: zod_1.z
            .string({ required_error: 'Password is required' })
            .min(1, 'Password is required'),
    }),
});
exports.verifyOtpSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z
            .string({ required_error: 'Email is required' })
            .email('Invalid email address'),
        otp: zod_1.z
            .string({ required_error: 'OTP is required' })
            .length(6, 'OTP must be exactly 6 digits')
            .regex(/^\d+$/, 'OTP must be numeric'),
    }),
});
exports.resendOtpSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z
            .string({ required_error: 'Email is required' })
            .email('Invalid email address'),
    }),
});
exports.forgotPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z
            .string({ required_error: 'Email is required' })
            .email('Invalid email address'),
    }),
});
exports.resetPasswordSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        token: zod_1.z.string({ required_error: 'Reset token is required' }),
        password: zod_1.z
            .string({ required_error: 'Password is required' })
            .min(8, 'Password must be at least 8 characters')
            .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
        confirmPassword: zod_1.z.string({ required_error: 'Confirm password is required' }),
    })
        .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    }),
});
