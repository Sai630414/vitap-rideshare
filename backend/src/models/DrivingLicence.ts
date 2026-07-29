import { Schema, model, Document } from 'mongoose';

export interface IDrivingLicence extends Document {
  user: Schema.Types.ObjectId;
  licenceNumber: string;
  expiry: Date;
  frontImage: string;
  backImage: string;
  status: 'pending' | 'verified' | 'rejected';
  verifiedBy?: Schema.Types.ObjectId;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const drivingLicenceSchema = new Schema<IDrivingLicence>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
    },
    licenceNumber: {
      type: String,
      required: [true, 'Licence number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    expiry: {
      type: Date,
      required: [true, 'Licence expiry date is required'],
    },
    frontImage: {
      type: String,
      required: [true, 'Front image of the licence is required'],
    },
    backImage: {
      type: String,
      required: [true, 'Back image of the licence is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

export const DrivingLicence = model<IDrivingLicence>('DrivingLicence', drivingLicenceSchema);
export default DrivingLicence;
