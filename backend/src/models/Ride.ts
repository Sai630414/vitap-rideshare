import { Schema, model, Document } from 'mongoose';

interface ILocation {
  address: string;
  coordinates: [number, number]; // [longitude, latitude]
}

export interface IRide extends Document {
  driver: Schema.Types.ObjectId;
  vehicle: Schema.Types.ObjectId;
  source: string;
  destination: string;
  pickupLocation: ILocation;
  dropLocation: ILocation;
  departureDate: Date;
  departureTime: string; // "HH:MM" format
  price: number;
  availableSeats: number;
  description?: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  recurring: {
    isRecurring: boolean;
    days?: string[]; // e.g., ['Monday', 'Wednesday']
  };
  routePoints?: {
    coordinates: [number, number][]; // polyline coords for routes
  };
  createdAt: Date;
  updatedAt: Date;
}

const rideSchema = new Schema<IRide>(
  {
    driver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Driver reference is required'],
    },
    vehicle: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Vehicle reference is required'],
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
        validate: {
          validator: (v: number[]) => v.length === 2,
          message: 'Pickup coordinates must be [longitude, latitude]',
        },
      },
    },
    dropLocation: {
      address: { type: String, required: true },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (v: number[]) => v.length === 2,
          message: 'Drop coordinates must be [longitude, latitude]',
        },
      },
    },
    departureDate: {
      type: Date,
      required: [true, 'Departure date is required'],
    },
    departureTime: {
      type: String,
      required: [true, 'Departure time (HH:MM) is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price per seat is required'],
      min: [0, 'Price cannot be negative'],
    },
    availableSeats: {
      type: Number,
      required: [true, 'Available seats count is required'],
      min: [0, 'Seats cannot be negative'],
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    recurring: {
      isRecurring: { type: Boolean, default: false },
      days: { type: [String] },
    },
    routePoints: {
      coordinates: { type: [[Number]], default: [] },
    },
  },
  { timestamps: true }
);

// Index for query searching
rideSchema.index({ 'pickupLocation.coordinates': '2dsphere' });
rideSchema.index({ 'dropLocation.coordinates': '2dsphere' });
rideSchema.index({ driver: 1, status: 1, departureDate: 1 });
rideSchema.index({ status: 1, departureDate: 1 });
rideSchema.index({ source: 1, destination: 1, departureDate: 1 });

export const Ride = model<IRide>('Ride', rideSchema);
export default Ride;
