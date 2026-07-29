"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const zod_1 = require("zod");
const appError_1 = __importDefault(require("../utils/appError"));
const validateRequest = (schema) => {
    return async (req, _res, next) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const errorMessages = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
                return next(new appError_1.default(`Validation failed: ${errorMessages.join('. ')}`, 400));
            }
            next(error);
        }
    };
};
exports.validateRequest = validateRequest;
exports.default = exports.validateRequest;
