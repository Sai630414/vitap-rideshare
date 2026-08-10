import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Report from '../models/Report';
import AppError from '../utils/appError';
import { uploadToR2, deleteFromR2 } from '../services/r2Service';
import { sendToUser } from '../services/socketService';

export const getUserProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('blockedUsers', 'name email profileImage');
    
    if (!user) {
      return next(new AppError('No user found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401));
    }

    // Filtered body parameters to restrict role or verification modification
    const allowedFields = ['name', 'phone', 'registrationNumber', 'year', 'branch', 'fcmToken'];
    const updateData: Record<string, any> = {};

    Object.keys(req.body).forEach((key) => {
      if (allowedFields.includes(key)) {
        updateData[key] = req.body[key];
      }
    });

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    // Emit real-time profile update event to current user socket
    sendToUser(req.user.id, 'profile_updated', updatedUser);

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const uploadAvatar = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401));
    }

    if (!req.file) {
      return next(new AppError('Please select a file to upload', 400));
    }

    // Validate MIME type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return next(new AppError('Only JPEG, PNG and WebP images are allowed', 400));
    }

    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return next(new AppError('User not found', 404));
    }

    // Delete existing avatar from R2 if present
    if (currentUser.profileImage) {
      await deleteFromR2(currentUser.profileImage);
    }

    // Upload to Cloudflare R2 under uploads/avatars/{userId}/
    const uploadResult = await uploadToR2(req.file, 'avatars', req.user.id);

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { profileImage: uploadResult.url } },
      { new: true }
    ).select('-password');

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const blockUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userIdToBlock = req.params.id;
    if (!req.user) return next(new AppError('Unauthorized', 401));

    if (req.user.id === userIdToBlock) {
      return next(new AppError('You cannot block yourself', 400));
    }

    const userToBlock = await User.findById(userIdToBlock);
    if (!userToBlock) {
      return next(new AppError('User to block not found', 404));
    }

    // Add to block list if not already there
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { blockedUsers: userToBlock._id },
    });

    res.status(200).json({
      status: 'success',
      message: 'User blocked successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const unblockUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userIdToUnblock = req.params.id;
    if (!req.user) return next(new AppError('Unauthorized', 401));

    await User.findByIdAndUpdate(req.user.id, {
      $pull: { blockedUsers: userIdToUnblock },
    });

    res.status(200).json({
      status: 'success',
      message: 'User unblocked successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getBlocklist = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));

    const user = await User.findById(req.user.id).populate(
      'blockedUsers',
      'name email profileImage role'
    );

    res.status(200).json({
      status: 'success',
      data: {
        blockedUsers: user?.blockedUsers || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const reportUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reportedUserId = req.params.id;
    const { reason, description } = req.body;

    if (!req.user) return next(new AppError('Unauthorized', 401));

    if (req.user.id === reportedUserId) {
      return next(new AppError('You cannot report yourself', 400));
    }

    const reportedUser = await User.findById(reportedUserId);
    if (!reportedUser) {
      return next(new AppError('Reported user not found', 404));
    }

    if (!reason) {
      return next(new AppError('Please provide a reason for the report', 400));
    }

    const report = await Report.create({
      reporter: req.user.id,
      reportedUser: reportedUser._id,
      reason,
      description,
    });

    res.status(201).json({
      status: 'success',
      data: {
        report,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const registerFCMToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));

    const { token, fcmToken } = req.body;
    const tokenToSave = token || fcmToken;

    if (!tokenToSave || typeof tokenToSave !== 'string') {
      return next(new AppError('FCM token is required', 400));
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: { fcmToken: tokenToSave },
        $addToSet: { fcmTokens: tokenToSave },
      },
      { new: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'FCM token registered successfully',
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const removeFCMToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));

    const { token, fcmToken } = req.body;
    const tokenToRemove = token || fcmToken;

    if (tokenToRemove) {
      await User.findByIdAndUpdate(req.user.id, {
        $pull: { fcmTokens: tokenToRemove },
        $set: { fcmToken: '' },
      });
    } else {
      // If no specific token passed, clear tokens for this user session
      await User.findByIdAndUpdate(req.user.id, {
        $set: { fcmTokens: [], fcmToken: '' },
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'FCM token removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));

    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (user.profileImage) {
      await deleteFromR2(user.profileImage);
    }

    await User.findByIdAndDelete(req.user.id);

    res.status(200).json({
      status: 'success',
      message: 'Account and associated profile image deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

