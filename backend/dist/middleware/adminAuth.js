"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const appError_1 = __importDefault(require("../utils/appError"));
const authenticate = async (req, res, next) => {
    try {
        let token;
        // Extract token from Authorization header or cookies
        if (req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            return next(new appError_1.default('Unauthorized: Please log in to gain admin access.', 401));
        }
        // Verify token
        if (!process.env.JWT_SECRET) {
            return next(new appError_1.default('Server JWT configuration error.', 500));
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Check if user still exists
        const currentUser = await User_1.User.findById(decoded.id);
        if (!currentUser) {
            return next(new appError_1.default('The user belonging to this token no longer exists.', 401));
        }
        // Check if user is banned
        if (currentUser.status === 'banned') {
            return next(new appError_1.default('Your account has been suspended. Access denied.', 403));
        }
        // Attach user to request
        req.user = currentUser;
        next();
    }
    catch (error) {
        return next(new appError_1.default('Session expired or invalid token. Please log in again.', 401));
    }
};
exports.authenticate = authenticate;
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return next(new appError_1.default('Access Denied: 403 Forbidden. Administrator privileges required.', 403));
    }
    next();
};
exports.requireAdmin = requireAdmin;
