import { z } from 'zod';

const studentEmailRegex = /^[a-zA-Z0-9._%+-]+@vitapstudent\.ac\.in$/;
const collegeEmailRegex = /^[a-zA-Z0-9._%+-]+@(vitapstudent\.ac\.in|vitap\.ac\.in)$/;

export const googleLoginSchema = z.object({
  body: z.object({
    idToken: z.string({
      required_error: 'Google ID token is required',
    }),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    phone: z.string().min(10, 'Phone number must be at least 10 digits').optional(),
    registrationNumber: z.string().min(5, 'Registration number must be valid').optional(),
    year: z.number().min(1).max(4).optional(),
    branch: z.string().min(2, 'Branch name must be valid').optional(),
  }),
});

/**
 * Student Manual Registration Validator
 */
export const signupSchema = z.object({
  body: z
    .object({
      name: z
        .string({ required_error: 'Full name is required' })
        .min(2, 'Name must be at least 2 characters'),
      email: z
        .string({ required_error: 'Email is required' })
        .email('Invalid email address')
        .refine((val) => studentEmailRegex.test(val), {
          message: 'Only @vitapstudent.ac.in emails are allowed for students',
        }),
      password: z
        .string({ required_error: 'Password is required' })
        .min(8, 'Password must be at least 8 characters')
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        ),
      confirmPassword: z.string({ required_error: 'Confirm password is required' }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
});

/**
 * Driver Manual Registration Validator
 */
export const driverSignupSchema = z.object({
  body: z
    .object({
      name: z
        .string({ required_error: 'Full name is required' })
        .min(2, 'Name must be at least 2 characters'),
      email: z
        .string({ required_error: 'College email is required' })
        .email('Invalid email address')
        .refine((val) => collegeEmailRegex.test(val), {
          message: 'Only @vitapstudent.ac.in or @vitap.ac.in emails are allowed for drivers',
        }),
      phone: z
        .string({ required_error: 'Phone number is required' })
        .min(10, 'Phone number must be at least 10 digits'),
      password: z
        .string({ required_error: 'Password is required' })
        .min(8, 'Password must be at least 8 characters')
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        ),
      confirmPassword: z.string({ required_error: 'Confirm password is required' }),
      licenceNumber: z
        .string()
        .optional()
        .transform(val => val ? val.toUpperCase() : undefined),
      collegeCardNumber: z
        .string()
        .optional()
        .transform(val => val ? val.toUpperCase() : undefined),
      vehicleNumber: z
        .string({ required_error: 'Vehicle Number is required' })
        .min(5, 'Vehicle registration plate number is invalid')
        .toUpperCase(),
      vehicleModel: z
        .string({ required_error: 'Vehicle Model is required' })
        .min(2, 'Vehicle model description must be specified'),
      vehicleColour: z
        .string({ required_error: 'Vehicle Colour is required' })
        .min(2, 'Vehicle color must be specified'),
      vehicleType: z.enum(['bike', 'car'], {
        required_error: 'Vehicle type must be bike or car',
      }),
      drivingExperience: z
        .string({ required_error: 'Driving experience is required' })
        .transform((val) => Number(val))
        .refine((val) => !isNaN(val) && val >= 0, {
          message: 'Driving experience must be a non-negative number of years',
        }),
      emergencyContact: z
        .string({ required_error: 'Emergency Contact phone is required' })
        .min(10, 'Emergency contact phone is invalid'),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    })
    .refine((data) => data.licenceNumber || data.collegeCardNumber, {
      message: 'Either Driving Licence or College ID Card details must be provided',
      path: ['licenceNumber'],
    }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .email('Invalid email address'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(1, 'Password is required'),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .email('Invalid email address'),
    otp: z
      .string({ required_error: 'OTP is required' })
      .length(6, 'OTP must be exactly 6 digits')
      .regex(/^\d+$/, 'OTP must be numeric'),
  }),
});

export const resendOtpSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .email('Invalid email address'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .email('Invalid email address'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z
    .object({
      token: z.string({ required_error: 'Reset token is required' }),
      password: z
        .string({ required_error: 'Password is required' })
        .min(8, 'Password must be at least 8 characters')
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        ),
      confirmPassword: z.string({ required_error: 'Confirm password is required' }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
});
