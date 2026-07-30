"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalErrorHandler = void 0;
const appError_1 = __importDefault(require("../utils/appError"));
const logger_1 = __importDefault(require("../utils/logger"));
const handleCastErrorDB = (err) => {
    const message = `Invalid ${err.path}: ${err.value}.`;
    return new appError_1.default(message, 400);
};
const handleDuplicateFieldsDB = (err) => {
    if (err.keyValue) {
        const field = Object.keys(err.keyValue)[0];
        const value = err.keyValue[field];
        return new appError_1.default(`Duplicate value "${value}" for "${field}". Please use another value.`, 400);
    }
    return new appError_1.default("Duplicate field value detected. Please use another value.", 400);
};
const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map((el) => el.message);
    const message = `Invalid input data. ${errors.join(". ")}`;
    return new appError_1.default(message, 400);
};
const handleJWTError = () => new appError_1.default("Invalid token. Please log in again!", 401);
const handleJWTExpiredError = () => new appError_1.default("Your token has expired! Please log in again.", 401);
const handleMulterError = (err) => {
    if (err.code === "LIMIT_FILE_SIZE") {
        return new appError_1.default("File size is too large. Maximum allowed size is 5MB.", 400);
    }
    return new appError_1.default(err.message || "File upload error occurred.", 400);
};
const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack,
    });
};
const sendErrorProd = (err, res) => {
    if (err.isOperational) {
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
        });
    }
    logger_1.default.error(`${err.name}: ${err.message}`);
    return res.status(500).json({
        status: "error",
        message: "Something went very wrong!",
    });
};
const globalErrorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || "error";
    if (process.env.NODE_ENV === "development") {
        return sendErrorDev(err, res);
    }
    // Clone the error and preserve important properties
    let error = { ...err };
    error.message = err.message;
    error.name = err.name;
    error.code = err.code;
    error.keyValue = err.keyValue;
    error.errors = err.errors;
    error.path = err.path;
    error.value = err.value;
    if (error.name === "CastError")
        error = handleCastErrorDB(error);
    if (error.code === 11000)
        error = handleDuplicateFieldsDB(error);
    if (error.name === "ValidationError")
        error = handleValidationErrorDB(error);
    if (error.name === "JsonWebTokenError")
        error = handleJWTError();
    if (error.name === "TokenExpiredError")
        error = handleJWTExpiredError();
    if (error.name === "MulterError")
        error = handleMulterError(error);
    return sendErrorProd(error, res);
};
exports.globalErrorHandler = globalErrorHandler;
exports.default = exports.globalErrorHandler;
