import { Schema, model, Document } from 'mongoose';

export interface IBooking extends Document {
  ride: Schema.Types.ObjectId;
  passenger: Schema.Types.ObjectId;
  driver: Schema.Types.ObjectId;
  pickup: string;
  drop: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed' | 'expired';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  seatNumber: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    ride: {
      type: Schema.Types.ObjectId,
      ref: 'Ride',
      required: [true, 'Ride reference is required'],
      index: true,
    },
    passenger: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Passenger reference is required'],
      index: true,
    },
    driver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Driver reference is required'],
      index: true,
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
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending',
    },
    seatNumber: {
      type: Number,
      default: 1,
      min: [1, 'Seat count must be at least 1'],
    },
    razorpayOrderId: {
      type: String,
      index: { unique: true, sparse: true },
    },
    razorpayPaymentId: {
      type: String,
      index: { unique: true, sparse: true },
    },
  },
  { timestamps: true }
);

// Prevent duplicate active bookings for the same passenger on the same ride
bookingSchema.index(
  { ride: 1, passenger: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['pending', 'accepted'] },
    },
  }
);

export const Booking = model<IBooking>('Booking', bookingSchema);
export default Booking;
