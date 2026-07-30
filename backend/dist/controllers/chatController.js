"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAsSeen = exports.getUserChats = exports.getChatMessages = exports.sendMessage = exports.getOrCreateChat = void 0;
const Chat_1 = require("../models/Chat");
const User_1 = __importDefault(require("../models/User"));
const Booking_1 = __importDefault(require("../models/Booking"));
const appError_1 = __importDefault(require("../utils/appError"));
const cloudinaryService_1 = require("../services/cloudinaryService");
const socketService_1 = require("../services/socketService");
const notificationController_1 = require("./notificationController");
const getOrCreateChat = async (req, res, next) => {
    try {
        const { recipientId } = req.body;
        if (!req.user)
            return next(new appError_1.default('Unauthorized', 401));
        if (!recipientId) {
            return next(new appError_1.default('Recipient ID is required', 400));
        }
        const recipient = await User_1.default.findById(recipientId);
        if (!recipient) {
            return next(new appError_1.default('Recipient user not found', 404));
        }
        // Security validation: Only booking participants can access chats.
        // Students cannot chat with random drivers. Drivers cannot message unrelated students.
        // Verify there is an active/completed booking connection between the participants.
        if (req.user.role !== 'admin') {
            const hasBooking = await Booking_1.default.findOne({
                $or: [
                    { passenger: req.user.id, driver: recipientId },
                    { passenger: recipientId, driver: req.user.id },
                ],
                status: { $in: ['pending', 'accepted', 'completed'] },
            });
            if (!hasBooking) {
                return next(new appError_1.default('You are not authorized to start a chat with this user as there is no active ride booking connection between you.', 403));
            }
        }
        // Check if chat already exists
        let chat = await Chat_1.Chat.findOne({
            participants: { $all: [req.user.id, recipientId] },
        });
        if (!chat) {
            chat = await Chat_1.Chat.create({
                participants: [req.user.id, recipientId],
            });
        }
        res.status(200).json({
            status: 'success',
            data: {
                chat,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getOrCreateChat = getOrCreateChat;
const sendMessage = async (req, res, next) => {
    try {
        const { chatId } = req.params;
        const { text } = req.body;
        if (!req.user)
            return next(new appError_1.default('Unauthorized', 401));
        const chat = await Chat_1.Chat.findById(chatId);
        if (!chat) {
            return next(new appError_1.default('Chat not found', 404));
        }
        // Verify user is a participant
        if (!chat.participants.map(p => p.toString()).includes(req.user.id)) {
            return next(new appError_1.default('You are not authorized in this chat thread', 403));
        }
        let imageUrl = '';
        if (req.file) {
            imageUrl = await (0, cloudinaryService_1.uploadToCloudinaryOrLocal)(req.file.path, 'chat');
        }
        if (!text && !imageUrl) {
            return next(new appError_1.default('Cannot send an empty message', 400));
        }
        // Create the message
        const message = await Chat_1.Message.create({
            chat: chat._id,
            sender: req.user.id,
            text,
            image: imageUrl,
            seen: false,
        });
        // Update lastMessage on Chat
        chat.lastMessage = message._id;
        await chat.save();
        // Populate message sender for socket emission
        const populatedMessage = await Chat_1.Message.findById(message._id).populate('sender', 'name email profileImage role');
        // Emit via Socket.io
        const io = (0, socketService_1.getIO)();
        io.to(chatId).emit('new_message', populatedMessage);
        // Send notifications to recipient(s)
        const recipients = chat.participants.filter((p) => p.toString() !== req.user?.id);
        for (const recipientId of recipients) {
            await (0, notificationController_1.sendNotificationToUser)(recipientId.toString(), `Message from ${req.user.name}`, text || 'Sent an image', 'chat_message', chat._id);
        }
        res.status(201).json({
            status: 'success',
            data: {
                message: populatedMessage,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.sendMessage = sendMessage;
const getChatMessages = async (req, res, next) => {
    try {
        const { chatId } = req.params;
        const chat = await Chat_1.Chat.findById(chatId);
        if (!chat) {
            return next(new appError_1.default('Chat not found', 404));
        }
        if (!chat.participants.map(p => p.toString()).includes(req.user?.id || '')) {
            return next(new appError_1.default('You do not belong to this chat', 403));
        }
        const messages = await Chat_1.Message.find({ chat: chatId })
            .populate('sender', 'name email profileImage role')
            .sort({ createdAt: 1 });
        res.status(200).json({
            status: 'success',
            results: messages.length,
            data: {
                messages,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getChatMessages = getChatMessages;
const getUserChats = async (req, res, next) => {
    try {
        if (!req.user)
            return next(new appError_1.default('Unauthorized', 401));
        // Get all chats where user is participant
        const chats = await Chat_1.Chat.find({
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
    }
    catch (error) {
        next(error);
    }
};
exports.getUserChats = getUserChats;
const markAsSeen = async (req, res, next) => {
    try {
        const { chatId } = req.params;
        if (!req.user)
            return next(new appError_1.default('Unauthorized', 401));
        const chat = await Chat_1.Chat.findById(chatId);
        if (!chat) {
            return next(new appError_1.default('Chat not found', 404));
        }
        if (!chat.participants.map(p => p.toString()).includes(req.user.id)) {
            return next(new appError_1.default('Unauthorized', 403));
        }
        // Set messages from other participants to seen
        await Chat_1.Message.updateMany({ chat: chatId, sender: { $ne: req.user.id }, seen: false }, { $set: { seen: true } });
        // Emit seen state to socket room
        const io = (0, socketService_1.getIO)();
        io.to(chatId).emit('messages_seen', {
            chatId,
            seenBy: req.user.id,
        });
        res.status(200).json({
            status: 'success',
            message: 'Messages marked as seen',
        });
    }
    catch (error) {
        next(error);
    }
};
exports.markAsSeen = markAsSeen;
