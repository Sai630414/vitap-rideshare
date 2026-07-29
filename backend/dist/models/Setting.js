"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Setting = void 0;
const mongoose_1 = require("mongoose");
const settingSchema = new mongoose_1.Schema({
    key: {
        type: String,
        required: [true, 'Setting key is required'],
        unique: true,
        trim: true,
    },
    value: {
        type: mongoose_1.Schema.Types.Mixed,
        required: [true, 'Setting value is required'],
    },
    description: {
        type: String,
        trim: true,
    },
}, { timestamps: true });
exports.Setting = (0, mongoose_1.model)('Setting', settingSchema);
exports.default = exports.Setting;
