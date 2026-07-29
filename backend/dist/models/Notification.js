"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notification = void 0;
const mongoose_1 = require("mongoose");
const notificationSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
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
            'ride_accepted',
            'ride_cancelled',
            'booking_request',
            'verification_approved',
            'chat_message',
            'sos_alert',
        ],
        required: true,
    },
    referenceId: {
        type: mongoose_1.Schema.Types.ObjectId,
    },
}, { timestamps: true });
exports.Notification = (0, mongoose_1.model)('Notification', notificationSchema);
exports.default = exports.Notification;
