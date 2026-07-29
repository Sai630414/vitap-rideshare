import { Schema, model, Document } from 'mongoose';

interface ILocation {
  address: string;
  coordinates: [number, number]; // [longitude, latitude]
}

export interface IRideRequest extends Document {
  user: Schema.Types.ObjectId;
  source: string;
  destination: string;
  pickupLocation: ILocation;
  dropLocation: ILocation;
  departureDate: Date;
  departureTime: string;
  seatsNeeded: number;
  description?: string;
  status: 'active' | 'fulfilled' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const rideRequestSchema = new Schema<IRideRequest>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    source: {
      type: String,
      required: [true, 'Source location name is required'],
      trim: true,
    },
    destination: {
      type: String,
      required: [true, 'Destination location name is required'],
      trim: true,
    },
    pickupLocation: {
      address: { type: String, required: true },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    dropLocation: {
      address: { type: String, required: true },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    departureDate: {
      type: Date,
      required: [true, 'Requested date is required'],
    },
    departureTime: {
      type: String,
      required: [true, 'Requested time range/hour is required'],
      trim: true,
    },
    seatsNeeded: {
      type: Number,
      default: 1,
      min: 1,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'fulfilled', 'cancelled'],
      default: 'active',
    },
  },
  { timestamps: true }
);

export const RideRequest = model<IRideRequest>('RideRequest', rideRequestSchema);
export default RideRequest;
