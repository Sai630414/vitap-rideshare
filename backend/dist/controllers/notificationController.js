"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAsRead = exports.markAllAsRead = exports.getMyNotifications = exports.sendNotificationToUser = void 0;
const Notification_1 = __importDefault(require("../models/Notification"));
const appError_1 = __importDefault(require("../utils/appError"));
const socketService_1 = require("../services/socketService");
const fcmService_1 = require("../services/fcmService");
const logger_1 = __importDefault(require("../utils/logger"));
// Helper function to create DB record and trigger real-time Socket event
const sendNotificationToUser = async (userId, title, body, type, referenceId) => {
    try {
        const notification = await Notification_1.default.create({
            user: userId,
            title,
            body,
            type,
            referenceId,
            isRead: false,
        });
        // Send real-time socket alert
        (0, socketService_1.sendToUser)(userId, 'notification', notification);
        // Trigger FCM Push Notification
        (0, fcmService_1.sendFCMPushNotification)({
            userId,
            title,
            body,
            type,
            referenceId: referenceId ? String(referenceId) : undefined,
        }).catch((err) => logger_1.default.error(`[FCM] Push dispatch error: ${err.message}`));
        return notification;
    }
    catch (error) {
        logger_1.default.error(`Failed to send notification to ${userId}: ${error.message}`);
        return null;
    }
};
exports.sendNotificationToUser = sendNotificationToUser;
const getMyNotifications = async (req, res, next) => {
    try {
        if (!req.user)
            return next(new appError_1.default('Unauthorized', 401));
        const notifications = await Notification_1.default.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50); // limit to last 50 notifications
        res.status(200).json({
            status: 'success',
            results: notifications.length,
            data: {
                notifications,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMyNotifications = getMyNotifications;
const markAllAsRead = async (req, res, next) => {
    try {
        if (!req.user)
            return next(new appError_1.default('Unauthorized', 401));
        await Notification_1.default.updateMany({ user: req.user.id, isRead: false }, { $set: { isRead: true } });
        res.status(200).json({
            status: 'success',
            message: 'All notifications marked as read',
        });
    }
    catch (error) {
        next(error);
    }
};
exports.markAllAsRead = markAllAsRead;
const markAsRead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const notification = await Notification_1.default.findById(id);
        if (!notification) {
            return next(new appError_1.default('Notification not found', 404));
        }
        if (notification.user.toString() !== req.user?.id) {
            return next(new appError_1.default('Unauthorized to update this notification', 403));
        }
        notification.isRead = true;
        await notification.save();
        res.status(200).json({
            status: 'success',
            data: {
                notification,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.markAsRead = markAsRead;
