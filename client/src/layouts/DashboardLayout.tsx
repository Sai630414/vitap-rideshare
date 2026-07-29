import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Search,
  PlusCircle,
  MessageSquare,
  User,
  Shield,
  LogOut,
  Bell,
  AlertTriangle,
  Menu,
  X,
  Sun,
  Moon,
  Compass,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import notificationService from '../services/notificationService';

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showSosModal, setShowSosModal] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);

  // Sync dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Fetch initial notifications count
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

  // Subscribe to real-time notifications to update badge count
  useEffect(() => {
    if (!socket) return;

    socket.on('notification', () => {
      setUnreadNotifications((prev) => prev + 1);
    });

    return () => {
      socket.off('notification');
    };
  }, [socket]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

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

    // Grab current GPS position
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          sendSos(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.warn('Geolocation failed, sending mock VIT-AP central location:', error);
          // Fallback: VIT-AP Central Coordinates: Latitude 16.4971, Longitude 80.4992
          sendSos(16.4971, 80.4992);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      // Fallback
      sendSos(16.4971, 80.4992);
    }
  };

  // Nav items configuration
  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Search Rides', path: '/search', icon: Search },
    { name: 'Offer a Ride', path: '/offer-ride', icon: PlusCircle, driverOnly: true },
    { name: 'Ride Requests', path: '/requests', icon: Compass },
    { name: 'Realtime Chat', path: '/chat', icon: MessageSquare },
    { name: 'My Profile', path: '/profile', icon: User },
  ];

  if (user?.role === 'admin') {
    menuItems.push({ name: 'Admin Control', path: '/admin', icon: Shield });
  }

  return (
    <div className="min-h-screen flex bg-zinc-950 text-zinc-100 transition-colors duration-300 light:bg-zinc-50 light:text-zinc-900">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-zinc-800/80 bg-zinc-900/40 backdrop-blur-xl shrink-0 light:bg-white light:border-zinc-200">
        {/* Brand */}
        <div className="p-6 border-b border-zinc-800/60 light:border-zinc-200">
          <Link to="/dashboard" className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent font-sans">
              VIT RideShare
            </span>
          </Link>
        </div>

        {/* User preview */}
        <div className="p-4 flex items-center gap-3 border-b border-zinc-800/60 light:border-zinc-200">
          <img
            src={user?.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.name || '')}`}
            alt="profile"
            className="w-10 h-10 rounded-full object-cover border border-zinc-700/50"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate leading-4">{user?.name}</p>
            <p className="text-xs text-zinc-400 truncate mt-1 capitalize">{user?.role}</p>
          </div>
        </div>

        {/* Links */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            if (item.driverOnly && (!user || user.role === 'admin')) {
              return null;
            }
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/10'
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 light:text-zinc-500 light:hover:bg-zinc-100'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-zinc-800/60 space-y-2 light:border-zinc-200">
          {/* SOS Emergency button */}
          <button
            onClick={() => setShowSosModal(true)}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/10 hover:shadow-red-600/20 active:scale-[0.98] transition-all"
          >
            <AlertTriangle className="w-5 h-5 animate-pulse" />
            EMERGENCY SOS
          </button>

          {/* Theme switch */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-medium text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 light:text-zinc-500 light:hover:bg-zinc-100"
          >
            <span className="flex items-center gap-3">
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-950/20 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Top Header & Sidebar */}
      <div className="flex-1 flex flex-col md:pl-0">
        <header className="flex md:hidden items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl light:bg-white light:border-zinc-200">
          <Link to="/dashboard" className="text-lg font-bold tracking-tight text-white font-sans light:text-zinc-900">
            VIT RideShare
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSosModal(true)}
              className="p-2 rounded-lg bg-red-600/20 text-red-500 hover:bg-red-600/30 transition-all border border-red-500/20"
            >
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 top-[65px] z-40 flex flex-col bg-zinc-950/95 border-b border-zinc-800/80 p-6 space-y-4 overflow-y-auto animate-fade-in">
            <nav className="space-y-1">
              {menuItems.map((item) => {
                if (item.driverOnly && (!user || user.role !== 'driver' || !user.verifiedDriver)) {
                  return null;
                }
                const Icon = item.icon;
                const active = location.pathname === item.path;

                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
                      active ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:bg-zinc-800/40'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-zinc-850 pt-4 space-y-2">
              <button
                onClick={() => {
                  setDarkMode(!darkMode);
                  setMobileOpen(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-zinc-400"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                {darkMode ? 'Light Mode' : 'Dark Mode'}
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-400"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto overflow-y-auto">
          {children}
        </main>
      </div>

      {/* SOS Alert Confirmation Dialog */}
      {showSosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-900 border border-red-500/30 rounded-2xl p-6 shadow-xl animate-scale-up text-center">
            <div className="mx-auto w-16 h-16 flex items-center justify-center bg-red-950/50 border border-red-500/50 rounded-full text-red-500 mb-4 animate-bounce">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-red-500">Trigger Emergency SOS?</h3>
            <p className="text-sm text-zinc-400 mt-2">
              This will extract your device's exact location coordinate data and broadcast a high-priority emergency alert in real-time to all administrators on our server.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSosModal(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 transition-colors"
                disabled={sosLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleTriggerSOS}
                className="flex-1 py-3 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2"
                disabled={sosLoading}
              >
                {sosLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Yes, Broadcast SOS'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
