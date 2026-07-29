"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportUser = exports.getBlocklist = exports.unblockUser = exports.blockUser = exports.uploadAvatar = exports.updateProfile = exports.getUserProfile = void 0;
const User_1 = __importDefault(require("../models/User"));
const Report_1 = __importDefault(require("../models/Report"));
const appError_1 = __importDefault(require("../utils/appError"));
const cloudinaryService_1 = require("../services/cloudinaryService");
const getUserProfile = async (req, res, next) => {
    try {
        const user = await User_1.default.findById(req.params.id)
            .select('-password')
            .populate('blockedUsers', 'name email profileImage');
        if (!user) {
            return next(new appError_1.default('No user found with that ID', 404));
        }
        res.status(200).json({
            status: 'success',
            data: {
                user,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getUserProfile = getUserProfile;
const updateProfile = async (req, res, next) => {
    try {
        if (!req.user) {
            return next(new appError_1.default('Unauthorized', 401));
        }
        // Filtered body parameters to restrict role or verification modification
        const allowedFields = ['name', 'phone', 'registrationNumber', 'year', 'branch'];
        const updateData = {};
        Object.keys(req.body).forEach((key) => {
            if (allowedFields.includes(key)) {
                updateData[key] = req.body[key];
            }
        });
        const updatedUser = await User_1.default.findByIdAndUpdate(req.user.id, { $set: updateData }, { new: true, runValidators: true });
        res.status(200).json({
            status: 'success',
            data: {
                user: updatedUser,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateProfile = updateProfile;
const uploadAvatar = async (req, res, next) => {
    try {
        if (!req.user) {
            return next(new appError_1.default('Unauthorized', 401));
        }
        if (!req.file) {
            return next(new appError_1.default('Please select a file to upload', 400));
        }
        // Upload using Cloudinary or local fallback
        const fileUrl = await (0, cloudinaryService_1.uploadToCloudinaryOrLocal)(req.file.path, 'avatars');
        const updatedUser = await User_1.default.findByIdAndUpdate(req.user.id, { $set: { profileImage: fileUrl } }, { new: true });
        res.status(200).json({
            status: 'success',
            data: {
                user: updatedUser,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.uploadAvatar = uploadAvatar;
const blockUser = async (req, res, next) => {
    try {
        const userIdToBlock = req.params.id;
        if (!req.user)
            return next(new appError_1.default('Unauthorized', 401));
        if (req.user.id === userIdToBlock) {
            return next(new appError_1.default('You cannot block yourself', 400));
        }
        const userToBlock = await User_1.default.findById(userIdToBlock);
        if (!userToBlock) {
            return next(new appError_1.default('User to block not found', 404));
        }
        // Add to block list if not already there
        await User_1.default.findByIdAndUpdate(req.user.id, {
            $addToSet: { blockedUsers: userToBlock._id },
        });
        res.status(200).json({
            status: 'success',
            message: 'User blocked successfully',
        });
    }
    catch (error) {
        next(error);
    }
};
exports.blockUser = blockUser;
const unblockUser = async (req, res, next) => {
    try {
        const userIdToUnblock = req.params.id;
        if (!req.user)
            return next(new appError_1.default('Unauthorized', 401));
        await User_1.default.findByIdAndUpdate(req.user.id, {
            $pull: { blockedUsers: userIdToUnblock },
        });
        res.status(200).json({
            status: 'success',
            message: 'User unblocked successfully',
        });
    }
    catch (error) {
        next(error);
    }
};
exports.unblockUser = unblockUser;
const getBlocklist = async (req, res, next) => {
    try {
        if (!req.user)
            return next(new appError_1.default('Unauthorized', 401));
        const user = await User_1.default.findById(req.user.id).populate('blockedUsers', 'name email profileImage role');
        res.status(200).json({
            status: 'success',
            data: {
                blockedUsers: user?.blockedUsers || [],
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getBlocklist = getBlocklist;
const reportUser = async (req, res, next) => {
    try {
        const reportedUserId = req.params.id;
        const { reason, description } = req.body;
        if (!req.user)
            return next(new appError_1.default('Unauthorized', 401));
        if (req.user.id === reportedUserId) {
            return next(new appError_1.default('You cannot report yourself', 400));
        }
        const reportedUser = await User_1.default.findById(reportedUserId);
        if (!reportedUser) {
            return next(new appError_1.default('Reported user not found', 404));
        }
        if (!reason) {
            return next(new appError_1.default('Please provide a reason for the report', 400));
        }
        const report = await Report_1.default.create({
            reporter: req.user.id,
            reportedUser: reportedUser._id,
            reason,
            description,
        });
        res.status(201).json({
            status: 'success',
            data: {
                report,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.reportUser = reportUser;
