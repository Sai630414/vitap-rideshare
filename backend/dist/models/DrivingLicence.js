"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrivingLicence = void 0;
const mongoose_1 = require("mongoose");
const drivingLicenceSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User reference is required'],
        unique: true,
    },
    licenceNumber: {
        type: String,
        required: [true, 'Licence number is required'],
        unique: true,
        trim: true,
        uppercase: true,
    },
    expiry: {
        type: Date,
        required: [true, 'Licence expiry date is required'],
    },
    frontImage: {
        type: String,
        required: [true, 'Front image of the licence is required'],
    },
    backImage: {
        type: String,
        required: [true, 'Back image of the licence is required'],
    },
    status: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending',
    },
    verifiedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    verifiedAt: {
        type: Date,
    },
}, { timestamps: true });
exports.DrivingLicence = (0, mongoose_1.model)('DrivingLicence', drivingLicenceSchema);
exports.default = exports.DrivingLicence;
