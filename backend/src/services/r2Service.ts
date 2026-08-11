import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import r2Client, { isR2Configured } from '../config/r2';
import logger from '../utils/logger';
import AppError from '../utils/appError';

export interface R2UploadResult {
  url: string;
  key: string;
  originalName: string;
  size: number;
  mimeType: string;
}

/**
 * Extract R2 object key from a full URL or key string.
 */
export const extractKeyFromUrl = (urlOrKey: string): string | null => {
  if (!urlOrKey) return null;
  
  if (!urlOrKey.startsWith('http://') && !urlOrKey.startsWith('https://')) {
    return urlOrKey; // Already an object key
  }

  const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/+$/, '');
  if (publicUrl && urlOrKey.startsWith(publicUrl)) {
    return urlOrKey.replace(`${publicUrl}/`, '');
  }

  for (const prefix of ['avatars/', 'profiles/', 'licences/', 'vehicles/', 'chat/', 'uploads/']) {
    if (urlOrKey.includes(prefix)) {
      return urlOrKey.substring(urlOrKey.indexOf(prefix));
    }
  }
  
  try {
    const urlObj = new URL(urlOrKey);
    let pathname = urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
    const bucketName = process.env.R2_BUCKET_NAME;
    if (bucketName && pathname.startsWith(`${bucketName}/`)) {
      pathname = pathname.replace(`${bucketName}/`, '');
    }
    return pathname;
  } catch {
    return urlOrKey;
  }
};

export const getR2PublicBaseUrl = (): string => {
  let baseUrl = process.env.R2_PUBLIC_URL?.replace(/\/+$/, '') || '';
  if (!baseUrl) {
    throw new AppError('R2_PUBLIC_URL is not configured in environment variables', 500);
  }
  const bucketName = process.env.R2_BUCKET_NAME;
  if (baseUrl.includes('.r2.cloudflarestorage.com') && bucketName && !baseUrl.endsWith(`/${bucketName}`)) {
    baseUrl = `${baseUrl}/${bucketName}`;
  }
  return baseUrl;
};

/**
 * Upload an in-memory Multer file buffer to Cloudflare R2.
 */
export const uploadToR2 = async (
  file: Express.Multer.File,
  folder: string,
  customPrefix?: string
): Promise<R2UploadResult> => {
  if (!isR2Configured || !r2Client) {
    throw new AppError('Cloudflare R2 object storage is not configured', 500);
  }

  if (!file || !file.buffer) {
    throw new AppError('Invalid file or missing file content', 400);
  }

  const cleanOriginalName = file.originalname.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-]/g, '');
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 10000);
  const fileName = `${timestamp}-${randomSuffix}-${cleanOriginalName}`;

  const folderStr = folder ? String(folder).trim().replace(/\/+$/, '') : 'general';
  const prefixStr = customPrefix ? String(customPrefix).trim() : '';
  const prefixPath = prefixStr ? `${prefixStr.replace(/\/+$/, '')}/` : '';
  const key = `${folderStr}/${prefixPath}${fileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await r2Client.send(command);

  const baseUrl = getR2PublicBaseUrl();
  const publicUrl = `${baseUrl}/${key}`;

  logger.info(`File uploaded successfully to Cloudflare R2: ${key}`);

  return {
    url: publicUrl,
    key,
    originalName: file.originalname,
    size: file.size,
    mimeType: file.mimetype,
  };
};

/**
 * Delete an object from Cloudflare R2 given its key or full URL.
 */
export const deleteFromR2 = async (urlOrKey: string): Promise<boolean> => {
  if (!isR2Configured || !r2Client) {
    logger.warn('R2 delete skipped: Cloudflare R2 client is not configured.');
    return false;
  }

  const key = extractKeyFromUrl(urlOrKey);
  if (!key) {
    return false;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    });

    await r2Client.send(command);
    logger.info(`File deleted from Cloudflare R2: ${key}`);
    return true;
  } catch (error) {
    logger.error(`Failed to delete file from R2 (${key}):`, error);
    return false;
  }
};
