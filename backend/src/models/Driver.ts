import { Schema, model, Document, Types } from 'mongoose';

export interface IDriver extends Document {
  user: Types.ObjectId;
  phone: string;
  licenceNumber?: string;
  collegeCardNumber?: string;
  vehicleNumber: string;
  vehicleModel: string;
  vehicleColour: string;
  vehicleType: 'bike' | 'car';
  drivingExperience: number;
  emergencyContact: string;
  licenceImage?: string;
  collegeCardImage?: string;
  vehicleImage: string;
  approvalStatus: 'Pending' | 'Approved' | 'Rejected' | 'resubmission' | 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  paymentStatus: boolean;
  driverStatus: 'PENDING_APPROVAL' | 'PAYMENT_PENDING' | 'ACTIVE' | 'SUSPENDED';
  documentsUploaded: boolean;
  emailVerified: boolean;
  subscriptionStatus: 'Active' | 'Inactive';
  createdAt: Date;
  updatedAt: Date;
}

const driverSchema = new Schema<IDriver>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    licenceNumber: {
      type: String,
      trim: true,
      uppercase: true,
      index: { unique: true, sparse: true },
    },
    collegeCardNumber: {
      type: String,
      trim: true,
      uppercase: true,
      index: { unique: true, sparse: true },
    },
    vehicleNumber: {
      type: String,
      required: [true, 'Vehicle registration plate number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    vehicleModel: {
      type: String,
      required: [true, 'Vehicle model is required'],
      trim: true,
    },
    vehicleColour: {
      type: String,
      required: [true, 'Vehicle color is required'],
      trim: true,
    },
    vehicleType: {
      type: String,
      enum: ['bike', 'car'],
      required: [true, 'Vehicle type (bike or car) is required'],
    },
    drivingExperience: {
      type: Number,
      required: [true, 'Driving experience is required'],
      min: 0,
    },
    emergencyContact: {
      type: String,
      required: [true, 'Emergency contact is required'],
      trim: true,
    },
    licenceImage: {
      type: String,
    },
    collegeCardImage: {
      type: String,
    },
    vehicleImage: {
      type: String,
      required: [true, 'Vehicle photo is required'],
    },
    approvalStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'resubmission', 'pending', 'approved', 'rejected'],
      default: 'Pending',
    },
    rejectionReason: {
      type: String,
    },
    paymentStatus: {
      type: Boolean,
      default: false,
    },
    driverStatus: {
      type: String,
      enum: ['PENDING_APPROVAL', 'PAYMENT_PENDING', 'ACTIVE', 'SUSPENDED'],
      default: 'PENDING_APPROVAL',
    },
    documentsUploaded: {
      type: Boolean,
      default: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    subscriptionStatus: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Inactive',
    },
  },
  { timestamps: true }
);

export const Driver = model<IDriver>('Driver', driverSchema);
export default Driver;
