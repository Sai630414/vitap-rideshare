"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = __importDefault(require("../utils/logger"));
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI || 'mongodb://database:27017/vit_rideshare';
        mongoose_1.default.set('strictQuery', true);
        await mongoose_1.default.connect(mongoURI);
        logger_1.default.info('Successfully connected to MongoDB database.');
    }
    catch (error) {
        logger_1.default.error(`MongoDB connection error: ${error.message}`);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
exports.default = exports.connectDB;
