import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Chat, Message } from '../models/Chat';
import User from '../models/User';
import Booking from '../models/Booking';
import AppError from '../utils/appError';
import { uploadToCloudinaryOrLocal } from '../services/cloudinaryService';
import { getIO } from '../services/socketService';
import { sendNotificationToUser } from './notificationController';

export const getOrCreateChat = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { recipientId } = req.body;
    if (!req.user) return next(new AppError('Unauthorized', 401));

    if (!recipientId) {
      return next(new AppError('Recipient ID is required', 400));
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return next(new AppError('Recipient user not found', 404));
    }

    // Security validation: Only booking participants can access chats.
    // Students cannot chat with random drivers. Drivers cannot message unrelated students.
    // Verify there is an active/completed booking connection between the participants.
    if (req.user.role !== 'admin') {
      const hasBooking = await Booking.findOne({
        $or: [
          { passenger: req.user.id, driver: recipientId },
          { passenger: recipientId, driver: req.user.id },
        ],
        status: { $in: ['pending', 'accepted', 'completed'] },
      });

      if (!hasBooking) {
        return next(
          new AppError(
            'You are not authorized to start a chat with this user as there is no active ride booking connection between you.',
            403
          )
        );
      }
    }

    // Check if chat already exists (exactly these two participants)
    let chat = await Chat.findOne({
      participants: { $all: [req.user.id, recipientId], $size: 2 },
    });

    if (!chat) {
      chat = await Chat.create({
        participants: [req.user.id, recipientId],
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        chat,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { chatId } = req.params;
    const { text } = req.body;
    if (!req.user) return next(new AppError('Unauthorized', 401));

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return next(new AppError('Chat not found', 404));
    }

    // Verify user is a participant
    if (!chat.participants.map(p => p.toString()).includes(req.user.id)) {
      return next(new AppError('You are not authorized in this chat thread', 403));
    }

    let imageUrl = '';
    if (req.file) {
      imageUrl = await uploadToCloudinaryOrLocal(req.file.path, 'chat');
    }

    if (!text && !imageUrl) {
      return next(new AppError('Cannot send an empty message', 400));
    }

    // Create the message
    const message = await Message.create({
      chat: chat._id,
      sender: req.user.id,
      text,
      image: imageUrl,
      seen: false,
    });

    // Update lastMessage on Chat
    chat.lastMessage = message._id as any;
    await chat.save();

    // Populate message sender for socket emission
    const populatedMessage = await Message.findById(message._id).populate(
      'sender',
      'name email profileImage role'
    );

    // Emit via Socket.io (non-fatal if socket layer is unavailable)
    try {
      const io = getIO();
      io.to(chatId).emit('new_message', populatedMessage);
    } catch (socketError) {
      // Socket may be unavailable in some deploy modes
    }

    // Send notifications to recipient(s)
    const recipients = chat.participants.filter(
      (p) => p.toString() !== req.user?.id
    );

    for (const recipientId of recipients) {
      await sendNotificationToUser(
        recipientId.toString(),
        `Message from ${req.user.name}`,
        text || 'Sent an image',
        'chat_message',
        chat._id
      );
    }

    res.status(201).json({
      status: 'success',
      data: {
        message: populatedMessage,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getChatMessages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return next(new AppError('Chat not found', 404));
    }

    if (!chat.participants.map(p => p.toString()).includes(req.user?.id || '')) {
      return next(new AppError('You do not belong to this chat', 403));
    }

    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'name email profileImage role')
      .sort({ createdAt: 1 });

    res.status(200).json({
      status: 'success',
      results: messages.length,
      data: {
        messages,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserChats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));

    // Get all chats where user is participant
    const chats = await Chat.find({
      participants: req.user.id,
    })
      .populate('participants', 'name email profileImage role rating verifiedDriver status')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name' },
      })
      .sort({ updatedAt: -1 });

    res.status(200).json({
      status: 'success',
      results: chats.length,
      data: {
        chats,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const markAsSeen = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { chatId } = req.params;
    if (!req.user) return next(new AppError('Unauthorized', 401));

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return next(new AppError('Chat not found', 404));
    }

    if (!chat.participants.map(p => p.toString()).includes(req.user.id)) {
      return next(new AppError('Unauthorized', 403));
    }

    // Set messages from other participants to seen
    await Message.updateMany(
      { chat: chatId, sender: { $ne: req.user.id }, seen: false },
      { $set: { seen: true } }
    );

    // Emit seen state to socket room
    try {
      const io = getIO();
      io.to(chatId).emit('messages_seen', {
        chatId,
        seenBy: req.user.id,
      });
    } catch {
      // ignore socket errors
    }

    res.status(200).json({
      status: 'success',
      message: 'Messages marked as seen',
    });
  } catch (error) {
    next(error);
  }
};
