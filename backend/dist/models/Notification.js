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
            // Legacy types (kept for backward compat)
            'ride_accepted',
            'ride_cancelled',
            'booking_request',
            'verification_approved',
            'chat_message',
            'sos_alert',
            // New specific types (Feature 6)
            'ride_booked',
            'booking_accepted',
            'booking_rejected',
            'driver_started',
            'driver_arrived',
            'ride_completed',
            'new_message',
            'new_review',
        ],
        required: true,
    },
    referenceId: {
        type: mongoose_1.Schema.Types.ObjectId,
    },
}, { timestamps: true });
exports.Notification = (0, mongoose_1.model)('Notification', notificationSchema);
exports.default = exports.Notification;
