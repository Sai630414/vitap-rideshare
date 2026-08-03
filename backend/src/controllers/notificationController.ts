import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Notification from '../models/Notification';
import AppError from '../utils/appError';
import { sendToUser } from '../services/socketService';
import logger from '../utils/logger';

type NotificationType =
  | 'ride_accepted'
  | 'ride_cancelled'
  | 'booking_request'
  | 'verification_approved'
  | 'chat_message'
  | 'sos_alert'
  | 'ride_booked'
  | 'booking_accepted'
  | 'booking_rejected'
  | 'driver_started'
  | 'driver_arrived'
  | 'ride_completed'
  | 'new_message'
  | 'new_review';

// Helper function to create DB record and trigger real-time Socket event
export const sendNotificationToUser = async (
  userId: string,
  title: string,
  body: string,
  type: NotificationType,
  referenceId?: any
): Promise<any> => {
  try {
    const notification = await Notification.create({
      user: userId,
      title,
      body,
      type,
      referenceId,
      isRead: false,
    });

    // Send real-time socket alert
    sendToUser(userId, 'notification', notification);
    
    return notification;
  } catch (error) {
    logger.error(`Failed to send notification to ${userId}: ${(error as Error).message}`);
    return null;
  }
};

export const getMyNotifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));

    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50); // limit to last 50 notifications

    res.status(200).json({
      status: 'success',
      results: notifications.length,
      data: {
        notifications,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));

    await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      status: 'success',
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const notification = await Notification.findById(id);

    if (!notification) {
      return next(new AppError('Notification not found', 404));
    }

    if (notification.user.toString() !== req.user?.id) {
      return next(new AppError('Unauthorized to update this notification', 403));
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      status: 'success',
      data: {
        notification,
      },
    });
  } catch (error) {
    next(error);
  }
};
