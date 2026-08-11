import { Request, Response } from 'express';
import { isR2Configured } from '../config/r2';
import { uploadToR2 as uploadFileToR2 } from '../services/r2Service';
import logger from '../utils/logger';

export const uploadToR2 = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!isR2Configured) {
      res.status(500).json({
        success: false,
        message: 'Cloudflare R2 is not configured',
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
      return;
    }

    const result = await uploadFileToR2(req.file, 'general');

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        originalName: result.originalName,
        fileName: result.key.split('/').pop(),
        key: result.key,
        size: result.size,
        mimeType: result.mimeType,
        url: result.url,
      },
    });
  } catch (error) {
    logger.error('R2 upload failed:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to upload file to Cloudflare R2',
      error:
        process.env.NODE_ENV === 'development'
          ? error instanceof Error
            ? error.message
            : String(error)
          : undefined,
    });
  }
};