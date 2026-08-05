import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Trigger local push notification on native Android / iOS devices
    if (Capacitor.isNativePlatform()) {
      try {
        const title = type === 'success' ? 'Waygo Success' : type === 'error' ? 'Waygo Alert' : 'Waygo Info';
        // Use Notification web/native API fallback or PushNotifications schema
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, { body: message });
        }
      } catch (e) {
        console.warn('[ToastContext] Native mobile notification trigger:', e);
      }
    }

    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg: string) => addToast(msg, 'success'),
    error: (msg: string) => addToast(msg, 'error'),
    info: (msg: string) => addToast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      
      {/* Toast container overlay */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          let bgClass = 'bg-zinc-950/90 text-zinc-100 border border-zinc-800';
          let Icon = Info;
          let iconColor = 'text-blue-400';

          if (t.type === 'success') {
            bgClass = 'bg-emerald-950/90 text-emerald-50 border border-emerald-800/50';
            Icon = CheckCircle;
            iconColor = 'text-emerald-400';
          } else if (t.type === 'error') {
            bgClass = 'bg-red-950/90 text-red-50 border border-red-800/50';
            Icon = AlertCircle;
            iconColor = 'text-red-400';
          }

          return (
            <div
              key={t.id}
              className={`flex items-start gap-3 p-4 rounded-xl shadow-lg backdrop-blur-md transition-all duration-300 transform translate-y-0 animate-fade-in pointer-events-auto ${bgClass}`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${iconColor}`} />
              <div className="flex-1 text-sm font-medium leading-5">{t.message}</div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-zinc-400 hover:text-zinc-200 transition-colors pointer-events-auto"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
