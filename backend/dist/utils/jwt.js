"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRefreshToken = exports.verifyAccessToken = exports.createRefreshToken = exports.createAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || "super_secret_access_token_key_change_in_production";
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET ||
    "super_secret_refresh_token_key_change_in_production";
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "15m";
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d";
/**
 * Generate Access Token
 */
const createAccessToken = (user) => {
    return jsonwebtoken_1.default.sign({
        id: user._id,
        email: user.email,
        role: user.role,
    }, ACCESS_TOKEN_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
    });
};
exports.createAccessToken = createAccessToken;
/**
 * Generate Refresh Token
 */
const createRefreshToken = (user) => {
    return jsonwebtoken_1.default.sign({
        id: user._id,
    }, REFRESH_TOKEN_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRY,
    });
};
exports.createRefreshToken = createRefreshToken;
/**
 * Verify Access Token
 */
const verifyAccessToken = (token) => {
    return jsonwebtoken_1.default.verify(token, ACCESS_TOKEN_SECRET);
};
exports.verifyAccessToken = verifyAccessToken;
/**
 * Verify Refresh Token
 */
const verifyRefreshToken = (token) => {
    return jsonwebtoken_1.default.verify(token, REFRESH_TOKEN_SECRET);
};
exports.verifyRefreshToken = verifyRefreshToken;
