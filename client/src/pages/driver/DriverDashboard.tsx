import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Car,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Star,
  PlusCircle,
  CircleDollarSign,
  TrendingUp,
  CreditCard,
  Check,
  MessageSquare,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Users,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import api from '../../services/api';
import rideService, { type RideData } from '../../services/rideService';
import bookingService from '../../services/bookingService';
import chatService from '../../services/chatService';
import ReviewDialog from '../../components/ReviewDialog';

import useSocket from '../../context/SocketContext';

// Dynamic Script Loader for Razorpay Checkout
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const DriverDashboard: React.FC = () => {
  const { user, login } = useAuth();
  const { toast } = useToast();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const driver = user?.driverDetails as any;
  const status = (driver?.approvalStatus || 'Pending') as string;
  const hasPaid = !!driver?.paymentStatus;

  // Active Driver Dashboard States
  const [myRides, setMyRides] = useState<RideData[]>([]);
  const [loadingRides, setLoadingRides] = useState(true);
  const [earnings, setEarnings] = useState(0);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Ride Requests States
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [activeTab, setActiveTab] = useState<'rides' | 'requests'>('rides');

  // Feature 2: Passenger reviews by driver
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{ rideId: string; passengerId: string; name: string } | null>(null);
  const [reviewedPassengers, setReviewedPassengers] = useState<Record<string, boolean>>({});
  const [reviewLoading, setReviewLoading] = useState(false);

  // Sync user details to ensure fresh data
  const refreshUserState = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.status === 'success' && login) {
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to sync user state:', err);
    }
  };

  const fetchDriverRides = async () => {
    try {
      const response = await api.get('/rides/mine');
      if (response.data.status === 'success') {
        const allRides: RideData[] = response.data.data.rides;
        setMyRides(allRides);
        const completed = allRides.filter((r) => r.status === 'completed');
        setEarnings(completed.length * 150);
      }
    } catch (err) {
      console.error('Failed to load driver rides:', err);
    } finally {
      setLoadingRides(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await bookingService.getDriverRequests();
      if (res.status === 'success') {
        setRequests(res.data.bookings);
      }
    } catch (err) {
      console.error('Failed to load ride requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'driver' && user?.verifiedDriver && hasPaid) {
      fetchDriverRides();
      fetchRequests();
    }
  }, [user, hasPaid]);

  // Real-time Socket listeners for Driver Dashboard
  useEffect(() => {
    if (!socket) return;

    const handleRideCreated = (newRide: RideData) => {
      if (newRide.driver?._id === user?._id) {
        setMyRides((prev) => [newRide, ...prev.filter((r) => r._id !== newRide._id)]);
      }
    };

    const handleRideUpdated = (updatedRide: RideData) => {
      if (updatedRide.driver?._id === user?._id) {
        setMyRides((prev) => prev.map((r) => (r._id === updatedRide._id ? updatedRide : r)));
      }
    };

    const handleBookingCreated = (newBooking: any) => {
      if (newBooking.driver === user?._id || newBooking.ride?.driver?._id === user?._id) {
        setRequests((prev) => [newBooking, ...prev.filter((b) => b._id !== newBooking._id)]);
      }
    };

    const handleBookingUpdated = (updatedBooking: any) => {
      if (updatedBooking.driver === user?._id || updatedBooking.ride?.driver?._id === user?._id) {
        setRequests((prev) => prev.map((b) => (b._id === updatedBooking._id ? updatedBooking : b)));
      }
    };

    const handleDriverApprovalUpdated = (driverDoc: any) => {
      refreshUserState();
    };

    socket.on('driver_ride_created', handleRideCreated);
    socket.on('ride_updated', handleRideUpdated);
    socket.on('booking_created', handleBookingCreated);
    socket.on('booking_updated', handleBookingUpdated);
    socket.on('driver_approval_updated', handleDriverApprovalUpdated);

    return () => {
      socket.off('driver_ride_created', handleRideCreated);
      socket.off('ride_updated', handleRideUpdated);
      socket.off('booking_created', handleBookingCreated);
      socket.off('booking_updated', handleBookingUpdated);
      socket.off('driver_approval_updated', handleDriverApprovalUpdated);
    };
  }, [socket, user]);

  const handleUpdateStatus = async (rideId: string, newStatus: 'ongoing' | 'completed' | 'cancelled') => {
    try {
      const response = await rideService.updateRideStatus(rideId, newStatus);
      if (response.status === 'success') {
        toast.success(`Ride marked as ${newStatus.toUpperCase()}`);
        setMyRides((prev) =>
          prev.map((r) => (r._id === rideId ? { ...r, status: newStatus } : r))
        );

        if (newStatus === 'ongoing') {
          // Instantly open live tracking map route page for driver and passengers
          navigate(`/ride/${rideId}`);
        } else if (newStatus === 'completed') {
          // Find first passenger for this completed ride to review
          const matchedReq = requests.find(req => (req.ride?._id === rideId || req.ride === rideId) && req.status === 'accepted');
          if (matchedReq && matchedReq.passenger) {
            setReviewTarget({
              rideId,
              passengerId: matchedReq.passenger._id,
              name: matchedReq.passenger.name,
            });
            setReviewDialogOpen(true);
          }
        }
      }
    } catch (err) {
      toast.error('Failed to update ride status');
    }
  };

  const handleRespondToRequest = async (bookingId: string, status: 'accepted' | 'rejected') => {
    try {
      const res = await bookingService.respondToBooking(bookingId, status);
      if (res.status === 'success') {
        toast.success(`Request ${status === 'accepted' ? 'accepted' : 'declined'} successfully!`);
        setRequests(prev => prev.map(req => req._id === bookingId ? { ...req, status } : req));
        const ridesRes = await api.get('/rides');
        if (ridesRes.data.status === 'success') {
          const allRides = ridesRes.data.data.rides;
          const filtered = allRides.filter((ride: any) => ride.driver._id === user?._id);
          setMyRides(filtered);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update request.');
    }
  };

  const handleLaunchChat = async (recipientId: string) => {
    try {
      const res = await chatService.getOrCreateChat(recipientId);
      if (res.status === 'success') {
        navigate('/chat', { state: { activeChatId: res.data.chat._id } });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to launch chat thread.');
    }
  };

  const pendingRequestsCount = requests.filter(r => r.status === 'pending').length;

  const handlePassengerReview = async (rating: number, comment: string) => {
    if (!reviewTarget) return;
    setReviewLoading(true);
    try {
      const res = await bookingService.createPassengerReview(
        reviewTarget.rideId,
        reviewTarget.passengerId,
        rating,
        comment
      );
      if (res.status === 'success') {
        toast.success('Passenger reviewed successfully! ⭐');
        setReviewedPassengers(prev => ({ ...prev, [reviewTarget.passengerId]: true }));
        setReviewDialogOpen(false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setReviewLoading(false);
    }
  };

  const handlePayment = async () => {
    setPaymentLoading(true);
    try {
      const res = await api.post('/create-order', { amount: 5000 });
      const { orderId, amount, currency } = res.data;
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error('Razorpay SDK failed to load.');
        setPaymentLoading(false);
        return;
      }
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
        amount: amount,
        currency: currency,
        name: 'Waygo',
        description: 'Driver Subscription Activation',
        order_id: orderId,
        handler: async function (response: any) {
          try {
            const verifyRes = await api.post('/verify-payment', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verifyRes.data.status === 'success') {
              toast.success('🎉 Subscription Activated!');
              await refreshUserState();
            } else {
              toast.error('Payment verification failed.');
              setPaymentLoading(false);
            }
          } catch (err) {
            setPaymentLoading(false);
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: driver?.phone || '',
        },
        theme: { color: '#0F9D58' },
        modal: {
          ondismiss: () => setPaymentLoading(false),
        },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      setPaymentLoading(false);
    }
  };

  if (!driver) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 bg-white rounded-[3rem] shadow-premium">
        <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mb-6">
          <ShieldCheck className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-black text-foreground">Become a Driver</h2>
        <p className="text-muted-foreground font-medium mt-2 max-w-xs mx-auto">
          Host rides and earn while commuting across campus and city.
        </p>
        <Link to="/driver/register" className="mt-8 w-full max-w-xs">
          <Button className="w-full py-4 rounded-2xl">
            Start Application
          </Button>
        </Link>
      </div>
    );
  }

  if (status === 'Pending' || status === 'pending') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
        <div className="w-20 h-20 bg-accent/10 rounded-[2rem] flex items-center justify-center mb-6 animate-pulse">
          <Clock className="w-10 h-10 text-accent" />
        </div>
        <h2 className="text-2xl font-black text-foreground">Application Pending</h2>
        <p className="text-muted-foreground font-medium mt-2 max-w-sm">
          We're verifying your vehicle and licence documents. This usually takes 24-48 hours.
        </p>
        <div className="mt-10 w-full max-w-md bg-white border border-border rounded-[2rem] p-6 space-y-4 text-left shadow-soft">
           <div className="flex justify-between items-center">
             <span className="text-xs font-black uppercase text-muted-foreground tracking-widest">Document Status</span>
             <Badge variant="warning">In Review</Badge>
           </div>
           <div className="h-px bg-border"></div>
           <div className="flex items-center gap-3">
             <CheckCircle className="text-primary w-4 h-4" />
             <span className="text-sm font-bold">Vehicle RC Scanned</span>
           </div>
           <div className="flex items-center gap-3">
             <CheckCircle className="text-primary w-4 h-4" />
             <span className="text-sm font-bold">Driving Licence Verified</span>
           </div>
        </div>
      </div>
    );
  }

  if (status === 'resubmission') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
        <div className="w-20 h-20 bg-destructive/10 rounded-[2rem] flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10 text-destructive" />
        </div>
        <h2 className="text-2xl font-black text-foreground">Fix Required</h2>
        <p className="text-muted-foreground font-medium mt-2 max-w-sm">
          The admin team requested a document update.
        </p>
        {driver?.rejectionReason && (
          <div className="mt-6 p-4 bg-destructive/5 border border-destructive/20 text-destructive font-bold text-sm rounded-2xl max-w-md">
            "{driver.rejectionReason}"
          </div>
        )}
        <Link to="/driver/register" className="mt-8 w-full max-w-xs">
          <Button variant="primary" className="w-full py-4">Update Documents</Button>
        </Link>
      </div>
    );
  }

  if (status === 'Rejected' || status === 'rejected') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-destructive/10 rounded-[2rem] flex items-center justify-center mb-6">
          <XCircle className="w-10 h-10 text-destructive" />
        </div>
        <h2 className="text-2xl font-black text-foreground">Application Rejected</h2>
        <p className="text-muted-foreground font-medium mt-2 max-w-sm">
          Unfortunately, your application was not approved.
        </p>
        <Link to="/driver/register" className="mt-8">
          <Button variant="ghost" className="font-black uppercase tracking-widest text-primary">Try Again</Button>
        </Link>
      </div>
    );
  }

  if ((status === 'Approved' || status === 'approved') && !hasPaid) {
    const updatedAtDate = driver?.updatedAt ? new Date(driver.updatedAt) : new Date();
    // 7 days deadline after approval date
    const deadlineDate = new Date(updatedAtDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffTime = deadlineDate.getTime() - now.getTime();
    const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-primary/10 border-4 border-white rounded-[2.5rem] flex items-center justify-center text-primary mb-6 shadow-2xl shadow-primary/20 animate-bounce">
          <CheckCircle className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-black text-foreground">You're Approved!</h2>
        <p className="text-muted-foreground font-medium mt-2 max-w-sm">
          Just one final step to activate your driver portal.
        </p>

        {/* Subscription Deadline Card */}
        <div className="mt-6 w-full max-w-md bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl p-5 text-white flex items-center justify-between shadow-lg shadow-amber-500/20">
          <div className="flex items-center gap-3 text-left">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center font-black">
              <Clock className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-amber-100 tracking-wider block">Subscription Deadline</span>
              <span className="text-sm font-black text-white block">Complete ₹50 payment to activate</span>
            </div>
          </div>
          <div className="bg-white px-4 py-2 rounded-2xl shadow-md text-center shrink-0">
            <span className="text-xl font-black text-amber-600 block leading-tight">{daysLeft}</span>
            <span className="text-[9px] font-extrabold text-amber-700 block uppercase tracking-wider">{daysLeft === 1 ? 'Day Left' : 'Days Left'}</span>
          </div>
        </div>

        <div className="mt-6 w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-premium text-left">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-6">Activation Fee</h4>
          <div className="flex justify-between items-center mb-2">
            <span className="text-lg font-bold text-foreground">One-time Fee</span>
            <span className="text-2xl font-black text-primary">₹50.00</span>
          </div>
          <p className="text-xs font-medium text-muted-foreground mb-8">
            Covers manual document verification and premium platform access.
          </p>
          <Button
            onClick={handlePayment}
            loading={paymentLoading}
            className="w-full py-5 rounded-[1.5rem] flex items-center justify-center gap-3 shadow-xl shadow-primary/20"
          >
            <CreditCard className="w-5 h-5" />
            Pay & Activate
          </Button>
        </div>
      </div>
    );
  }

  // State 6: Full Driver Dashboard (Approved + Paid)
  return (
    <div className="flex flex-col gap-4 py-2 animate-in fade-in duration-300">
      
      {/* Driver Header Banner Card */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-5 text-white shadow-md shadow-emerald-600/20 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-md">
            <ShieldCheck className="w-3.5 h-3.5 text-white" />
            <span className="text-[10px] font-extrabold tracking-wider uppercase">Verified Driver</span>
          </div>

          <Link to="/offer-ride">
            <button className="px-3 py-1.5 bg-white text-emerald-700 rounded-xl text-xs font-black shadow-sm active:scale-95 transition-transform flex items-center gap-1">
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Offer Ride</span>
            </button>
          </Link>
        </div>

        <div>
          <h1 className="text-xl font-black tracking-tight">Driver Control Center</h1>
          <p className="text-xs text-white/80 font-bold mt-0.5">Manage your hosted trips and passenger bookings</p>
        </div>
      </div>

      {/* Subscription / Days Left Status Card if subscription active */}
      {driver?.updatedAt && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-3xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider block">Active Driver Subscription</span>
              <span className="text-xs font-extrabold text-emerald-950 block">Verified & Subscription Active</span>
            </div>
          </div>
          <div className="bg-white px-3 py-1.5 rounded-2xl border border-emerald-200 shadow-sm text-center">
            <span className="text-base font-black text-emerald-700 block">
              {Math.max(0, Math.ceil((new Date(new Date(driver.updatedAt).getTime() + 30 * 24 * 60 * 60 * 1000).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
            </span>
            <span className="text-[9px] font-bold text-emerald-600 block uppercase tracking-wider">Days Left</span>
          </div>
        </div>
      )}

      {/* Stats Quick Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { label: 'Rating', val: `${user?.rating || 5.0} ⭐`, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Active Trips', val: myRides.filter(r => r.status === 'scheduled' || r.status === 'ongoing').length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Completed', val: myRides.filter(r => r.status === 'completed').length, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Earnings', val: `₹${earnings}`, color: 'text-teal-600', bg: 'bg-teal-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">{stat.label}</span>
            <span className={`text-base font-black ${stat.color}`}>{stat.val}</span>
          </div>
        ))}
      </div>

      {/* Tab Selector */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-1">
        <button
          onClick={() => setActiveTab('rides')}
          className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'rides'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>My Offered Rides ({myRides.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 relative ${
            activeTab === 'requests'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Passenger Bookings</span>
          {pendingRequestsCount > 0 && (
            <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
          )}
        </button>
      </div>

      {/* Rides / Bookings Content List */}
      {activeTab === 'rides' ? (
        loadingRides ? (
          <div className="space-y-2.5">
            {[1, 2].map(i => <div key={i} className="h-24 bg-slate-100 rounded-3xl animate-pulse" />)}
          </div>
        ) : myRides.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <Car className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">No rides listed yet</p>
            <button
              onClick={() => navigate('/offer-ride')}
              className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-extrabold"
            >
              List Your First Ride
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {myRides.map((ride) => (
              <div
                key={ride._id}
                className={`bg-white p-4 rounded-3xl border shadow-sm flex flex-col gap-3 transition-all ${
                  ride.status === 'ongoing' ? 'border-amber-300 ring-2 ring-amber-400/20 bg-amber-50/10' : 'border-slate-100'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{new Date(ride.departureDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    <span>•</span>
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{ride.departureTime}</span>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold capitalize ${
                    ride.status === 'completed' ? 'bg-blue-50 text-blue-700' :
                    ride.status === 'ongoing' ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse' : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {ride.status === 'ongoing' ? 'Ongoing Trip 🚗' : ride.status}
                  </span>
                </div>

                {/* Route Path */}
                <div className="bg-slate-50 p-2.5 rounded-2xl flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <span className="truncate">{ride.source}</span>
                      <span className="text-slate-400">→</span>
                      <span className="truncate">{ride.destination}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-2">
                    <span className="text-xs font-black text-slate-900 block">₹{ride.price}</span>
                    <span className="text-[9px] font-bold text-slate-400 block">{ride.availableSeats} seats left</span>
                  </div>
                </div>

                {/* Driver Action Controls */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <button
                    onClick={() => navigate(`/ride/${ride._id}`)}
                    className="text-xs font-extrabold text-emerald-600 flex items-center gap-1"
                  >
                    <span>View Trip Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-2">
                    {ride.status === 'scheduled' && (
                      <button
                        onClick={() => handleUpdateStatus(ride._id, 'ongoing')}
                        className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-transform"
                      >
                        Start Trip
                      </button>
                    )}
                    {ride.status === 'ongoing' && (
                      <button
                        onClick={() => handleUpdateStatus(ride._id, 'completed')}
                        className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-transform"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        loadingRequests ? (
          <div className="space-y-2.5">
            {[1, 2].map(i => <div key={i} className="h-24 bg-slate-100 rounded-3xl animate-pulse" />)}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">No passenger booking requests yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map((req) => (
              <div key={req._id} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={req.passenger?.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(req.passenger?.name || 'pass')}`}
                      className="w-8 h-8 rounded-full object-cover border border-slate-100"
                      alt=""
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-black text-slate-900 block truncate">{req.passenger?.name}</span>
                      <span className="text-[9px] font-bold text-slate-400 truncate block">{req.passenger?.email}</span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold capitalize ${
                    req.status === 'accepted' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {req.status}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-2xl flex items-center justify-between text-xs font-bold text-slate-800">
                  <div className="truncate">
                    <span className="text-[9px] font-extrabold text-slate-400 block uppercase">Pickup</span>
                    <span className="truncate block">{req.pickup}</span>
                  </div>
                  <div className="truncate text-right pl-2">
                    <span className="text-[9px] font-extrabold text-slate-400 block uppercase">Dropoff</span>
                    <span className="truncate block">{req.drop}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => handleLaunchChat(req.passenger?._id)}
                    className="text-xs font-extrabold text-indigo-600 flex items-center gap-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Open Chat</span>
                  </button>

                  {req.status === 'pending' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleRespondToRequest(req._id, 'rejected')}
                        className="px-2.5 py-1 bg-rose-50 text-rose-600 rounded-xl text-xs font-extrabold"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleRespondToRequest(req._id, 'accepted')}
                        className="px-3 py-1 bg-emerald-600 text-white rounded-xl text-xs font-extrabold shadow-sm"
                      >
                        Approve
                      </button>
                    </div>
                  )}

                  {req.status === 'accepted' && (
                    <button
                      onClick={() => {
                        setReviewTarget({
                          rideId: req.ride?._id || req.ride,
                          passengerId: req.passenger._id,
                          name: req.passenger.name,
                        });
                        setReviewDialogOpen(true);
                      }}
                      className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-extrabold flex items-center gap-1"
                    >
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{reviewedPassengers[req.passenger?._id] ? 'Reviewed' : 'Rate Passenger'}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {reviewTarget && (
        <ReviewDialog
          isOpen={reviewDialogOpen}
          onClose={() => setReviewDialogOpen(false)}
          onSubmit={handlePassengerReview}
          targetName={reviewTarget.name}
          reviewType="passenger"
          loading={reviewLoading}
        />
      )}
    </div>
  );
};

export default DriverDashboard;
