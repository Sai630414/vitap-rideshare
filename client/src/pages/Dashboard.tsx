import React, { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Car,
  Compass,
  Search,
  Clock,
  Bell,
  Check,
  Star,
  Plus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  CircleDollarSign,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import bookingService, { type BookingData } from '../services/bookingService';
import notificationService, { type NotificationData } from '../services/notificationService';
import rideService, { type RideData } from '../services/rideService';
import DriverDashboard from './driver/DriverDashboard';

// ==========================================
// STUDENT DASHBOARD COMPONENT
// ==========================================
const StudentDashboard: React.FC<{ user: any; toast: any; navigate: any }> = ({ user, toast, navigate }) => {
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
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

    fetchData();
  }, []);

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

  const getBookingStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge variant="success">Approved</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending Driver</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Declined</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Welcome Banner */}
      <div className="relative p-6 md:p-8 bg-gradient-to-r from-violet-900/60 to-indigo-900/60 rounded-3xl border border-violet-850/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -z-10"></div>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-sm text-zinc-300 mt-2 font-medium">
            Commute safely, build trust, and save transit costs with fellow VITians.
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="bg-zinc-950/60 backdrop-blur-md border border-zinc-800/80 p-4 rounded-2xl text-center min-w-[100px]">
            <p className="text-xs text-zinc-400 font-bold uppercase">Trust Score</p>
            <p className="text-2xl font-black text-violet-400 mt-1">{user?.trustScore}%</p>
          </div>
          <div className="bg-zinc-950/60 backdrop-blur-md border border-zinc-800/80 p-4 rounded-2xl text-center min-w-[100px]">
            <p className="text-xs text-zinc-400 font-bold uppercase">Total Trips</p>
            <p className="text-2xl font-black text-indigo-400 mt-1">{user?.totalTrips}</p>
          </div>
        </div>
      </div>

      {/* Grid: Left - Actions and Bookings, Right - Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card
              className="hover:border-violet-500/50 cursor-pointer active:scale-[0.99] transition-all"
              onClick={() => navigate('/search')}
            >
              <CardContent className="p-6 flex items-start gap-4">
                <div className="p-3 bg-violet-600/10 text-violet-400 rounded-2xl">
                  <Search className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Find a Ride</h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-4">
                    Search coordinates, compare drivers, and book seats to Vijayawada or Guntur.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="hover:border-indigo-500/50 cursor-pointer active:scale-[0.99] transition-all"
              onClick={() => navigate('/requests')}
            >
              <CardContent className="p-6 flex items-start gap-4">
                <div className="p-3 bg-indigo-600/10 text-indigo-400 rounded-2xl">
                  <Compass className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Ride Requests</h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-4">
                    Need a custom ride? Post your trip details so nearby drivers can fulfill it.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="border-b border-zinc-800/40 pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="w-5 h-5 text-violet-400" />
                Active Trip Bookings
              </CardTitle>
              <CardDescription>Rides you have requested or booked</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {loadingBookings ? (
                <div className="flex flex-col gap-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-16 bg-zinc-850 rounded-xl animate-pulse"></div>
                  ))}
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-10">
                  <Car className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-zinc-400">No active bookings found</p>
                  <p className="text-xs text-zinc-500 mt-1">When you book a seat, it will show up here.</p>
                  <Button variant="outline" size="sm" className="mt-4 text-xs cursor-pointer" onClick={() => navigate('/search')}>
                    Search Rides Now
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => {
                    const ride = booking.ride;
                    if (!ride) return null;
                    return (
                      <div
                        key={booking._id}
                        className="p-4 bg-zinc-950 border border-zinc-850 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-zinc-800 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-xs font-bold text-zinc-400">
                              {new Date(ride.departureDate).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}{' '}
                              at {ride.departureTime}
                            </span>
                            {getBookingStatusBadge(booking.status)}
                          </div>
                          <div className="flex items-center gap-2 mt-2.5 text-sm font-bold text-zinc-150">
                            <span>{ride.source}</span>
                            <span className="text-zinc-500 font-normal">→</span>
                            <span>{ride.destination}</span>
                          </div>
                          <div className="flex items-center gap-4 mt-3 text-xs text-zinc-400">
                            <div className="flex items-center gap-1.5">
                              <img
                                src={ride.driver.profileImage || 'https://api.dicebear.com/7.x/initials/svg?seed=driver'}
                                className="w-4 h-4 rounded-full object-cover"
                                alt=""
                              />
                              <span>{ride.driver.name}</span>
                              <span className="flex items-center gap-0.5 text-amber-400">
                                <Star className="w-3 h-3 fill-amber-400" />
                                {ride.driver.rating}
                              </span>
                            </div>
                            <span>•</span>
                            <span className="capitalize">{ride.vehicle?.brand} {ride.vehicle?.model} ({ride.vehicle?.type})</span>
                          </div>
                        </div>
                        <div className="flex md:flex-col items-end gap-3 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-zinc-850 justify-between md:justify-center">
                          <div>
                            <p className="text-[10px] text-zinc-500 text-right">Price per seat</p>
                            <p className="text-sm font-extrabold text-violet-400 text-right">₹{ride.price}</p>
                          </div>
                          <Button variant="secondary" size="sm" className="text-xs py-1.5 h-auto px-3 cursor-pointer" onClick={() => navigate(`/ride/${ride._id}`)}>
                            Details
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader className="border-b border-zinc-800/40 pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="w-5 h-5 text-violet-400 animate-pulse" />
                Notification Board
              </CardTitle>
              <CardDescription>Real-time platform updates</CardDescription>
            </div>
            {notifications.some((n) => !n.isRead) && (
              <button onClick={handleMarkAllRead} className="text-[11px] font-bold text-violet-400 hover:text-violet-300 transition-colors uppercase shrink-0 cursor-pointer">
                Clear All
              </button>
            )}
          </CardHeader>
          <CardContent className="pt-6 max-h-[500px] overflow-y-auto">
            {loadingNotifications ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-zinc-850 rounded-xl animate-pulse"></div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">No notifications found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div
                    key={n._id}
                    className={`p-3 rounded-xl border transition-all relative ${
                      n.isRead
                        ? 'bg-zinc-950/20 border-zinc-900 text-zinc-400'
                        : 'bg-violet-950/10 border-violet-900/30 text-zinc-200'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-xs font-bold leading-tight truncate pr-4">{n.title}</p>
                      {!n.isRead && (
                        <button
                          onClick={() => handleMarkRead(n._id)}
                          className="p-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors pointer-events-auto shrink-0 cursor-pointer"
                          title="Mark as Read"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] leading-4 text-zinc-400 mt-1">{n.body}</p>
                    <p className="text-[9px] text-zinc-500 mt-2 text-right">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ==========================================
// DRIVER DASHBOARD COMPONENT
// ==========================================
const InlineDriverDashboard: React.FC<{ user: any; toast: any; navigate: any }> = ({ user, toast, navigate }) => {
  const driver = user.driverDetails;
  const status = driver?.approvalStatus || 'pending';

  const [myRides, setMyRides] = useState<RideData[]>([]);
  const [loadingRides, setLoadingRides] = useState(true);
  const [earnings, setEarnings] = useState(0);

  useEffect(() => {
    const fetchDriverRides = async () => {
      try {
        // Use dedicated /rides/mine endpoint — returns only this driver's rides, server-side filtered
        const response = await rideService.getMyRides();
        if (response.status === 'success') {
          const driverRides: RideData[] = response.data.rides;
          setMyRides(driverRides);

          // Calculate real earnings from completed rides (price * seats booked)
          const completed = driverRides.filter((r) => r.status === 'completed');
          const totalEarnings = completed.reduce((sum, r) => sum + (r.price || 0), 0);
          setEarnings(totalEarnings);
        }
      } catch (err) {
        console.error('Failed to load driver rides:', err);
      } finally {
        setLoadingRides(false);
      }
    };

    fetchDriverRides();
  }, [user._id]);

  const handleUpdateStatus = async (rideId: string, newStatus: 'ongoing' | 'completed' | 'cancelled') => {
    try {
      const response = await rideService.updateRideStatus(rideId, newStatus);
      if (response.status === 'success') {
        toast.success(`Ride marked as ${newStatus}`);
        setMyRides((prev) =>
          prev.map((r) => (r._id === rideId ? { ...r, status: newStatus } : r))
        );
      }
    } catch (err) {
      toast.error('Failed to update ride status');
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Document verification banner */}
      {status === 'pending' && (
        <div className="p-5 bg-amber-950/20 border border-amber-800/40 rounded-2xl flex items-start gap-4">
          <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <h4 className="font-extrabold text-sm text-amber-200">Registration Pending Review ⏳</h4>
            <p className="text-xs text-zinc-400 mt-1 leading-4">
              Your driver credentials and vehicle files are currently undergoing verification review by the platform administrator. You will receive an email update once your account is activated. Until approved, you cannot host or offer rides.
            </p>
          </div>
        </div>
      )}

      {status === 'resubmission' && (
        <div className="p-5 bg-amber-950/30 border border-amber-700/50 rounded-2xl flex items-start gap-4">
          <ShieldAlert className="w-8 h-8 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-extrabold text-sm text-amber-300">Action Required: Document Resubmission ⚠️</h4>
            <p className="text-xs text-zinc-300 mt-1 leading-4">
              The administrator has requested you to upload clearer photos.
            </p>
            {driver?.rejectionReason && (
              <p className="p-2.5 mt-2 bg-zinc-950/80 border border-zinc-850 text-xs text-amber-200 font-semibold rounded-lg">
                Remarks: {driver.rejectionReason}
              </p>
            )}
            <Button variant="primary" size="sm" className="mt-3 text-xs" onClick={() => navigate('/profile')}>
              Fix Uploads
            </Button>
          </div>
        </div>
      )}

      {status === 'rejected' && (
        <div className="p-5 bg-red-950/20 border border-red-800/40 rounded-2xl flex items-start gap-4">
          <XCircle className="w-8 h-8 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-extrabold text-sm text-red-200">Driver Profile Rejected ❌</h4>
            <p className="text-xs text-zinc-400 mt-1 leading-4">
              Unfortunately, your driver application did not satisfy the requirements.
            </p>
            {driver?.rejectionReason && (
              <p className="p-2.5 mt-2 bg-zinc-950/80 border border-zinc-850 text-xs text-red-300 font-semibold rounded-lg">
                Reason: {driver.rejectionReason}
              </p>
            )}
          </div>
        </div>
      )}

      {status === 'approved' && (
        <div className="p-5 bg-emerald-950/10 border border-emerald-900/30 rounded-2xl flex items-start gap-4">
          <CheckCircle className="w-8 h-8 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-extrabold text-sm text-emerald-250">Verified Driver Account Active 🎖️</h4>
            <p className="text-xs text-zinc-450 mt-1 leading-4">
              Your driver credentials are approved. You can host rides, define seat layouts, accept student bookings, and navigate commute paths.
            </p>
          </div>
        </div>
      )}

      {/* Stats summary row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase">Commute Rating</p>
              <p className="text-2xl font-black mt-1 flex items-center gap-1">
                {user.rating} <Star className="w-5 h-5 text-amber-400 fill-amber-400 shrink-0" />
              </p>
            </div>
            <div className="p-3 bg-zinc-950 rounded-xl text-zinc-400">
              <Star className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase">Hosted Rides</p>
              <p className="text-2xl font-black mt-1">{myRides.length}</p>
            </div>
            <div className="p-3 bg-zinc-950 rounded-xl text-zinc-400">
              <Car className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase">Estimated Earnings</p>
              <p className="text-2xl font-black mt-1 text-emerald-400">₹{earnings}</p>
            </div>
            <div className="p-3 bg-zinc-950 rounded-xl text-emerald-400">
              <CircleDollarSign className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase">Trust Score</p>
              <p className="text-2xl font-black mt-1 text-violet-400">{user.trustScore}%</p>
            </div>
            <div className="p-3 bg-zinc-950 rounded-xl text-zinc-400">
              <TrendingUp className="w-6 h-6 text-violet-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Left - Hosted Rides management, Right - Vehicle Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <CardHeader className="border-b border-zinc-800/40 pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Hosted Commutes</CardTitle>
                <CardDescription>Manage your scheduled or ongoing rides</CardDescription>
              </div>
              {status === 'approved' && (
                <Button size="sm" className="text-xs font-bold gap-1 cursor-pointer" onClick={() => navigate('/offer-ride')}>
                  <Plus className="w-4 h-4" /> Host Ride
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-6">
              {loadingRides ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-16 bg-zinc-850 rounded-xl animate-pulse"></div>
                  ))}
                </div>
              ) : myRides.length === 0 ? (
                <div className="text-center py-10">
                  <Car className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-zinc-400">No hosted rides found</p>
                  {status !== 'approved' ? (
                    <p className="text-xs text-zinc-500 mt-1">Once approved by administrator, you can offer rides.</p>
                  ) : (
                    <p className="text-xs text-zinc-500 mt-1">Tap Host Ride above to schedule your first trip.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {myRides.map((ride) => (
                    <div
                      key={ride._id}
                      className="p-4 bg-zinc-950 border border-zinc-850 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-zinc-800 transition-all"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-zinc-400">
                            {new Date(ride.departureDate).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}{' '}
                            at {ride.departureTime}
                          </span>
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                            ride.status === 'scheduled' ? 'bg-indigo-950 border border-indigo-900 text-indigo-400' :
                            ride.status === 'ongoing' ? 'bg-violet-950 border border-violet-900 text-violet-400 animate-pulse' :
                            ride.status === 'completed' ? 'bg-emerald-950 border border-emerald-900 text-emerald-400' :
                            'bg-zinc-900 text-zinc-500'
                          }`}>
                            {ride.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-sm font-bold text-zinc-100">
                          <span>{ride.source}</span>
                          <span className="text-zinc-500 font-normal">→</span>
                          <span>{ride.destination}</span>
                        </div>
                        <p className="text-xs text-zinc-450 mt-2">
                          Available Seats: <span className="font-bold text-zinc-200">{ride.availableSeats}</span> | Price: <span className="font-bold text-violet-400">₹{ride.price}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end border-t sm:border-t-0 border-zinc-850 pt-3 sm:pt-0">
                        {ride.status === 'scheduled' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(ride._id, 'ongoing')}
                              className="px-2.5 py-1.5 bg-violet-600 hover:bg-violet-750 text-xs font-bold text-white rounded-lg active:scale-95 transition-all cursor-pointer"
                            >
                              Start
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(ride._id, 'cancelled')}
                              className="px-2.5 py-1.5 border border-red-900/30 bg-red-950/20 hover:bg-red-950/40 text-xs font-bold text-red-400 rounded-lg active:scale-95 transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {ride.status === 'ongoing' && (
                          <button
                            onClick={() => handleUpdateStatus(ride._id, 'completed')}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-750 text-xs font-bold text-white rounded-lg active:scale-95 transition-all cursor-pointer"
                          >
                            Complete
                          </button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-xs py-1.5 h-auto px-2.5 cursor-pointer"
                          onClick={() => navigate(`/ride/${ride._id}`)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right - Vehicle & License Profile Preview */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="border-b border-zinc-800/40 pb-4">
              <CardTitle className="text-base">Registered Vehicle</CardTitle>
              <CardDescription>Your verified vehicle metrics</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col gap-4">
              {driver ? (
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center text-sm border-b border-zinc-850 pb-2">
                    <span className="text-zinc-450">Model</span>
                    <span className="font-bold text-zinc-200 capitalize">{driver.vehicleModel}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-zinc-850 pb-2">
                    <span className="text-zinc-450">Color</span>
                    <span className="font-bold text-zinc-200">{driver.vehicleColour}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-zinc-850 pb-2">
                    <span className="text-zinc-450">Number Plate</span>
                    <span className="font-bold text-zinc-200 uppercase select-all">{driver.vehicleNumber}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-zinc-850 pb-2">
                    <span className="text-zinc-450">RC Document No.</span>
                    <span className="font-bold text-zinc-200 uppercase select-all">{driver.vehicleRCNumber}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-zinc-850 pb-2">
                    <span className="text-zinc-450">Licence Number</span>
                    <span className="font-bold text-zinc-200 uppercase select-all">{driver.licenceNumber}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pb-1">
                    <span className="text-zinc-450">Experience</span>
                    <span className="font-bold text-zinc-200">{driver.drivingExperience} Years</span>
                  </div>
                  
                  {/* Photo displays */}
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-zinc-850">
                    <div>
                      <p className="text-[10px] text-zinc-500 font-bold mb-1 text-center">Vehicle Photo</p>
                      <img src={driver.vehicleImage} className="w-full h-24 object-cover rounded-lg border border-zinc-800" alt="Vehicle" />
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 font-bold mb-1 text-center">Licence Card</p>
                      <img src={driver.licenceImage} className="w-full h-24 object-cover rounded-lg border border-zinc-800" alt="Licence" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-zinc-500 text-xs">
                  Vehicle profile information is missing.
                </div>
              )}
            </CardContent>
          </Card>
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

  // If user is Admin, auto redirect to Admin dashboard view
  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  // Fallback loading states
  if (!user) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-zinc-400">
        Syncing account state...
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
