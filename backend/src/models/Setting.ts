import { Schema, model, Document } from 'mongoose';

export interface ISetting extends Document {
  key: string;
  value: any;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const settingSchema = new Schema<ISetting>(
  {
    key: {
      type: String,
      required: [true, 'Setting key is required'],
      unique: true,
      trim: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: [true, 'Setting value is required'],
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export const Setting = model<ISetting>('Setting', settingSchema);
export default Setting;
