"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyLicence = exports.uploadLicence = void 0;
const DrivingLicence_1 = __importDefault(require("../models/DrivingLicence"));
const appError_1 = __importDefault(require("../utils/appError"));
const cloudinaryService_1 = require("../services/cloudinaryService");
const uploadLicence = async (req, res, next) => {
    try {
        const { licenceNumber, expiry } = req.body;
        if (!req.user)
            return next(new appError_1.default('Unauthorized', 401));
        const files = req.files;
        const frontFile = files?.frontImage?.[0];
        const backFile = files?.backImage?.[0];
        if (!licenceNumber || !expiry) {
            return next(new appError_1.default('Licence number and expiry date are required', 400));
        }
        if (!frontFile || !backFile) {
            return next(new appError_1.default('Please upload both front and back images of your driving licence', 400));
        }
        // Check if licence already exists
        const existing = await DrivingLicence_1.default.findOne({ licenceNumber });
        if (existing && existing.user.toString() !== req.user.id) {
            return next(new appError_1.default('Driving licence number already registered by another user', 400));
        }
        // Upload to Cloudinary/Local
        const frontUrl = await (0, cloudinaryService_1.uploadToCloudinaryOrLocal)(frontFile.path, 'licences');
        const backUrl = await (0, cloudinaryService_1.uploadToCloudinaryOrLocal)(backFile.path, 'licences');
        // Create or update driving licence
        const updatedLicence = await DrivingLicence_1.default.findOneAndUpdate({ user: req.user.id }, {
            licenceNumber,
            expiry: new Date(expiry),
            frontImage: frontUrl,
            backImage: backUrl,
            status: 'pending',
        }, { upsert: true, new: true });
        res.status(200).json({
            status: 'success',
            data: {
                licence: updatedLicence,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.uploadLicence = uploadLicence;
const getMyLicence = async (req, res, next) => {
    try {
        if (!req.user)
            return next(new appError_1.default('Unauthorized', 401));
        const licence = await DrivingLicence_1.default.findOne({ user: req.user.id });
        res.status(200).json({
            status: 'success',
            data: {
                licence,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMyLicence = getMyLicence;
