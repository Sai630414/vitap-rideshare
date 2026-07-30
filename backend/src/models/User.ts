import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  registrationNumber?: string;
  year?: number;
  branch?: string;
  profileImage?: string;
  role: 'student' | 'driver' | 'admin';
  rating: number;
  totalRatingsCount: number;
  totalTrips: number;
  verifiedStudent: boolean;
  verifiedDriver: boolean;
  trustScore: number;
  blockedUsers: Schema.Types.ObjectId[];
  status: 'active' | 'banned';
  googleId?: string;
  password?: string; // fallback password for local auth & mock accounts
  isVerified: boolean;
  verificationOTP?: string;
  verificationOTPExpiry?: Date;
  resetPasswordToken?: string;
  resetPasswordExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v: string) {
          return v.endsWith('@vitapstudent.ac.in') || v.endsWith('@vitap.ac.in') || v.toLowerCase() === 'saikondareddypala@gmail.com';
        },
        message: 'Only @vitapstudent.ac.in or @vitap.ac.in emails are allowed.',
      },
    },
    phone: {
      type: String,
      trim: true,
    },
    registrationNumber: {
      type: String,
      trim: true,
    },
    year: {
      type: Number,
      min: 1,
      max: 4,
    },
    branch: {
      type: String,
      trim: true,
    },
    profileImage: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['student', 'driver', 'admin'],
      default: 'student',
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 5,
    },
    totalRatingsCount: {
      type: Number,
      default: 0,
    },
    totalTrips: {
      type: Number,
      default: 0,
    },
    verifiedStudent: {
      type: Boolean,
      default: false,
    },
    verifiedDriver: {
      type: Boolean,
      default: false,
    },
    trustScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    blockedUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    status: {
      type: String,
      enum: ['active', 'banned'],
      default: 'active',
    },
    googleId: {
      type: String,
      index: { unique: true, sparse: true },
    },
    password: {
      type: String,
      select: false, // hide by default
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationOTP: {
      type: String,
      select: false,
    },
    verificationOTPExpiry: {
      type: Date,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpiry: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Encrypt password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  if (this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

// Instance method to check password
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

export const User = model<IUser>('User', userSchema);
export default User;
