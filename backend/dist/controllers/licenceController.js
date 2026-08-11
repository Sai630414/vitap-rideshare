"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyLicence = exports.uploadLicence = void 0;
const DrivingLicence_1 = __importDefault(require("../models/DrivingLicence"));
const appError_1 = __importDefault(require("../utils/appError"));
const r2Service_1 = require("../services/r2Service");
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
        const userLicence = await DrivingLicence_1.default.findOne({ user: req.user.id });
        if (userLicence) {
            if (userLicence.frontImage)
                await (0, r2Service_1.deleteFromR2)(userLicence.frontImage);
            if (userLicence.backImage)
                await (0, r2Service_1.deleteFromR2)(userLicence.backImage);
        }
        // Upload to Cloudflare R2
        const frontResult = await (0, r2Service_1.uploadToR2)(frontFile, 'licences', req.user.id);
        const backResult = await (0, r2Service_1.uploadToR2)(backFile, 'licences', req.user.id);
        // Create or update driving licence
        const updatedLicence = await DrivingLicence_1.default.findOneAndUpdate({ user: req.user.id }, {
            licenceNumber,
            expiry: new Date(expiry),
            frontImage: frontResult.url,
            backImage: backResult.url,
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
