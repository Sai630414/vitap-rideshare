"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToCloudinaryOrLocal = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const cloudinary_1 = require("../config/cloudinary");
const logger_1 = __importDefault(require("../utils/logger"));
const uploadToCloudinaryOrLocal = async (localFilePath, folderName) => {
    try {
        if (!fs_1.default.existsSync(localFilePath)) {
            throw new Error(`File does not exist at path: ${localFilePath}`);
        }
        if (cloudinary_1.isCloudinaryConfigured) {
            // Upload to Cloudinary
            const result = await cloudinary_1.cloudinary.uploader.upload(localFilePath, {
                folder: `vit-rideshare/${folderName}`,
                resource_type: 'auto',
            });
            // Delete temporary local file
            fs_1.default.unlink(localFilePath, (err) => {
                if (err)
                    logger_1.default.error(`Error deleting temp file ${localFilePath}: ${err.message}`);
            });
            return result.secure_url;
        }
        else {
            // Local fallback - return relative URL for static files
            const filename = path_1.default.basename(localFilePath);
            return `/uploads/${filename}`;
        }
    }
    catch (error) {
        logger_1.default.error(`Upload error: ${error.message}`);
        // Attempt local cleanup on error if file exists
        if (fs_1.default.existsSync(localFilePath)) {
            fs_1.default.unlink(localFilePath, () => { });
        }
        throw error;
    }
};
exports.uploadToCloudinaryOrLocal = uploadToCloudinaryOrLocal;
