"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUserInChatRoom = exports.sendToUser = exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const logger_1 = __importDefault(require("../utils/logger"));
const cors_1 = require("../utils/cors");
let io = null;
const userSockets = new Map(); // userId -> socketId
// Track active driver location sharing: rideId -> { driverId, watcherCount }
const activeTrackingSessions = new Map();
const initSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: (0, cors_1.getCorsOrigin)(),
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });
    io.on('connection', (socket) => {
        logger_1.default.info(`New WebSocket client connected: ${socket.id}`);
        // ─── Core Events ────────────────────────────────────────────
        socket.on('register_user', (userId) => {
            userSockets.set(userId, socket.id);
            socket.join(userId);
            logger_1.default.info(`User ${userId} bound to socket ${socket.id}`);
        });
        socket.on('join_chat', (chatId) => {
            socket.join(chatId);
            logger_1.default.info(`Socket ${socket.id} joined room ${chatId}`);
        });
        socket.on('leave_chat', (chatId) => {
            socket.leave(chatId);
            logger_1.default.info(`Socket ${socket.id} left room ${chatId}`);
        });
        socket.on('typing', ({ chatId, userId, userName, isTyping }) => {
            socket.to(chatId).emit('typing_status', { userId, userName, isTyping });
        });
        // ─── Feature 3: Live Driver Tracking ────────────────────────
        /**
         * Driver joins a ride's tracking room and starts broadcasting location.
         * Payload: { rideId, driverId }
         */
        socket.on('driver_start_tracking', ({ rideId, driverId }) => {
            const trackingRoom = `tracking:${rideId}`;
            socket.join(trackingRoom);
            activeTrackingSessions.set(rideId, { driverId, lastLocation: null });
            logger_1.default.info(`Driver ${driverId} started location tracking for ride ${rideId}`);
        });
        /**
         * Driver broadcasts their location update.
         * Payload: { rideId, driverId, lat, lng, heading?, speed? }
         * Passengers in the tracking room receive driver_location event.
         */
        socket.on('driver_location_update', (payload) => {
            const { rideId, driverId, lat, lng, heading, speed } = payload;
            const trackingRoom = `tracking:${rideId}`;
            const locationData = { driverId, lat, lng, heading, speed, timestamp: Date.now() };
            // Update session cache
            const session = activeTrackingSessions.get(rideId);
            if (session) {
                session.lastLocation = locationData;
            }
            else {
                activeTrackingSessions.set(rideId, { driverId, lastLocation: locationData });
            }
            // Broadcast to all passengers tracking this ride (excluding driver)
            socket.to(trackingRoom).emit('driver_location', locationData);
        });
        /**
         * Passenger joins a ride's tracking room to receive live location.
         * Payload: { rideId }
         */
        socket.on('passenger_join_tracking', ({ rideId }) => {
            const trackingRoom = `tracking:${rideId}`;
            socket.join(trackingRoom);
            logger_1.default.info(`Passenger socket ${socket.id} joined tracking room for ride ${rideId}`);
            // Send last known location immediately if available
            const session = activeTrackingSessions.get(rideId);
            if (session?.lastLocation) {
                socket.emit('driver_location', session.lastLocation);
            }
        });
        /**
         * Driver stops sharing location (ride completed or manually stopped).
         * Payload: { rideId }
         */
        socket.on('driver_stop_tracking', ({ rideId }) => {
            const trackingRoom = `tracking:${rideId}`;
            activeTrackingSessions.delete(rideId);
            io?.to(trackingRoom).emit('tracking_stopped', { rideId });
            socket.leave(trackingRoom);
            logger_1.default.info(`Driver stopped location tracking for ride ${rideId}`);
        });
        // ─── SOS Alert ──────────────────────────────────────────────
        socket.on('sos_alert', (sosData) => {
            logger_1.default.error(`🚨 SOS ALERT: User ${sosData.userId} (${sosData.userName}) triggered emergency alert at coordinates: ${JSON.stringify(sosData.coordinates)}`);
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
                    logger_1.default.info(`User ${userId} disconnected from socket ${socket.id}`);
                    break;
                }
            }
        });
    });
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io has not been initialized yet!');
    }
    return io;
};
exports.getIO = getIO;
const sendToUser = (userId, eventName, data) => {
    if (io) {
        io.to(userId).emit(eventName, data);
    }
};
exports.sendToUser = sendToUser;
const isUserInChatRoom = (userId, chatId) => {
    if (!io)
        return false;
    const socketId = userSockets.get(userId);
    if (!socketId)
        return false;
    const socket = io.sockets.sockets.get(socketId);
    return socket ? socket.rooms.has(chatId) : false;
};
exports.isUserInChatRoom = isUserInChatRoom;
