import { Server as SocketIOServer } from 'socket.io';
import logger from '../utils/logger';
import { getCorsOrigin } from '../utils/cors';

let io: SocketIOServer | null = null;
const userSockets = new Map<string, string>(); // userId -> socketId

// Track active driver location sharing: rideId -> { driverId, watcherCount }
const activeTrackingSessions = new Map<string, { driverId: string; lastLocation: any }>();

export const initSocket = (server: any) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: getCorsOrigin(),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.info(`New WebSocket client connected: ${socket.id}`);

    // ─── Core Events ────────────────────────────────────────────
    socket.on('register_user', (userId: string) => {
      userSockets.set(userId, socket.id);
      socket.join(userId);
      logger.info(`User ${userId} bound to socket ${socket.id}`);
    });

    socket.on('join_chat', (chatId: string) => {
      socket.join(chatId);
      logger.info(`Socket ${socket.id} joined room ${chatId}`);
    });

    socket.on('leave_chat', (chatId: string) => {
      socket.leave(chatId);
      logger.info(`Socket ${socket.id} left room ${chatId}`);
    });

    socket.on('typing', ({ chatId, userId, userName, isTyping }) => {
      socket.to(chatId).emit('typing_status', { userId, userName, isTyping });
    });

    // ─── Feature 3: Live Driver Tracking ────────────────────────

    /**
     * Driver joins a ride's tracking room and starts broadcasting location.
     * Payload: { rideId, driverId }
     */
    socket.on('driver_start_tracking', ({ rideId, driverId }: { rideId: string; driverId: string }) => {
      const trackingRoom = `tracking:${rideId}`;
      socket.join(trackingRoom);
      activeTrackingSessions.set(rideId, { driverId, lastLocation: null });
      logger.info(`Driver ${driverId} started location tracking for ride ${rideId}`);
    });

    /**
     * Driver broadcasts their location update.
     * Payload: { rideId, driverId, lat, lng, heading?, speed? }
     * Passengers in the tracking room receive driver_location event.
     */
    socket.on(
      'driver_location_update',
      (payload: { rideId: string; driverId: string; lat: number; lng: number; heading?: number; speed?: number }) => {
        const { rideId, driverId, lat, lng, heading, speed } = payload;
        const trackingRoom = `tracking:${rideId}`;

        const locationData = { driverId, lat, lng, heading, speed, timestamp: Date.now() };

        // Update session cache
        const session = activeTrackingSessions.get(rideId);
        if (session) {
          session.lastLocation = locationData;
        } else {
          activeTrackingSessions.set(rideId, { driverId, lastLocation: locationData });
        }

        // Broadcast to all passengers tracking this ride (excluding driver)
        socket.to(trackingRoom).emit('driver_location', locationData);
      }
    );

    /**
     * Passenger joins a ride's tracking room to receive live location.
     * Payload: { rideId }
     */
    socket.on('passenger_join_tracking', ({ rideId }: { rideId: string }) => {
      const trackingRoom = `tracking:${rideId}`;
      socket.join(trackingRoom);
      logger.info(`Passenger socket ${socket.id} joined tracking room for ride ${rideId}`);

      // Send last known location immediately if available
      const session = activeTrackingSessions.get(rideId);
      if (session?.lastLocation) {
        socket.emit('driver_location', session.lastLocation);
      }
    });

    /**
     * Passenger updates their live location.
     * Payload: { rideId, passengerId, passengerName, lat, lng }
     */
    socket.on(
      'passenger_location_update',
      (payload: { rideId: string; passengerId?: string; passengerName?: string; lat: number; lng: number }) => {
        const { rideId, passengerId, passengerName, lat, lng } = payload;
        const trackingRoom = `tracking:${rideId}`;
        const locationData = { passengerId, passengerName, lat, lng, timestamp: Date.now() };
        io?.to(trackingRoom).emit('passenger_location', locationData);
      }
    );

    /**
     * Driver stops sharing location (ride completed or manually stopped).
     * Payload: { rideId }
     */
    socket.on('driver_stop_tracking', ({ rideId }: { rideId: string }) => {
      const trackingRoom = `tracking:${rideId}`;
      activeTrackingSessions.delete(rideId);
      io?.to(trackingRoom).emit('tracking_stopped', { rideId });
      socket.leave(trackingRoom);
      logger.info(`Driver stopped location tracking for ride ${rideId}`);
    });

    // ─── SOS Alert ──────────────────────────────────────────────
    socket.on('sos_alert', (sosData) => {
      logger.error(`🚨 SOS ALERT: User ${sosData.userId} (${sosData.userName}) triggered emergency alert at coordinates: ${JSON.stringify(sosData.coordinates)}`);
      io?.emit('admin_sos_alert', {
        userId: sosData.userId,
        userName: sosData.userName,
        phone: sosData.phone,
        coordinates: sosData.coordinates,
        timestamp: new Date(),
      });
    });

    // ─── Disconnect ──────────────────────────────────────────────
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

export const broadcastToAll = (eventName: string, data: any) => {
  if (io) {
    io.emit(eventName, data);
  }
};

export const broadcastToRoom = (room: string, eventName: string, data: any) => {
  if (io) {
    io.to(room).emit(eventName, data);
  }
};

export const isUserInChatRoom = (userId: string, chatId: string): boolean => {
  if (!io) return false;
  const socketId = userSockets.get(userId);
  if (!socketId) return false;
  const socket = io.sockets.sockets.get(socketId);
  return socket ? socket.rooms.has(chatId) : false;
};
