"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireVerifiedStudent = exports.requireVerifiedDriver = exports.restrictTo = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const appError_1 = __importDefault(require("../utils/appError"));
const protect = async (req, res, next) => {
    try {
        let token;
        // 1) Extract token from Authorization header or cookies
        if (req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        else if (req.cookies?.jwt) {
            token = req.cookies.jwt;
        }
        if (!token) {
            return next(new appError_1.default('You are not logged in! Please log in to get access.', 401));
        }
        // 2) Verify token
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'super_secret_access_token_key_change_in_production');
        // 3) Check if user still exists
        const currentUser = await User_1.User.findById(decoded.id);
        if (!currentUser) {
            return next(new appError_1.default('The user belonging to this token no longer exists.', 401));
        }
        // 4) Check if user is banned
        if (currentUser.status === 'banned') {
            return next(new appError_1.default('Your account has been banned. Please contact the administrator.', 403));
        }
        // 5) Grant access (append user to request)
        req.user = currentUser;
        next();
    }
    catch (error) {
        return next(new appError_1.default('Invalid token or session expired. Please log in again.', 401));
    }
};
exports.protect = protect;
const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new appError_1.default('You do not have permission to perform this action', 403));
        }
        next();
    };
};
exports.restrictTo = restrictTo;
const requireVerifiedDriver = (req, res, next) => {
    if (!req.user || req.user.role !== 'driver' || !req.user.verifiedDriver) {
        return next(new appError_1.default('You must be a verified driver to offer rides. Please upload your documents and wait for approval.', 403));
    }
    next();
};
exports.requireVerifiedDriver = requireVerifiedDriver;
const requireVerifiedStudent = (req, res, next) => {
    if (!req.user || !req.user.verifiedStudent) {
        return next(new appError_1.default('Your student account must be verified before performing booking actions.', 403));
    }
    next();
};
exports.requireVerifiedStudent = requireVerifiedStudent;
