"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Vehicle = void 0;
const mongoose_1 = require("mongoose");
const vehicleSchema = new mongoose_1.Schema({
    owner: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Vehicle owner reference is required'],
    },
    type: {
        type: String,
        enum: ['bike', 'car'],
        required: [true, 'Vehicle type (bike or car) is required'],
    },
    brand: {
        type: String,
        required: [true, 'Vehicle brand is required'],
        trim: true,
    },
    model: {
        type: String,
        required: [true, 'Vehicle model is required'],
        trim: true,
    },
    numberPlate: {
        type: String,
        required: [true, 'Vehicle registration plate is required'],
        unique: true,
        trim: true,
        uppercase: true,
    },
    color: {
        type: String,
        required: [true, 'Vehicle color is required'],
        trim: true,
    },
    seats: {
        type: Number,
        required: [true, 'Available passenger seats count is required'],
        min: [1, 'Must offer at least 1 seat'],
    },
    insuranceExpiry: {
        type: Date,
    },
    verified: {
        type: Boolean,
        default: false,
    },
    status: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending',
    },
}, { timestamps: true });
vehicleSchema.index({ owner: 1 });
vehicleSchema.index({ owner: 1, status: 1 });
exports.Vehicle = (0, mongoose_1.model)('Vehicle', vehicleSchema);
exports.default = exports.Vehicle;
