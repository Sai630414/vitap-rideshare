"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVehicle = exports.getMyVehicles = exports.uploadVehicleRC = exports.registerVehicle = void 0;
const Vehicle_1 = __importDefault(require("../models/Vehicle"));
const appError_1 = __importDefault(require("../utils/appError"));
const cloudinaryService_1 = require("../services/cloudinaryService");
const registerVehicle = async (req, res, next) => {
    try {
        const { type, brand, model, numberPlate, color, seats, insuranceExpiry } = req.body;
        if (!req.user)
            return next(new appError_1.default('Unauthorized', 401));
        // Check if plate already registered
        const existing = await Vehicle_1.default.findOne({ numberPlate });
        if (existing) {
            return next(new appError_1.default('Vehicle plate number already registered', 400));
        }
        const vehicle = await Vehicle_1.default.create({
            owner: req.user.id,
            type,
            brand,
            model,
            numberPlate,
            color,
            seats,
            insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : undefined,
            verified: false,
            status: 'pending',
        });
        res.status(201).json({
            status: 'success',
            data: {
                vehicle,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.registerVehicle = registerVehicle;
const uploadVehicleRC = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!req.file) {
            return next(new appError_1.default('Please upload an RC document image', 400));
        }
        const vehicle = await Vehicle_1.default.findById(id);
        if (!vehicle) {
            return next(new appError_1.default('Vehicle not found', 404));
        }
        // Authorize owner
        if (vehicle.owner.toString() !== req.user?.id && req.user?.role !== 'admin') {
            return next(new appError_1.default('You do not own this vehicle', 403));
        }
        const rcUrl = await (0, cloudinaryService_1.uploadToCloudinaryOrLocal)(req.file.path, 'vehicles');
        vehicle.rcImage = rcUrl;
        vehicle.status = 'pending'; // reset status to pending when a document is updated
        await vehicle.save();
        res.status(200).json({
            status: 'success',
            data: {
                vehicle,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.uploadVehicleRC = uploadVehicleRC;
const getMyVehicles = async (req, res, next) => {
    try {
        if (!req.user)
            return next(new appError_1.default('Unauthorized', 401));
        const vehicles = await Vehicle_1.default.find({ owner: req.user.id });
        res.status(200).json({
            status: 'success',
            data: {
                vehicles,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMyVehicles = getMyVehicles;
const deleteVehicle = async (req, res, next) => {
    try {
        const { id } = req.params;
        const vehicle = await Vehicle_1.default.findById(id);
        if (!vehicle) {
            return next(new appError_1.default('Vehicle not found', 404));
        }
        if (vehicle.owner.toString() !== req.user?.id && req.user?.role !== 'admin') {
            return next(new appError_1.default('You are not authorized to delete this vehicle', 403));
        }
        await Vehicle_1.default.findByIdAndDelete(id);
        res.status(200).json({
            status: 'success',
            message: 'Vehicle deleted successfully',
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteVehicle = deleteVehicle;
