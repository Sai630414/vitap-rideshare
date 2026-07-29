import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import DrivingLicence from '../models/DrivingLicence';
import AppError from '../utils/appError';
import { uploadToCloudinaryOrLocal } from '../services/cloudinaryService';

export const uploadLicence = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { licenceNumber, expiry } = req.body;
    if (!req.user) return next(new AppError('Unauthorized', 401));

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const frontFile = files?.frontImage?.[0];
    const backFile = files?.backImage?.[0];

    if (!licenceNumber || !expiry) {
      return next(new AppError('Licence number and expiry date are required', 400));
    }

    if (!frontFile || !backFile) {
      return next(new AppError('Please upload both front and back images of your driving licence', 400));
    }

    // Check if licence already exists
    const existing = await DrivingLicence.findOne({ licenceNumber });
    if (existing && existing.user.toString() !== req.user.id) {
      return next(new AppError('Driving licence number already registered by another user', 400));
    }

    // Upload to Cloudinary/Local
    const frontUrl = await uploadToCloudinaryOrLocal(frontFile.path, 'licences');
    const backUrl = await uploadToCloudinaryOrLocal(backFile.path, 'licences');

    // Create or update driving licence
    const updatedLicence = await DrivingLicence.findOneAndUpdate(
      { user: req.user.id },
      {
        licenceNumber,
        expiry: new Date(expiry),
        frontImage: frontUrl,
        backImage: backUrl,
        status: 'pending',
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      status: 'success',
      data: {
        licence: updatedLicence,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyLicence = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));

    const licence = await DrivingLicence.findOne({ user: req.user.id });

    res.status(200).json({
      status: 'success',
      data: {
        licence,
      },
    });
  } catch (error) {
    next(error);
  }
};
