"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Connects to MongoDB database with a retry mechanism.
 * @param retries Maximum number of retry attempts (default: 5)
 * @param delay Delay between attempts in milliseconds (default: 5000)
 */
const connectDB = async (retries = 5, delay = 5000) => {
    const mongoURI = process.env.MONGO_URI || 'mongodb://database:27017/vit_rideshare';
    mongoose_1.default.set('strictQuery', true);
    for (let i = 1; i <= retries; i++) {
        try {
            await mongoose_1.default.connect(mongoURI);
            logger_1.default.info('Successfully connected to MongoDB database.');
            return;
        }
        catch (error) {
            logger_1.default.error(`MongoDB connection attempt ${i} failed: ${error.message}`);
            if (i === retries) {
                throw error; // Propagate the error so the main startup logic handles it
            }
            logger_1.default.info(`Retrying in ${delay / 1000} seconds...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
};
exports.connectDB = connectDB;
exports.default = exports.connectDB;
