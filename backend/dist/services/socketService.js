"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendToUser = exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const logger_1 = __importDefault(require("../utils/logger"));
let io = null;
const userSockets = new Map(); // userId -> socketId
const initSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: (origin, callback) => {
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
        logger_1.default.info(`New WebSocket client connected: ${socket.id}`);
        socket.on('register_user', (userId) => {
            userSockets.set(userId, socket.id);
            socket.join(userId);
            logger_1.default.info(`User ${userId} bound to socket ${socket.id}`);
        });
        socket.on('join_chat', (chatId) => {
            socket.join(chatId);
            logger_1.default.info(`Socket ${socket.id} joined room ${chatId}`);
        });
        socket.on('typing', ({ chatId, userId, userName, isTyping }) => {
            socket.to(chatId).emit('typing_status', { userId, userName, isTyping });
        });
        socket.on('sos_alert', (sosData) => {
            logger_1.default.error(`🚨 SOS ALERT: User ${sosData.userId} (${sosData.userName}) triggered emergency alert at coordinates: ${JSON.stringify(sosData.coordinates)}`);
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
