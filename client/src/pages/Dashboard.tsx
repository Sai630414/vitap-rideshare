import React, { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Car,
  Search,
  Clock,
  Bell,
  Check,
  Star,
  ShieldCheck,
  Zap,
  ChevronRight,
  Plus,
  MessageSquare,
  Sparkles,
  Navigation,
} from 'lucide-react';
import bookingService, { type BookingData } from '../services/bookingService';
import notificationService, { type NotificationData } from '../services/notificationService';
import DriverDashboard from './driver/DriverDashboard';

import useSocket from '../context/SocketContext';

// ==========================================
// STUDENT DASHBOARD COMPONENT (Mobile First)
// ==========================================
const StudentDashboard: React.FC<{ user: any; toast: any; navigate: any }> = ({ user, toast, navigate }) => {
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const { socket } = useSocket();

  const fetchBookings = async () => {
    try {
      const bookingsRes = await bookingService.getMyBookings();
      if (bookingsRes.status === 'success') {
        setBookings(bookingsRes.data.bookings);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const notifRes = await notificationService.getMyNotifications();
      if (notifRes.status === 'success') {
        setNotifications(notifRes.data.notifications);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchNotifications();
  }, []);

  // Real-time Socket Event Listeners for Instant UI updates
  useEffect(() => {
    if (!socket) return;

    const handleBookingCreated = (newBooking: any) => {
      setBookings((prev) => [newBooking, ...prev.filter((b) => b._id !== newBooking._id)]);
    };

    const handleBookingUpdated = (updatedBooking: any) => {
      setBookings((prev) =>
        prev.map((b) => (b._id === updatedBooking._id ? updatedBooking : b))
      );
    };

    const handleRideUpdated = (updatedRide: any) => {
      setBookings((prev) =>
        prev.map((b) => (b.ride?._id === updatedRide._id ? { ...b, ride: updatedRide } : b))
      );
    };

    const handleNewNotification = (newNotif: any) => {
      setNotifications((prev) => [newNotif, ...prev.filter((n) => n._id !== newNotif._id)]);
    };

    socket.on('booking_created', handleBookingCreated);
    socket.on('booking_updated', handleBookingUpdated);
    socket.on('ride_updated', handleRideUpdated);
    socket.on('notification', handleNewNotification);

    return () => {
      socket.off('booking_created', handleBookingCreated);
      socket.off('booking_updated', handleBookingUpdated);
      socket.off('ride_updated', handleRideUpdated);
      socket.off('notification', handleNewNotification);
    };
  }, [socket]);

  const handleMarkRead = async (id: string) => {
    try {
      const res = await notificationService.markAsRead(id);
      if (res.status === 'success') {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
      }
    } catch (err) {
      toast.error('Failed to update notification');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await notificationService.markAllAsRead();
      if (res.status === 'success') {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        toast.success('All notifications marked as read.');
      }
    } catch (err) {
      toast.error('Failed to update notifications');
    }
  };

  const getStatusBadge = (status: string, rideStatus?: string) => {
    if (rideStatus === 'ongoing' && status === 'accepted') {
      return (
        <span className="text-[10px] font-extrabold tracking-wider uppercase px-2.5 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-300 animate-pulse flex items-center gap-1">
          <span>Ongoing Trip 🚗</span>
        </span>
      );
    }
    const styles: any = {
      accepted: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      pending: 'bg-amber-50 text-amber-600 border-amber-200',
      rejected: 'bg-rose-50 text-rose-600 border-rose-200',
      cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
    };
    return (
      <span className={`text-[10px] font-extrabold tracking-wider uppercase px-2.5 py-0.5 rounded-full border ${styles[status] || styles.cancelled}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-5 py-2 animate-in fade-in duration-300">
      
      {/* Greeting Header & Avatar Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-5 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <img
              src={user?.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.name || '')}`}
              alt="avatar"
              className="w-12 h-12 rounded-2xl object-cover ring-2 ring-emerald-500/40 shadow-md"
            />
            <div>
              <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Welcome back
              </p>
              <h1 className="text-xl font-black tracking-tight text-white mt-0.5">
                {user?.name?.split(' ')[0]}
              </h1>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10 text-right">
            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Trust Score</p>
            <p className="text-base font-black text-emerald-400 leading-tight">{user?.trustScore || 100}%</p>
          </div>
        </div>

        {/* Quick Search Action Box */}
        <div 
          onClick={() => navigate('/search')}
          className="mt-4 bg-white/10 hover:bg-white/15 active:scale-[0.99] transition-all rounded-2xl p-3.5 flex items-center gap-3 border border-white/10 cursor-pointer backdrop-blur-md"
        >
          <Search className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-bold text-white">Where are you going?</p>
            <p className="text-[10px] text-slate-300">Campus, Railway Station, Bus Stand...</p>
          </div>
          <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Quick Access Actions */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          onClick={() => navigate('/search')}
          className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center active:scale-95 transition-transform"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 shadow-inner">
            <Search className="w-5 h-5" />
          </div>
          <span className="text-xs font-black text-slate-800">Find Ride</span>
          <span className="text-[9px] text-slate-400 font-bold">Search seats</span>
        </button>

        <button
          onClick={() => navigate('/offer-ride')}
          className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center active:scale-95 transition-transform"
        >
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-2 shadow-inner">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-xs font-black text-slate-800">Offer Ride</span>
          <span className="text-[9px] text-slate-400 font-bold">Share trip</span>
        </button>

        <button
          onClick={() => navigate('/requests')}
          className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center active:scale-95 transition-transform"
        >
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 shadow-inner">
            <Navigation className="w-5 h-5" />
          </div>
          <span className="text-xs font-black text-slate-800">Requests</span>
          <span className="text-[9px] text-slate-400 font-bold">Post custom</span>
        </button>
      </div>

      {/* Driver Registration Banner if not driver */}
      {user?.role === 'student' && (
        <div 
          onClick={() => navigate('/driver/register')}
          className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-2xl p-4 text-white shadow-md flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-black">Become a Driver</p>
              <p className="text-[10px] text-teal-100">Offer rides to fellow VIT-AP students</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white/80" />
        </div>
      )}

      {/* Recent Bookings & Rides */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-black text-slate-900">My Booked Rides</h3>
          </div>
          <button 
            onClick={() => navigate('/search')}
            className="text-[11px] font-extrabold text-emerald-600 hover:underline"
          >
            Explore
          </button>
        </div>

        {loadingBookings ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Car className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">No active bookings yet</p>
            <button 
              onClick={() => navigate('/search')}
              className="mt-2 text-xs font-extrabold text-emerald-600 hover:underline"
            >
              Search available rides
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {bookings.map((booking) => {
              const ride = booking.ride;
              if (!ride) return null;
              return (
                <div
                  key={booking._id}
                  onClick={() => navigate(`/ride/${ride._id}`)}
                  className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl active:bg-slate-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    {getStatusBadge(booking.status, ride.status)}
                    <span className="text-[10px] font-bold text-slate-400">
                      {new Date(ride.departureDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {ride.departureTime}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 truncate">
                        <span className="truncate">{ride.source}</span>
                        <span className="text-slate-400">→</span>
                        <span className="truncate">{ride.destination}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <img
                          src={ride.driver.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${ride.driver.name}`}
                          className="w-5 h-5 rounded-full object-cover"
                          alt=""
                        />
                        <span className="text-[11px] font-semibold text-slate-600 truncate">{ride.driver.name}</span>
                        <span className="flex items-center text-[10px] font-bold text-amber-500">
                          <Star className="w-3 h-3 fill-amber-400" /> {ride.driver.rating}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base font-black text-emerald-600">₹{ride.price}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Notifications & Updates */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-black text-slate-900">Notifications</h3>
          </div>
          {notifications.some((n) => !n.isRead) && (
            <button onClick={handleMarkAllRead} className="text-[11px] font-extrabold text-emerald-600 hover:underline">
              Clear all
            </button>
          )}
        </div>

        {loadingNotifications ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-6 text-slate-400">
            <Bell className="w-6 h-6 mx-auto mb-1 opacity-40" />
            <p className="text-xs font-bold">No new notifications</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.slice(0, 4).map((n) => (
              <div
                key={n._id}
                className={`p-3 rounded-2xl border transition-all ${
                  n.isRead ? 'bg-slate-50 border-transparent text-slate-500' : 'bg-emerald-50/50 border-emerald-100 text-slate-800 font-medium'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{n.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{n.body}</p>
                  </div>
                  {!n.isRead && (
                    <button
                      onClick={() => handleMarkRead(n._id)}
                      className="p-1 rounded-full bg-emerald-100 text-emerald-700"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Safety Badge */}
      <div className="bg-slate-900 text-white rounded-3xl p-4 flex items-center gap-3.5 shadow-md">
        <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-bold text-white">100% Verified Campus Community</p>
          <p className="text-[10px] text-slate-400">Every ride driver is a verified VIT-AP student.</p>
        </div>
      </div>

    </div>
  );
};

// ==========================================
// CORE EXPORTED DASHBOARD CONTAINER (ROLE ROUTER)
// ==========================================
export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  if (!user) {
    return (
      <div className="min-h-[300px] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-500">Loading profile...</p>
      </div>
    );
  }

  return (
    <>
      {user.role === 'driver' ? (
        <DriverDashboard />
      ) : (
        <StudentDashboard user={user} toast={toast} navigate={navigate} />
      )}
    </>
  );
};

export default Dashboard;

