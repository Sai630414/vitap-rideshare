import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Search,
  Plus,
  MessageSquare,
  User,
  Shield,
  AlertTriangle,
  Compass,
  Bell,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import notificationService from '../services/notificationService';

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { toast } = useToast();
  const location = useLocation();

  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showSosModal, setShowSosModal] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await notificationService.getMyNotifications();
        if (res.status === 'success') {
          const unread = res.data.notifications.filter((n: any) => !n.isRead).length;
          setUnreadNotifications(unread);
        }
      } catch (err) {
        console.error('Failed to load notifications count:', err);
      }
    };
    fetchNotifications();
  }, [location.pathname]);

  useEffect(() => {
    if (!socket) return;
    socket.on('notification', () => {
      setUnreadNotifications((prev) => prev + 1);
    });
    return () => {
      socket.off('notification');
    };
  }, [socket]);

  const handleTriggerSOS = () => {
    if (!user) return;
    setSosLoading(true);
    const sendSos = (lat: number, lng: number) => {
      if (socket) {
        socket.emit('sos_alert', {
          userId: user._id,
          userName: user.name,
          phone: user.phone || 'No phone number linked',
          coordinates: [lng, lat],
        });
        toast.error('🚨 Emergency SOS alert has been broadcast to all admins.');
      } else {
        toast.error('Emergency trigger failed: No server connection.');
      }
      setSosLoading(false);
      setShowSosModal(false);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => sendSos(position.coords.latitude, position.coords.longitude),
        () => sendSos(16.4971, 80.4992),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      sendSos(16.4971, 80.4992);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-start antialiased sm:py-4">
      {/* Mobile-First Frame Container (Max 480px width centered on desktop, edge-to-edge on mobile) */}
      <div className="w-full max-w-[480px] min-h-screen sm:min-h-[92vh] sm:max-h-[92vh] bg-slate-50 sm:rounded-[2.5rem] shadow-2xl relative flex flex-col overflow-hidden border border-slate-800/20">
        
        {/* Native Top Header */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center justify-between shadow-sm">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center shadow-md shadow-emerald-600/20 group-active:scale-95 transition-transform">
              <Compass className="text-white w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900 leading-none block">Waygo</span>
              <span className="text-[10px] font-bold text-emerald-600 tracking-wider uppercase leading-none block mt-0.5">VITAP Campus</span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                title="Admin Dashboard"
              >
                <Shield className="w-4 h-4" />
              </Link>
            )}

            <button
              onClick={() => setShowSosModal(true)}
              className="px-2.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200/60 text-rose-600 font-extrabold text-xs flex items-center gap-1.5 active:scale-95 transition-transform shadow-sm"
            >
              <AlertTriangle className="w-3.5 h-3.5 animate-pulse text-rose-600" />
              <span>SOS</span>
            </button>
          </div>
        </header>

        {/* Scrollable Screen Content */}
        <main className="flex-1 overflow-y-auto pb-28 pt-2 px-4 no-scrollbar">
          {children}
        </main>

        {/* Material 3 Native Fixed Bottom Navigation Bar */}
        <nav className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-100 z-50 px-2 h-20 flex items-center justify-around rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.06)] pb-safe">
          
          {/* Home Tab */}
          <Link
            to="/dashboard"
            className={`flex flex-col items-center justify-center flex-1 h-full relative transition-all duration-200 ${
              isActive('/dashboard') ? 'text-emerald-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className={`px-4 py-1.5 rounded-full transition-all ${isActive('/dashboard') ? 'bg-emerald-50 text-emerald-600 scale-105' : 'active:scale-90'}`}>
              <Home className="w-5 h-5" strokeWidth={isActive('/dashboard') ? 2.5 : 2} />
            </div>
            <span className="text-[10px] font-bold mt-0.5 tracking-tight">Home</span>
          </Link>

          {/* Search Tab */}
          <Link
            to="/search"
            className={`flex flex-col items-center justify-center flex-1 h-full relative transition-all duration-200 ${
              isActive('/search') ? 'text-emerald-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className={`px-4 py-1.5 rounded-full transition-all ${isActive('/search') ? 'bg-emerald-50 text-emerald-600 scale-105' : 'active:scale-90'}`}>
              <Search className="w-5 h-5" strokeWidth={isActive('/search') ? 2.5 : 2} />
            </div>
            <span className="text-[10px] font-bold mt-0.5 tracking-tight">Find</span>
          </Link>

          {/* Floating Action Button: Offer Ride */}
          <div className="flex-1 flex flex-col items-center justify-center h-full relative">
            <Link
              to="/offer-ride"
              className="absolute -top-5 w-14 h-14 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-600/35 border-[3px] border-white active:scale-95 transition-all group"
            >
              <Plus className="w-7 h-7 text-white group-hover:rotate-90 transition-transform duration-300" strokeWidth={3} />
            </Link>
            <span className="text-[10px] font-extrabold mt-8 text-emerald-700 tracking-tight">Offer</span>
          </div>

          {/* Chats Tab */}
          <Link
            to="/chat"
            className={`flex flex-col items-center justify-center flex-1 h-full relative transition-all duration-200 ${
              isActive('/chat') ? 'text-emerald-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className={`px-4 py-1.5 rounded-full transition-all relative ${isActive('/chat') ? 'bg-emerald-50 text-emerald-600 scale-105' : 'active:scale-90'}`}>
              <MessageSquare className="w-5 h-5" strokeWidth={isActive('/chat') ? 2.5 : 2} />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
              )}
            </div>
            <span className="text-[10px] font-bold mt-0.5 tracking-tight">Chats</span>
          </Link>

          {/* Profile Tab */}
          <Link
            to="/profile"
            className={`flex flex-col items-center justify-center flex-1 h-full relative transition-all duration-200 ${
              isActive('/profile') ? 'text-emerald-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className={`px-4 py-1.5 rounded-full transition-all ${isActive('/profile') ? 'bg-emerald-50 text-emerald-600 scale-105' : 'active:scale-90'}`}>
              <User className="w-5 h-5" strokeWidth={isActive('/profile') ? 2.5 : 2} />
            </div>
            <span className="text-[10px] font-bold mt-0.5 tracking-tight">Profile</span>
          </Link>
        </nav>

        {/* SOS Emergency Modal */}
        {showSosModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl text-center border border-slate-100">
              <div className="mx-auto w-16 h-16 flex items-center justify-center bg-rose-100 text-rose-600 rounded-full mb-4 shadow-inner">
                <AlertTriangle className="w-8 h-8 animate-bounce" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-1">Emergency SOS Alert</h3>
              <p className="text-xs text-slate-500 font-medium mb-6 leading-relaxed">
                This will immediately broadcast your GPS coordinates to all security admins & campus authority dispatch.
              </p>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleTriggerSOS}
                  disabled={sosLoading}
                  className="w-full py-3.5 rounded-2xl text-sm font-extrabold bg-rose-600 text-white shadow-lg shadow-rose-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {sosLoading ? 'Dispatching Alert...' : '🚨 Confirm & Dispatch SOS'}
                </button>
                <button
                  onClick={() => setShowSosModal(false)}
                  className="w-full py-3 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardLayout;

