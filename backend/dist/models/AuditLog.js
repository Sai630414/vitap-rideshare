"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLog = void 0;
const mongoose_1 = require("mongoose");
const auditLogSchema = new mongoose_1.Schema({
    admin: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, { timestamps: { createdAt: true, updatedAt: false } });
exports.AuditLog = (0, mongoose_1.model)('AuditLog', auditLogSchema);
exports.default = exports.AuditLog;
