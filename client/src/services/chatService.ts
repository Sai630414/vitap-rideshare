import api from './api';

export interface MessageData {
  _id: string;
  chat: string;
  sender: {
    _id: string;
    name: string;
    email: string;
    profileImage: string;
    role: string;
  };
  text?: string;
  image?: string;
  seen: boolean;
  createdAt: string;
}

export interface ChatData {
  _id: string;
  participants: {
    _id: string;
    name: string;
    email: string;
    profileImage: string;
    role: string;
    rating: number;
    trustScore: number;
  }[];
  lastMessage?: MessageData;
  updatedAt: string;
}

export const chatService = {
  getUserChats: async () => {
    const response = await api.get('/chat');
    return response.data;
  },

  getOrCreateChat: async (recipientId: string) => {
    const response = await api.post('/chat', { recipientId });
    return response.data;
  },

  getChatMessages: async (chatId: string) => {
    const response = await api.get(`/chat/${chatId}/messages`);
    return response.data;
  },

  sendMessage: async (chatId: string, text?: string, imageFile?: File) => {
    const formData = new FormData();
    if (text) formData.append('text', text);
    if (imageFile) formData.append('image', imageFile);

    const response = await api.post(`/chat/${chatId}/messages`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  markAsSeen: async (chatId: string) => {
    const response = await api.patch(`/chat/${chatId}/seen`);
    return response.data;
  },
};

export default chatService;
