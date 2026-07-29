"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};
const colors = {
    error: "red",
    warn: "yellow",
    info: "green",
    http: "magenta",
    debug: "white",
};
winston_1.default.addColors(colors);
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss:ms",
}), winston_1.default.format.colorize({ all: true }), winston_1.default.format.printf(({ timestamp, level, message }) => `[${timestamp}] [${level}]: ${message}`));
// Explicitly type the transports array
const transports = [];
// Always log to console
transports.push(new winston_1.default.transports.Console());
// Only write log files when NOT running on Vercel, Render, or in Production mode
const isProductionLike = process.env.VERCEL ||
    process.env.RENDER ||
    process.env.NODE_ENV === 'production';
if (!isProductionLike) {
    transports.push(new winston_1.default.transports.File({
        filename: "logs/error.log",
        level: "error",
    }));
    transports.push(new winston_1.default.transports.File({
        filename: "logs/combined.log",
    }));
}
exports.logger = winston_1.default.createLogger({
    level: process.env.NODE_ENV === "development" ? "debug" : "info",
    levels,
    format: logFormat,
    transports,
});
exports.default = exports.logger;
