"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Driver = void 0;
const mongoose_1 = require("mongoose");
const driverSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User reference is required'],
        unique: true,
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
    },
    licenceNumber: {
        type: String,
        required: [true, 'Licence number is required'],
        unique: true,
        trim: true,
        uppercase: true,
    },
    vehicleRCNumber: {
        type: String,
        required: [true, 'Vehicle RC number is required'],
        unique: true,
        trim: true,
        uppercase: true,
    },
    vehicleNumber: {
        type: String,
        required: [true, 'Vehicle registration plate number is required'],
        unique: true,
        trim: true,
        uppercase: true,
    },
    vehicleModel: {
        type: String,
        required: [true, 'Vehicle model is required'],
        trim: true,
    },
    vehicleColour: {
        type: String,
        required: [true, 'Vehicle color is required'],
        trim: true,
    },
    vehicleType: {
        type: String,
        enum: ['bike', 'car'],
        required: [true, 'Vehicle type (bike or car) is required'],
    },
    drivingExperience: {
        type: Number,
        required: [true, 'Driving experience is required'],
        min: 0,
    },
    emergencyContact: {
        type: String,
        required: [true, 'Emergency contact is required'],
        trim: true,
    },
    licenceImage: {
        type: String,
        required: [true, 'Licence image is required'],
    },
    rcImage: {
        type: String,
        required: [true, 'RC image is required'],
    },
    vehicleImage: {
        type: String,
        required: [true, 'Vehicle photo is required'],
    },
    approvalStatus: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'resubmission', 'pending', 'approved', 'rejected'],
        default: 'Pending',
    },
    rejectionReason: {
        type: String,
    },
    paymentStatus: {
        type: Boolean,
        default: false,
    },
    driverStatus: {
        type: String,
        enum: ['PENDING_APPROVAL', 'PAYMENT_PENDING', 'ACTIVE', 'SUSPENDED'],
        default: 'PENDING_APPROVAL',
    },
    documentsUploaded: {
        type: Boolean,
        default: true,
    },
    emailVerified: {
        type: Boolean,
        default: false,
    },
    subscriptionStatus: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Inactive',
    },
}, { timestamps: true });
exports.Driver = (0, mongoose_1.model)('Driver', driverSchema);
exports.default = exports.Driver;
