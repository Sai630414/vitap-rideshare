import { Schema, model, Document } from 'mongoose';

export interface IChat extends Document {
  participants: Schema.Types.ObjectId[];
  lastMessage?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessage extends Document {
  chat: Schema.Types.ObjectId;
  sender: Schema.Types.ObjectId;
  text?: string;
  image?: string;
  seen: boolean;
  createdAt: Date;
}

const chatSchema = new Schema<IChat>(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
  },
  { timestamps: true }
);

const messageSchema = new Schema<IMessage>(
  {
    chat: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      default: '',
    },
    seen: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Compound index to speed up participant queries
chatSchema.index({ participants: 1 });

export const Chat = model<IChat>('Chat', chatSchema);
export const Message = model<IMessage>('Message', messageSchema);
