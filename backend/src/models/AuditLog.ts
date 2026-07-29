import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  admin: Types.ObjectId;
  action: string;
  target?: string;
  details?: string;
  ipAddress?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    admin: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Admin user reference is required'],
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
    },
    target: {
      type: String,
      trim: true,
    },
    details: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
export default AuditLog;
