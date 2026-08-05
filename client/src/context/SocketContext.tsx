import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface SocketContextType {
  socket: Socket | null;
  online: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [online, setOnline] = useState<boolean>(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setOnline(false);
      }
      return;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'https://vitap-rideshare.onrender.com';
    const newSocket = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: true,
    });

    newSocket.on('connect', () => {
      setOnline(true);
      newSocket.emit('register_user', user._id);
      console.log('Socket.io connected:', newSocket.id);
    });

    newSocket.on('disconnect', () => {
      setOnline(false);
      console.log('Socket.io disconnected');
    });

    // Real-time Notification listener
    newSocket.on('notification', (notificationData: any) => {
      console.log('Socket notification received:', notificationData);
      
      const { type, title, body } = notificationData;
      const msg = `${title}: ${body}`;

      // Route to appropriate toast style based on notification type
      if (
        type === 'ride_accepted' ||
        type === 'booking_accepted' ||
        type === 'verification_approved' ||
        type === 'ride_completed' ||
        type === 'new_review'
      ) {
        toast.success(msg);
      } else if (
        type === 'ride_cancelled' ||
        type === 'booking_rejected'
      ) {
        toast.error(msg);
      } else if (
        type === 'driver_started' ||
        type === 'driver_arrived'
      ) {
        toast.info(`🚗 ${title}: ${body}`);
      } else if (type === 'new_message') {
        toast.info(`💬 ${title}: ${body}`);
      } else {
        toast.info(msg);
      }
    });

    // SOS Emergency Alert listener (Admins and nearby users receive this)
    newSocket.on('admin_sos_alert', (sosData: any) => {
      if (user.role === 'admin') {
        toast.error(`🚨 EMERGENCY SOS ALERT: Student ${sosData.userName} triggered SOS! Phone: ${sosData.phone}. Locate immediately.`);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, online }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
export default useSocket;
