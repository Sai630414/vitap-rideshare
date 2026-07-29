import { v2 as cloudinary } from 'cloudinary';
import logger from '../utils/logger';

const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  logger.info('Cloudinary integration enabled.');
} else {
  logger.warn('Cloudinary environment credentials not found. Local disk uploads will be used as a fallback.');
}

export { cloudinary, isCloudinaryConfigured };
export default cloudinary;
