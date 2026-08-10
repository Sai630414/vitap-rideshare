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
const r2Service_1 = require("../services/r2Service");
const socketService_1 = require("../services/socketService");
const notificationController_1 = require("./notificationController");
const notification_service_1 = __importDefault(require("../services/notification.service"));
/**
 * Helper function to verify whether chat messaging is allowed between two users.
 * Returns { allowed: boolean; reason?: string }
 * If all bookings between users belong to completed/cancelled rides or bookings, chat is disabled.
 */
const checkChatEligibility = async (userId1, userId2) => {
    const bookings = await Booking_1.default.find({
        $or: [
            { passenger: userId1, driver: userId2 },
            { passenger: userId2, driver: userId1 },
        ],
    }).populate('ride');
    if (!bookings || bookings.length === 0) {
        return {
            allowed: false,
            reason: 'No ride booking connection exists between these users.',
        };
    }
    // Check if there is AT LEAST ONE active booking (pending or accepted) where ride status is scheduled or ongoing
    const hasActiveRideBooking = bookings.some((b) => {
        const rideStatus = b.ride?.status;
        const isBookingActive = b.status === 'accepted' || b.status === 'pending';
        const isRideActive = rideStatus === 'scheduled' || rideStatus === 'ongoing';
        return isBookingActive && isRideActive;
    });
    if (!hasActiveRideBooking) {
        return {
            allowed: false,
            reason: 'Chat is disabled because the ride has been completed.',
        };
    }
    return { allowed: true };
};
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
        // Security validation: Only booking participants with active rides can chat.
        if (req.user.role !== 'admin') {
            const eligibility = await checkChatEligibility(req.user.id, recipientId);
            if (!eligibility.allowed) {
                return next(new appError_1.default(eligibility.reason || 'Chat is disabled because the ride has been completed.', 403));
            }
        }
        // Check if chat already exists (exactly these two participants)
        let chat = await Chat_1.Chat.findOne({
            participants: { $all: [req.user.id, recipientId], $size: 2 },
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
        if (!chat.participants.map((p) => p.toString()).includes(req.user.id)) {
            return next(new appError_1.default('You are not authorized in this chat thread', 403));
        }
        // Check if ride is completed or booking connection is inactive
        if (req.user.role !== 'admin') {
            const recipientId = chat.participants
                .find((p) => p.toString() !== req.user?.id)
                ?.toString();
            if (recipientId) {
                const eligibility = await checkChatEligibility(req.user.id, recipientId);
                if (!eligibility.allowed) {
                    return next(new appError_1.default(eligibility.reason || 'Chat is disabled because the ride has been completed.', 403));
                }
            }
        }
        let imageUrl = '';
        if (req.file) {
            const uploadRes = await (0, r2Service_1.uploadToR2)(req.file, 'chat', req.user.id);
            imageUrl = uploadRes.url;
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
        // Emit via Socket.io (non-fatal if socket layer is unavailable)
        try {
            const io = (0, socketService_1.getIO)();
            io.to(chatId).emit('new_message', populatedMessage);
        }
        catch (socketError) {
            // Socket may be unavailable in some deploy modes
        }
        // Send notifications to recipient(s)
        const recipients = chat.participants.filter((p) => p.toString() !== req.user?.id);
        for (const recipientId of recipients) {
            const recipientStr = recipientId.toString();
            // Always store in-app notification & emit socket event
            await (0, notificationController_1.sendNotificationToUser)(recipientStr, `Message from ${req.user.name}`, text || 'Sent an image', 'new_message', chat._id);
            // Only send push notification if user is NOT currently viewing this chat room
            const isViewingChat = (0, socketService_1.isUserInChatRoom)(recipientStr, chatId);
            if (!isViewingChat) {
                await notification_service_1.default.sendChatNotification(recipientStr, req.user.name, text || 'Sent an image', chatId);
            }
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
        if (!req.user)
            return next(new appError_1.default('Unauthorized', 401));
        const chat = await Chat_1.Chat.findById(chatId);
        if (!chat) {
            return next(new appError_1.default('Chat not found', 404));
        }
        if (!chat.participants.map((p) => p.toString()).includes(req.user?.id || '')) {
            return next(new appError_1.default('You do not belong to this chat', 403));
        }
        let isCompleted = false;
        if (req.user?.role !== 'admin') {
            const recipientId = chat.participants
                .find((p) => p.toString() !== req.user?.id)
                ?.toString();
            if (recipientId) {
                const eligibility = await checkChatEligibility(req.user.id, recipientId);
                if (!eligibility.allowed) {
                    isCompleted = true;
                }
            }
        }
        const messages = await Chat_1.Message.find({ chat: chatId })
            .populate('sender', 'name email profileImage role')
            .sort({ createdAt: 1 });
        res.status(200).json({
            status: 'success',
            results: messages.length,
            data: {
                messages,
                isCompleted,
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
        const rawChats = await Chat_1.Chat.find({
            participants: req.user.id,
        })
            .populate('participants', 'name email profileImage role rating verifiedDriver status')
            .populate({
            path: 'lastMessage',
            populate: { path: 'sender', select: 'name' },
        })
            .sort({ updatedAt: -1 });
        const chats = await Promise.all(rawChats.map(async (chat) => {
            const chatObj = chat.toObject();
            const otherParticipant = chat.participants.find((p) => p._id.toString() !== req.user?.id);
            let isCompleted = false;
            if (otherParticipant && req.user?.role !== 'admin') {
                const eligibility = await checkChatEligibility(req.user.id, otherParticipant._id.toString());
                if (!eligibility.allowed) {
                    isCompleted = true;
                }
            }
            return {
                ...chatObj,
                isCompleted,
            };
        }));
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
        if (!chat.participants.map((p) => p.toString()).includes(req.user.id)) {
            return next(new appError_1.default('Unauthorized', 403));
        }
        // Set messages from other participants to seen
        await Chat_1.Message.updateMany({ chat: chatId, sender: { $ne: req.user.id }, seen: false }, { $set: { seen: true } });
        // Emit seen state to socket room
        try {
            const io = (0, socketService_1.getIO)();
            io.to(chatId).emit('messages_seen', {
                chatId,
                seenBy: req.user.id,
            });
        }
        catch {
            // ignore socket errors
        }
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
