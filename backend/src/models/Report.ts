import { Schema, model, Document } from 'mongoose';

export interface IReport extends Document {
  reporter: Schema.Types.ObjectId;
  reportedUser: Schema.Types.ObjectId;
  reason: string;
  description?: string;
  status: 'pending' | 'resolved';
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    reporter: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter user reference is required'],
    },
    reportedUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reported user reference is required'],
    },
    reason: {
      type: String,
      required: [true, 'Report reason category is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'resolved'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

export const Report = model<IReport>('Report', reportSchema);
export default Report;
