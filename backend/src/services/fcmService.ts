import logger from '../utils/logger';
import User from '../models/User';

export interface FCMMessagePayload {
  userId: string;
  title: string;
  body: string;
  type: string;
  referenceId?: string;
  data?: Record<string, string>;
}

/**
 * Android Notification Channels mapping
 */
const getChannelIdForType = (type: string): string => {
  switch (type) {
    case 'chat_message':
    case 'new_message':
      return 'channel_messages';
    case 'ride_booked':
    case 'booking_request':
    case 'booking_accepted':
    case 'booking_rejected':
    case 'driver_started':
    case 'driver_arrived':
    case 'ride_completed':
    case 'ride_cancelled':
      return 'channel_rides';
    case 'admin_announcement':
      return 'channel_announcements';
    default:
      return 'channel_system';
  }
};

/**
 * Dispatch Push Notification via FCM
 */
export const sendFCMPushNotification = async (payload: FCMMessagePayload): Promise<boolean> => {
  try {
    const user = await User.findById(payload.userId).select('fcmToken');
    if (!user || !user.fcmToken) {
      logger.debug(`[FCM] No registered fcmToken found for user ${payload.userId}`);
      return false;
    }

    const fcmServerKey = process.env.FCM_SERVER_KEY || process.env.FIREBASE_SERVER_KEY;
    const channelId = getChannelIdForType(payload.type);

    const notificationPayload = {
      to: user.fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
        sound: 'default',
      },
      data: {
        type: payload.type,
        referenceId: payload.referenceId ? String(payload.referenceId) : '',
        channelId,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        ...payload.data,
      },
      android: {
        priority: 'high',
        notification: {
          channel_id: channelId,
          sound: 'default',
          default_sound: true,
          default_vibrate_timings: true,
        },
      },
    };

    if (fcmServerKey) {
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${fcmServerKey}`,
        },
        body: JSON.stringify(notificationPayload),
      });

      if (response.ok) {
        logger.info(`[FCM] Push notification sent successfully to user ${payload.userId}`);
        return true;
      } else {
        const errorText = await response.text();
        logger.error(`[FCM] Push notification dispatch failed: ${errorText}`);
        return false;
      }
    } else {
      logger.info(`[FCM Sim] Push payload prepared for user ${payload.userId} (Channel: ${channelId})`);
      return true;
    }
  } catch (error: any) {
    logger.error(`[FCM] Error dispatching push notification to ${payload.userId}: ${error.message}`);
    return false;
  }
};

export default { sendFCMPushNotification };
