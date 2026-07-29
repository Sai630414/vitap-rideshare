import { Server as SocketIOServer } from 'socket.io';
import logger from '../utils/logger';

let io: SocketIOServer | null = null;
const userSockets = new Map<string, string>(); // userId -> socketId

export const initSocket = (server: any) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        const clientUrl = process.env.CLIENT_URL || 'https://vitap-rideshare.vercel.app';
        if (!origin) {
          return callback(null, true);
        }
        if (origin === clientUrl) {
          return callback(null, true);
        }
        if (process.env.NODE_ENV !== 'production') {
          const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
          if (isLocalhost) {
            return callback(null, true);
          }
        }
        return callback(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.info(`New WebSocket client connected: ${socket.id}`);

    socket.on('register_user', (userId: string) => {
      userSockets.set(userId, socket.id);
      socket.join(userId);
      logger.info(`User ${userId} bound to socket ${socket.id}`);
    });

    socket.on('join_chat', (chatId: string) => {
      socket.join(chatId);
      logger.info(`Socket ${socket.id} joined room ${chatId}`);
    });

    socket.on('typing', ({ chatId, userId, userName, isTyping }) => {
      socket.to(chatId).emit('typing_status', { userId, userName, isTyping });
    });

    socket.on('sos_alert', (sosData) => {
      logger.error(`🚨 SOS ALERT: User ${sosData.userId} (${sosData.userName}) triggered emergency alert at coordinates: ${JSON.stringify(sosData.coordinates)}`);
      // Broadcast emergency to all sockets (especially admins)
      io?.emit('admin_sos_alert', {
        userId: sosData.userId,
        userName: sosData.userName,
        phone: sosData.phone,
        coordinates: sosData.coordinates,
        timestamp: new Date(),
      });
    });

    socket.on('disconnect', () => {
      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          userSockets.delete(userId);
          logger.info(`User ${userId} disconnected from socket ${socket.id}`);
          break;
        }
      }
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io has not been initialized yet!');
  }
  return io;
};

export const sendToUser = (userId: string, eventName: string, data: any) => {
  if (io) {
    io.to(userId).emit(eventName, data);
  }
};
