import { Schema, model, Document } from 'mongoose';

export interface INotification extends Document {
  user: Schema.Types.ObjectId; // recipient
  title: string;
  body: string;
  isRead: boolean;
  type:
    | 'ride_accepted'
    | 'ride_cancelled'
    | 'booking_request'
    | 'verification_approved'
    | 'chat_message'
    | 'sos_alert'
    | 'ride_booked'
    | 'booking_accepted'
    | 'booking_rejected'
    | 'driver_started'
    | 'driver_arrived'
    | 'ride_completed'
    | 'new_message'
    | 'new_review';
  referenceId?: Schema.Types.ObjectId; // generic link ID (e.g. ride ID, booking ID)
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient user reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    body: {
      type: String,
      required: [true, 'Notification body is required'],
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: [
        // Legacy types (kept for backward compat)
        'ride_accepted',
        'ride_cancelled',
        'booking_request',
        'verification_approved',
        'chat_message',
        'sos_alert',
        // New specific types (Feature 6)
        'ride_booked',
        'booking_accepted',
        'booking_rejected',
        'driver_started',
        'driver_arrived',
        'ride_completed',
        'new_message',
        'new_review',
      ],
      required: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
    },
  },
  { timestamps: true }
);

export const Notification = model<INotification>('Notification', notificationSchema);
export default Notification;
