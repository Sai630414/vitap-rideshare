"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = require("mongoose");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const userSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        validate: {
            validator: function (v) {
                return v.endsWith('@vitapstudent.ac.in') || v.endsWith('@vitap.ac.in') || v.toLowerCase() === 'saikondareddypala@gmail.com';
            },
            message: 'Only @vitapstudent.ac.in or @vitap.ac.in emails are allowed.',
        },
    },
    phone: {
        type: String,
        trim: true,
    },
    registrationNumber: {
        type: String,
        trim: true,
    },
    year: {
        type: Number,
        min: 1,
        max: 4,
    },
    branch: {
        type: String,
        trim: true,
    },
    profileImage: {
        type: String,
        default: '',
    },
    role: {
        type: String,
        enum: ['student', 'driver', 'admin'],
        default: 'student',
    },
    rating: {
        type: Number,
        default: 5.0,
        min: 0,
        max: 5,
    },
    totalRatingsCount: {
        type: Number,
        default: 0,
    },
    totalTrips: {
        type: Number,
        default: 0,
    },
    verifiedStudent: {
        type: Boolean,
        default: false,
    },
    verifiedDriver: {
        type: Boolean,
        default: false,
    },
    trustScore: {
        type: Number,
        default: 100,
        min: 0,
        max: 100,
    },
    blockedUsers: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
        },
    ],
    status: {
        type: String,
        enum: ['active', 'banned'],
        default: 'active',
    },
    googleId: {
        type: String,
        // sparse unique: many users have no Google link
        index: { unique: true, sparse: true },
    },
    password: {
        type: String,
        select: false,
        minlength: [8, 'Password must be at least 8 characters'],
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    phoneVerified: {
        type: Boolean,
        default: false,
    },
    phoneVerifiedAt: {
        type: Date,
    },
    phoneOTP: {
        type: String,
        select: false,
    },
    phoneOTPExpiry: {
        type: Date,
    },
    phoneVerificationAttempts: {
        type: Number,
        default: 0,
    },
    verificationOTP: {
        type: String,
        select: false,
    },
    verificationOTPExpiry: {
        type: Date,
    },
    resetPasswordToken: {
        type: String,
        select: false,
    },
    resetPasswordExpiry: {
        type: Date,
    },
    fcmToken: {
        type: String,
        default: '',
    },
    fcmTokens: {
        type: [String],
        default: [],
    },
}, { timestamps: true });
userSchema.index({ role: 1, status: 1 });
// Encrypt password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password'))
        return next();
    if (this.password) {
        this.password = await bcryptjs_1.default.hash(this.password, 12);
    }
    next();
});
// Instance method to check password
userSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password)
        return false;
    return await bcryptjs_1.default.compare(candidatePassword, this.password);
};
exports.User = (0, mongoose_1.model)('User', userSchema);
exports.default = exports.User;
