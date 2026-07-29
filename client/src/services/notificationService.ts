import api from './api';

export interface NotificationData {
  _id: string;
  user: string;
  title: string;
  body: string;
  isRead: boolean;
  type: 'ride_accepted' | 'ride_cancelled' | 'booking_request' | 'verification_approved' | 'chat_message' | 'sos_alert';
  referenceId?: string;
  createdAt: string;
}

export const notificationService = {
  getMyNotifications: async () => {
    const response = await api.get('/notifications');
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.patch('/notifications/mark-read');
    return response.data;
  },

  markAsRead: async (id: string) => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },
};

export default notificationService;
