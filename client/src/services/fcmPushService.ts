import { PushNotifications, type ActionPerformed, type PushNotificationSchema } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import authService from './authService';

class FCMPushService {
  private isNative: boolean;
  private isInitialized: boolean = false;
  private activeChatRoomId: string | null = null;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  /**
   * Set currently active chat screen ID to prevent duplicate foreground push notifications.
   */
  setActiveChatRoom(chatId: string | null) {
    this.activeChatRoomId = chatId;
  }

  /**
   * Create Android Notification Channels (Messages, Rides, System, Announcements).
   */
  async setupAndroidChannels() {
    if (!this.isNative || Capacitor.getPlatform() !== 'android') return;

    try {
      await PushNotifications.createChannel({
        id: 'channel_messages',
        name: 'Chat Messages',
        description: 'Notifications for direct student & driver chat messages',
        importance: 5, // High importance
        sound: 'default',
        vibration: true,
      });

      await PushNotifications.createChannel({
        id: 'channel_rides',
        name: 'Ride Updates',
        description: 'Notifications for ride bookings, acceptances, and completions',
        importance: 5,
        sound: 'default',
        vibration: true,
      });

      await PushNotifications.createChannel({
        id: 'channel_system',
        name: 'System Notifications',
        description: 'System alerts and account updates',
        importance: 3,
        sound: 'default',
        vibration: false,
      });

      await PushNotifications.createChannel({
        id: 'channel_announcements',
        name: 'Campus Announcements',
        description: 'Official Waygo campus travel announcements',
        importance: 4,
        sound: 'default',
        vibration: true,
      });
    } catch (err) {
      console.warn('[FCMPushService] Failed to create Android notification channels:', err);
    }
  }

  /**
   * Initialize FCM push notification listener and token sync.
   */
  async initFCM(onNavigate?: (path: string) => void) {
    if (!this.isNative) {
      console.log('[FCMPushService] Web environment detected. Native FCM push notifications handled via Web Socket.');
      return;
    }

    if (this.isInitialized) return;
    this.isInitialized = true;

    await this.setupAndroidChannels();

    try {
      const permStatus = await PushNotifications.checkPermissions();
      let status = permStatus.receive;

      if (status !== 'granted') {
        const reqResult = await PushNotifications.requestPermissions();
        status = reqResult.receive;
      }

      if (status !== 'granted') {
        console.warn('[FCMPushService] Push notification permission denied by user.');
        return;
      }

      await PushNotifications.register();

      // Listen for FCM Registration Token
      PushNotifications.addListener('registration', async (token) => {
        console.log('[FCMPushService] Registered FCM Device Token:', token.value);
        try {
          await authService.updateProfile({ fcmToken: token.value } as any);
        } catch (e) {
          console.error('[FCMPushService] Failed to sync FCM token to backend profile:', e);
        }
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('[FCMPushService] FCM Registration Error:', error);
      });

      // Foreground Notification Received
      PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        const data = notification.data || {};
        // Duplicate Prevention: If user is actively looking at the same chat screen, suppress duplicate push
        if (data.type === 'chat_message' && data.chatId && data.chatId === this.activeChatRoomId) {
          console.log('[FCMPushService] Suppressing duplicate push notification for active chat:', data.chatId);
          return;
        }
      });

      // Notification Action / Tap Event (Deep Linking)
      PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        const data = action.notification.data || {};
        const { type, referenceId, chatId } = data;

        if (onNavigate) {
          if ((type === 'chat_message' || type === 'new_message') && (chatId || referenceId)) {
            onNavigate(`/chat?id=${chatId || referenceId}`);
          } else if (type === 'ride_booked' || type === 'booking_request') {
            onNavigate(referenceId ? `/ride/${referenceId}` : '/dashboard');
          } else if (type === 'booking_accepted' || type === 'ride_accepted' || type === 'driver_started' || type === 'driver_arrived') {
            onNavigate(referenceId ? `/ride/${referenceId}` : '/dashboard');
          } else if (type === 'ride_completed' || type === 'new_review') {
            onNavigate(referenceId ? `/ride/${referenceId}` : '/dashboard');
          } else {
            onNavigate('/dashboard');
          }
        }
      });
    } catch (err) {
      console.error('[FCMPushService] FCM Initialization Error:', err);
    }
  }

  /**
   * Clear FCM token on user logout
   */
  async clearFCMToken() {
    try {
      await authService.updateProfile({ fcmToken: '' } as any);
    } catch (err) {
      console.warn('[FCMPushService] Failed to clear FCM token on logout:', err);
    }
  }
}

export const fcmPushService = new FCMPushService();
export default fcmPushService;
