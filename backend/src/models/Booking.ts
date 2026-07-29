import { Schema, model, Document } from 'mongoose';

export interface IBooking extends Document {
  ride: Schema.Types.ObjectId;
  passenger: Schema.Types.ObjectId; // student
  driver: Schema.Types.ObjectId;
  pickup: string;
  drop: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed' | 'expired';
  paymentStatus: 'pending' | 'paid';
  seatNumber: number; // seatCount
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    ride: {
      type: Schema.Types.ObjectId,
      ref: 'Ride',
      required: [true, 'Ride reference is required'],
    },
    passenger: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Passenger reference is required'],
    },
    driver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Driver reference is required'],
    },
    pickup: {
      type: String,
      required: [true, 'Pickup point address is required'],
      trim: true,
    },
    drop: {
      type: String,
      required: [true, 'Drop point address is required'],
      trim: true,
    },
    message: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed', 'expired'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending',
    },
    seatNumber: {
      type: Number,
      default: 1,
      min: [1, 'Seat count must be at least 1'],
    },
  },
  { timestamps: true }
);

// We drop the unique index on { ride, passenger } to support sequential request submissions if rejected or cancelled.
// Instead of an index constraint, we will validate uniqueness of ACTIVE booking requests in the controller.

export const Booking = model<IBooking>('Booking', bookingSchema);
export default Booking;
