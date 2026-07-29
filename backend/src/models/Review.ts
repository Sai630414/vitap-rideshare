import { Schema, model, Document } from 'mongoose';

export interface IReview extends Document {
  ride: Schema.Types.ObjectId;
  driver: Schema.Types.ObjectId;
  passenger: Schema.Types.ObjectId;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    ride: {
      type: Schema.Types.ObjectId,
      ref: 'Ride',
      required: [true, 'Ride reference is required'],
    },
    driver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Driver reference is required'],
    },
    passenger: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Passenger reference is required'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating (1-5) is required'],
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Unique review per ride passenger
reviewSchema.index({ ride: 1, passenger: 1 }, { unique: true });

export const Review = model<IReview>('Review', reviewSchema);
export default Review;
