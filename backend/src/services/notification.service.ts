import { messaging } from '../config/firebase';
import User from '../models/User';
import logger from '../utils/logger';

export interface PushNotificationPayload {
  userIds: string | string[];
  title: string;
  body: string;
  type: string;
  referenceId?: string;
  data?: Record<string, string>;
  channelId?: string;
}

/**
 * Android Notification Channels mapping for Capacitor / Android app
 */
export const getChannelIdForType = (type: string): string => {
  switch (type) {
    case 'chat_message':
    case 'new_message':
      return 'channel_messages';
    case 'ride_booked':
    case 'ride_accepted':
    case 'booking_request':
    case 'booking_accepted':
    case 'booking_rejected':
    case 'driver_started':
    case 'driver_arrived':
    case 'ride_completed':
    case 'ride_cancelled':
      return 'channel_rides';
    case 'driver_review':
    case 'passenger_review':
      return 'channel_reviews';
    case 'admin_announcement':
    case 'driver_approved':
    case 'driver_rejected':
      return 'channel_announcements';
    default:
      return 'channel_system';
  }
};

class NotificationService {
  /**
   * Generic Method to Send Push Notification via Firebase Admin SDK
   */
  async sendPushNotification(payload: PushNotificationPayload): Promise<boolean> {
    try {
      const targetUserIds = Array.isArray(payload.userIds) ? payload.userIds : [payload.userIds];
      if (targetUserIds.length === 0) return false;

      // Find target users and collect FCM tokens
      const users = await User.find({ _id: { $in: targetUserIds } }).select('_id fcmToken fcmTokens');
      const tokensWithUser: { userId: string; token: string }[] = [];

      for (const user of users) {
        const userTokens = new Set<string>();
        if (user.fcmToken && user.fcmToken.trim()) {
          userTokens.add(user.fcmToken);
        }
        if (Array.isArray(user.fcmTokens)) {
          user.fcmTokens.forEach((t) => {
            if (t && t.trim()) userTokens.add(t);
          });
        }
        userTokens.forEach((token) => {
          tokensWithUser.push({ userId: user._id.toString(), token });
        });
      }

      if (tokensWithUser.length === 0) {
        logger.debug(`[NotificationService] No FCM tokens found for users: ${targetUserIds.join(', ')}`);
        return false;
      }

      const tokens = tokensWithUser.map((item) => item.token);
      const channelId = payload.channelId || getChannelIdForType(payload.type);

      const message: any = {
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: {
          type: payload.type,
          referenceId: payload.referenceId ? String(payload.referenceId) : '',
          channelId,
          ...payload.data,
        },
        android: {
          priority: 'high',
          notification: {
            channelId,
            sound: 'default',
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await messaging.sendEachForMulticast(message);

      // Handle invalid/expired tokens cleanup
      if (response.failureCount > 0) {
        const tokensToRemove: { userId: string; token: string }[] = [];
        response.responses.forEach((resp: any, idx: number) => {
          if (!resp.success && resp.error) {
            const errorCode = resp.error.code;
            if (
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered'
            ) {
              tokensToRemove.push(tokensWithUser[idx]);
            }
          }
        });

        // Clean up invalid tokens from MongoDB
        for (const item of tokensToRemove) {
          await User.findByIdAndUpdate(item.userId, {
            $pull: { fcmTokens: item.token },
          });
        }
      }

      logger.info(
        `[NotificationService] Sent push notifications to ${response.successCount} devices (Failures: ${response.failureCount})`
      );
      return response.successCount > 0;
    } catch (error: any) {
      logger.error(`[NotificationService] Error sending push notification: ${error.message}`);
      return false;
    }
  }

  /**
   * Helper Methods for specific domains
   */

  async sendChatNotification(
    receiverId: string,
    senderName: string,
    messageText: string,
    chatId: string
  ): Promise<boolean> {
    return this.sendPushNotification({
      userIds: receiverId,
      title: `New Message from ${senderName}`,
      body: messageText,
      type: 'chat_message',
      referenceId: chatId,
      data: { senderName, chatId },
    });
  }

  async sendRideNotification(
    userId: string | string[],
    title: string,
    body: string,
    rideId: string,
    type: string
  ): Promise<boolean> {
    return this.sendPushNotification({
      userIds: userId,
      title,
      body,
      type,
      referenceId: rideId,
      data: { rideId },
    });
  }

  async sendReviewNotification(
    userId: string,
    title: string,
    body: string,
    reviewId: string
  ): Promise<boolean> {
    return this.sendPushNotification({
      userIds: userId,
      title,
      body,
      type: 'review_received',
      referenceId: reviewId,
      data: { reviewId },
    });
  }

  async sendDriverArrivalNotification(passengerId: string, rideId: string, driverName: string): Promise<boolean> {
    return this.sendRideNotification(
      passengerId,
      'Driver Arrived',
      `${driverName} has arrived at the pickup location.`,
      rideId,
      'driver_arrived'
    );
  }

  async sendRideCompletedNotification(passengerId: string, rideId: string): Promise<boolean> {
    return this.sendRideNotification(
      passengerId,
      'Ride Completed',
      'Your ride has been completed. Thank you for using WayGo!',
      rideId,
      'ride_completed'
    );
  }
}

export const notificationService = new NotificationService();
export default notificationService;
