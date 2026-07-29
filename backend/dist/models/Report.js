"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Report = void 0;
const mongoose_1 = require("mongoose");
const reportSchema = new mongoose_1.Schema({
    reporter: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Reporter user reference is required'],
    },
    reportedUser: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Reported user reference is required'],
    },
    reason: {
        type: String,
        required: [true, 'Report reason category is required'],
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        enum: ['pending', 'resolved'],
        default: 'pending',
    },
}, { timestamps: true });
exports.Report = (0, mongoose_1.model)('Report', reportSchema);
exports.default = exports.Report;
