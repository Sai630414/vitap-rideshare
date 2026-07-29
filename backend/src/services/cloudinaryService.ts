import fs from 'fs';
import path from 'path';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary';
import logger from '../utils/logger';

export const uploadToCloudinaryOrLocal = async (
  localFilePath: string,
  folderName: string
): Promise<string> => {
  try {
    if (!fs.existsSync(localFilePath)) {
      throw new Error(`File does not exist at path: ${localFilePath}`);
    }

    if (isCloudinaryConfigured) {
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(localFilePath, {
        folder: `vit-rideshare/${folderName}`,
        resource_type: 'auto',
      });
      
      // Delete temporary local file
      fs.unlink(localFilePath, (err) => {
        if (err) logger.error(`Error deleting temp file ${localFilePath}: ${err.message}`);
      });
      
      return result.secure_url;
    } else {
      // Local fallback - return relative URL for static files
      const filename = path.basename(localFilePath);
      return `/uploads/${filename}`;
    }
  } catch (error) {
    logger.error(`Upload error: ${(error as Error).message}`);
    // Attempt local cleanup on error if file exists
    if (fs.existsSync(localFilePath)) {
      fs.unlink(localFilePath, () => {});
    }
    throw error;
  }
};
