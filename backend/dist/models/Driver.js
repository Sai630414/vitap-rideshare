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
        trim: true,
        uppercase: true,
        // sparse unique: multiple docs may omit this field
        index: { unique: true, sparse: true },
    },
    collegeCardNumber: {
        type: String,
        trim: true,
        uppercase: true,
        index: { unique: true, sparse: true },
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
    },
    collegeCardImage: {
        type: String,
    },
    vehicleImage: {
        type: String,
        required: [true, 'Vehicle photo is required'],
    },
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'resubmission'],
        default: 'pending',
        index: true,
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
        index: true,
    },
    documentsUploaded: {
        type: Boolean,
        default: false,
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
// Normalize legacy mixed-case approval values before validate/save
driverSchema.pre('validate', function (next) {
    if (typeof this.approvalStatus === 'string') {
        const normalized = this.approvalStatus.toLowerCase();
        if (normalized === 'pending' || normalized === 'approved' || normalized === 'rejected' || normalized === 'resubmission') {
            this.approvalStatus = normalized;
        }
    }
    // Treat empty strings as unset so sparse unique indexes work
    if (this.licenceNumber === '')
        this.licenceNumber = undefined;
    if (this.collegeCardNumber === '')
        this.collegeCardNumber = undefined;
    next();
});
exports.Driver = (0, mongoose_1.model)('Driver', driverSchema);
exports.default = exports.Driver;
