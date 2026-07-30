"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Message = exports.Chat = void 0;
const mongoose_1 = require("mongoose");
const chatSchema = new mongoose_1.Schema({
    participants: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    ],
    lastMessage: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Message',
    },
}, { timestamps: true });
const messageSchema = new mongoose_1.Schema({
    chat: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Chat',
        required: true,
        index: true,
    },
    sender: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, { timestamps: { createdAt: true, updatedAt: false } });
// Compound index to speed up participant queries
chatSchema.index({ participants: 1 });
chatSchema.index({ updatedAt: -1 });
exports.Chat = (0, mongoose_1.model)('Chat', chatSchema);
exports.Message = (0, mongoose_1.model)('Message', messageSchema);
