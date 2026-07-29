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
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import api from '../../services/api';
import rideService, { type RideData } from '../../services/rideService';
import bookingService from '../../services/bookingService';
import chatService from '../../services/chatService';

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

  // Sync user details to ensure fresh data
  const refreshUserState = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.status === 'success' && login) {
        // Just reload the page or update state if login helper is available
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to sync user state:', err);
    }
  };

  // Fetch driver rides & incoming requests if fully active
  useEffect(() => {
    if (user?.role === 'driver' && user?.verifiedDriver && hasPaid) {
      const fetchDriverRides = async () => {
        try {
          const response = await api.get('/rides');
          if (response.data.status === 'success') {
            const allRides: RideData[] = response.data.data.rides;
            const filtered = allRides.filter((ride) => ride.driver._id === user._id);
            setMyRides(filtered);

            // Calculate earnings based on completed rides
            const completed = filtered.filter((r) => r.status === 'completed');
            setEarnings(completed.length * 150); // assume avg ₹150 profit per ride
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

      fetchDriverRides();
      fetchRequests();
    }
  }, [user, hasPaid]);

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

  const handleRespondToRequest = async (bookingId: string, status: 'accepted' | 'rejected') => {
    try {
      const res = await bookingService.respondToBooking(bookingId, status);
      if (res.status === 'success') {
        toast.success(`Request ${status === 'accepted' ? 'accepted' : 'declined'} successfully!`);
        setRequests(prev => prev.map(req => req._id === bookingId ? { ...req, status } : req));
        
        // Refresh rides to update seats
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

  // Razorpay Checkout handler
  const handlePayment = async () => {
    setPaymentLoading(true);
    try {
      // 1. Create order on backend
      const res = await api.post('/payments/order');
      if (res.data.status !== 'success') {
        throw new Error('Failed to initiate order.');
      }

      const orderData = res.data.data;

      // 2. Load script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error('Razorpay SDK failed to load. Are you offline?');
        setPaymentLoading(false);
        return;
      }

      // 3. Open Checkout options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_mockkeyid1234',
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'VIT RideShare',
        description: 'Driver Subscription Activation Fee',
        order_id: orderData.id,
        handler: async function (response: any) {
          toast.info('Verifying transaction...');
          try {
            const verifyRes = await api.post('/payments/verify', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.data.status === 'success') {
              toast.success('🎉 Subscription Activated! Welcome aboard.');
              await refreshUserState();
            }
          } catch (err: any) {
            toast.error(err.response?.data?.message || 'Payment verification failed.');
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: driver?.phone || '',
        },
        theme: {
          color: '#8B5CF6', // Purple-600
        },
        modal: {
          ondismiss: function () {
            toast.info('Transaction cancelled by user.');
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error(err);
      toast.error('Could not initialize Razorpay checkout. Please check your internet connection.');
    } finally {
      setPaymentLoading(false);
    }
  };

  // State 1: No registration details
  if (!driver) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-4 max-w-md mx-auto p-4 font-sans animate-fade-in">
        <AlertTriangle className="w-12 h-12 text-amber-500 animate-bounce" />
        <h2 className="text-lg font-bold text-zinc-200">No Driver Application Found</h2>
        <p className="text-xs text-zinc-400">
          You must submit a driver registration application including vehicle specifics and licence scans before you can host rides.
        </p>
        <Link to="/driver/register" className="mt-2">
          <Button className="bg-violet-650 hover:bg-violet-750">
            Submit Application
          </Button>
        </Link>
      </div>
    );
  }

  // State 2: Pending Approval
  if (status === 'Pending' || status === 'pending') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 font-sans animate-fade-in">
        <Card className="max-w-md w-full bg-zinc-900 border-zinc-800">
          <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-5">
            <div className="w-16 h-16 rounded-full bg-amber-950/40 border border-amber-800/30 flex items-center justify-center text-amber-400 animate-pulse">
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-black text-zinc-200">Application Under Review ⏳</h2>
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mt-1">
                Driver Registration Pending
              </p>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed px-2">
              Your driver credentials and vehicle files are currently undergoing verification review by the platform administrator. You will receive an email update once your account is status updated.
            </p>
            <div className="w-full p-4 bg-zinc-950 border border-zinc-850 rounded-2xl flex flex-col gap-2 text-left">
              <span className="text-[10px] text-zinc-500 font-extrabold uppercase block">Submitted Scans Check</span>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-semibold">Licence Scan</span>
                <span className="text-emerald-500 font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Uploaded</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-semibold">Vehicle RC Scan</span>
                <span className="text-emerald-500 font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Uploaded</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-semibold">Registration Status</span>
                <span className="text-amber-400 font-black flex items-center gap-1">Pending Approval</span>
              </div>
            </div>
            <Link to="/dashboard" className="text-xs font-bold text-violet-400 hover:text-violet-300 uppercase mt-2">
              Return to Student Commute Screen
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // State 3: Resubmission Remarks
  if (status === 'resubmission') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 font-sans animate-fade-in">
        <Card className="max-w-md w-full bg-zinc-900 border-zinc-800">
          <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-5">
            <div className="w-16 h-16 rounded-full bg-amber-950/30 border border-amber-700/50 flex items-center justify-center text-amber-500">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-black text-zinc-200">Action Required ⚠️</h2>
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mt-1">
                Document Resubmission Requested
              </p>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              The administrator reviewed your application but requested clearer document files. Please check the remarks below:
            </p>
            {driver?.rejectionReason && (
              <div className="w-full p-4 bg-amber-950/15 border border-amber-900/30 text-xs text-amber-250 font-bold text-left rounded-xl">
                Remarks: {driver.rejectionReason}
              </div>
            )}
            <Link to="/driver/register" className="w-full mt-2">
              <Button className="w-full bg-violet-650 hover:bg-violet-750 flex items-center justify-center gap-1.5 py-3 text-xs">
                Update Uploaded Scans
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // State 4: Rejected
  if (status === 'Rejected' || status === 'rejected') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 font-sans animate-fade-in">
        <Card className="max-w-md w-full bg-zinc-900 border-zinc-800">
          <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-5">
            <div className="w-16 h-16 rounded-full bg-red-950/20 border border-red-800/40 flex items-center justify-center text-red-500">
              <XCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-black text-zinc-200">Application Rejected ❌</h2>
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mt-1">
                Registration Disallowed
              </p>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Unfortunately, your driver application did not satisfy the registration compliance standards.
            </p>
            {driver?.rejectionReason && (
              <div className="w-full p-4 bg-red-950/10 border border-red-950/20 text-xs text-red-300 font-bold text-left rounded-xl">
                Reason: {driver.rejectionReason}
              </div>
            )}
            <Link to="/driver/register" className="w-full mt-2">
              <Button className="w-full bg-zinc-800 hover:bg-zinc-750 text-zinc-300 py-3 text-xs">
                Apply with a New vehicle
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // State 5: Approved but Unpaid (Razorpay Gateway Screen)
  if ((status === 'Approved' || status === 'approved') && !hasPaid) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 font-sans animate-fade-in">
        <Card className="max-w-md w-full bg-zinc-900 border-zinc-800">
          <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-5">
            <div className="w-16 h-16 rounded-full bg-emerald-950/20 border border-emerald-800/30 flex items-center justify-center text-emerald-400">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-black text-zinc-200">Application Approved! 🎉</h2>
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mt-1">
                Verification Successful
              </p>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Your driver credentials have passed verification review! To activate your listing options and complete onboarding, please make the subscription payment.
            </p>

            <div className="w-full p-5 bg-zinc-950 border border-zinc-850 rounded-2xl text-left flex flex-col gap-3">
              <span className="text-[10px] text-zinc-500 font-extrabold uppercase block border-b border-zinc-850 pb-2">Subscription Summary</span>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-semibold">Account Type</span>
                <span className="text-zinc-200 font-extrabold">Verified driver</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-semibold">Subscription Fee</span>
                <span className="text-zinc-200 font-extrabold">₹50.00</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-semibold">Status</span>
                <span className="text-red-400 font-extrabold">Payment Pending</span>
              </div>
            </div>

            <Button
              onClick={handlePayment}
              loading={paymentLoading}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 mt-2 text-xs"
            >
              <CreditCard className="w-4.5 h-4.5" />
              Pay ₹50 via Razorpay
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // State 6: Full Driver Dashboard (Approved + Paid)
  return (
    <div className="flex flex-col gap-8 text-zinc-150 font-sans animate-fade-in">
      {/* Banner */}
      <div className="p-5 bg-emerald-950/10 border border-emerald-900/30 rounded-2xl flex items-start gap-4">
        <CheckCircle className="w-8 h-8 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-extrabold text-sm text-emerald-200">Verified Driver Account Active 🎖️</h4>
          <p className="text-xs text-zinc-400 mt-1 leading-4">
            Your subscription and documents are active. You can list ride offers, define seat layouts, accept student bookings, and navigate campus commute paths.
          </p>
        </div>
      </div>

      {/* Stats summary row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase">Commute Rating</p>
              <p className="text-2xl font-black mt-1 flex items-center gap-1">
                {user?.rating || 5.0} <Star className="w-5 h-5 text-amber-400 fill-amber-400 shrink-0" />
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
              <p className="text-xs font-bold text-zinc-400 uppercase">Active Rides</p>
              <p className="text-2xl font-black mt-1">
                {myRides.filter((r) => r.status === 'scheduled' || r.status === 'ongoing').length}
              </p>
            </div>
            <div className="p-3 bg-zinc-950 rounded-xl text-zinc-400">
              <Car className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase">Completed Rides</p>
              <p className="text-2xl font-black mt-1">
                {myRides.filter((r) => r.status === 'completed').length}
              </p>
            </div>
            <div className="p-3 bg-zinc-950 rounded-xl text-zinc-400">
              <CheckCircle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase">Estimated Earnings</p>
              <p className="text-2xl font-black mt-1 text-emerald-400">
                ₹{earnings}
              </p>
            </div>
            <div className="p-3 bg-zinc-950 rounded-xl text-emerald-500/20">
              <CircleDollarSign className="w-6 h-6 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Active Offers List (span 2) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="h-full">
            <CardHeader className="border-b border-zinc-850 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab('rides')}
                  className={`pb-1 text-sm font-extrabold border-b-2 transition-all cursor-pointer ${
                    activeTab === 'rides'
                      ? 'border-violet-500 text-zinc-150'
                      : 'border-transparent text-zinc-500 hover:text-zinc-350'
                  }`}
                >
                  My Commute Rides
                </button>
                <button
                  onClick={() => setActiveTab('requests')}
                  className={`pb-1 text-sm font-extrabold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === 'requests'
                      ? 'border-violet-500 text-zinc-150'
                      : 'border-transparent text-zinc-500 hover:text-zinc-350'
                  }`}
                >
                  Ride Requests
                  {pendingRequestsCount > 0 && (
                    <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-violet-600 text-white animate-pulse">
                      {pendingRequestsCount}
                    </span>
                  )}
                </button>
              </div>
              <Link to="/offer-ride">
                <Button className="text-xs py-2 h-auto flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4" />
                  List a Ride
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-6">
              {activeTab === 'rides' ? (
                loadingRides ? (
                  <div className="flex flex-col gap-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-16 bg-zinc-950 rounded-xl animate-pulse"></div>
                    ))}
                  </div>
                ) : myRides.length === 0 ? (
                  <div className="text-center py-12">
                    <Car className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
                    <p className="text-sm font-bold text-zinc-400">No commute rides offered yet.</p>
                    <p className="text-xs text-zinc-550 mt-1">Tap the button above to publish your first ride offer.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {myRides.map((ride) => (
                      <div
                        key={ride._id}
                        className="p-4 bg-zinc-950 border border-zinc-850 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-zinc-400">
                              {new Date(ride.departureDate).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                              })}{' '}
                              at {ride.departureTime}
                            </span>
                            <Badge
                              variant={
                                ride.status === 'completed'
                                  ? 'success'
                                  : ride.status === 'ongoing'
                                    ? 'primary'
                                    : ride.status === 'cancelled'
                                      ? 'destructive'
                                      : 'warning'
                              }
                            >
                              {ride.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-sm font-extrabold text-zinc-200">
                            <span>{ride.source}</span>
                            <span className="text-zinc-500 font-normal">→</span>
                            <span>{ride.destination}</span>
                          </div>
                          <p className="text-xs text-zinc-555 mt-2">
                            {ride.availableSeats} seats remaining • Vehicle: {ride.vehicle?.brand} {ride.vehicle?.model}
                          </p>
                        </div>

                        {/* Controls */}
                        {ride.status === 'scheduled' && (
                          <div className="flex gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              className="text-xs cursor-pointer"
                              onClick={() => handleUpdateStatus(ride._id, 'ongoing')}
                            >
                              Start Ride
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="text-xs cursor-pointer"
                              onClick={() => handleUpdateStatus(ride._id, 'cancelled')}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                        {ride.status === 'ongoing' && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="text-xs cursor-pointer"
                            onClick={() => handleUpdateStatus(ride._id, 'completed')}
                          >
                            Mark Complete
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )
              ) : (
                loadingRequests ? (
                  <div className="flex flex-col gap-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-16 bg-zinc-950 rounded-xl animate-pulse"></div>
                    ))}
                  </div>
                ) : requests.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
                    <p className="text-sm font-bold text-zinc-400">No ride requests received yet.</p>
                    <p className="text-xs text-zinc-550 mt-1">Students requesting your commute offers will be listed here.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {requests.map((req) => (
                      <div
                        key={req._id}
                        className="p-4 bg-zinc-950 border border-zinc-850 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-zinc-800 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-xs font-bold text-zinc-400">
                              {new Date(req.createdAt).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}{' '}
                              at {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <Badge
                              variant={
                                req.status === 'accepted'
                                  ? 'success'
                                  : req.status === 'rejected'
                                    ? 'destructive'
                                    : req.status === 'cancelled'
                                      ? 'secondary'
                                      : 'warning'
                              }
                            >
                              {req.status === 'pending' ? 'Pending Approval' : req.status}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-3 mt-3">
                            <img
                              src={req.passenger?.profileImage || 'https://api.dicebear.com/7.x/initials/svg?seed=' + req.passenger?.name}
                              className="w-9 h-9 rounded-full object-cover border border-zinc-800 shrink-0"
                              alt=""
                            />
                            <div className="min-w-0">
                              <h4 className="text-sm font-black text-zinc-200 truncate">{req.passenger?.name}</h4>
                              <p className="text-[10px] text-zinc-450 font-bold truncate">{req.passenger?.email}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 mt-3 text-xs">
                            <p className="text-zinc-450">
                              Pickup: <strong className="text-zinc-200">{req.pickup}</strong>
                            </p>
                            <p className="text-zinc-455">
                              Dropoff: <strong className="text-zinc-200">{req.drop}</strong>
                            </p>
                            <p className="text-zinc-450">
                              Seats Requested: <strong className="text-zinc-200">{req.seatNumber}</strong>
                            </p>
                            <p className="text-zinc-455">
                              Ride Price: <strong className="text-zinc-200">₹{req.ride?.price || 0}</strong>
                            </p>
                          </div>

                          {req.message && (
                            <p className="p-2.5 mt-2.5 bg-zinc-900 border border-zinc-850 rounded-lg text-xs text-zinc-350 italic">
                              Message: "{req.message}"
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0 justify-end shrink-0">
                          {req.status === 'pending' && (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                className="text-xs py-1.5 px-3 h-auto cursor-pointer"
                                onClick={() => handleRespondToRequest(req._id, 'accepted')}
                              >
                                <Check className="w-3.5 h-3.5 mr-1" />
                                Accept
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="text-xs py-1.5 px-3 h-auto cursor-pointer"
                                onClick={() => handleRespondToRequest(req._id, 'rejected')}
                              >
                                <XCircle className="w-3.5 h-3.5 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-xs py-1.5 px-3 h-auto cursor-pointer"
                            onClick={() => handleLaunchChat(req.passenger?._id)}
                          >
                            <MessageSquare className="w-3.5 h-3.5 mr-1" />
                            Chat
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Active Vehicle Card */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card>
            <CardHeader className="border-b border-zinc-850 pb-4">
              <CardTitle className="text-base">Active Vehicle Profile</CardTitle>
              <CardDescription>Verified model and document scans</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 p-3.5 bg-zinc-950 border border-zinc-850 rounded-2xl">
                  <div className="p-2.5 bg-violet-950/20 border border-violet-900/30 text-violet-400 rounded-xl">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-zinc-350 capitalize">
                      {driver?.vehicleModel}
                    </h5>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase mt-0.5">
                      Plate: {driver?.vehicleNumber}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl">
                    <span className="text-[10px] text-zinc-500 font-bold block">Vehicle Type</span>
                    <span className="font-bold text-zinc-350 capitalize mt-0.5 block">{driver?.vehicleType}</span>
                  </div>
                  <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl">
                    <span className="text-[10px] text-zinc-500 font-bold block">Colour</span>
                    <span className="font-bold text-zinc-350 capitalize mt-0.5 block">{driver?.vehicleColour}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-xl text-xs flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-550 font-bold">Driving Experience</span>
                    <span className="font-bold text-zinc-300">{driver?.drivingExperience} Years</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-550 font-bold">Licence Key</span>
                    <span className="font-bold text-zinc-300">{driver?.licenceNumber}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-zinc-850 pt-3 mt-1">
                  <div>
                    <span className="text-[10px] text-zinc-500 font-bold text-center block mb-1">Vehicle Scan</span>
                    <img src={driver?.vehicleImage} className="w-full h-20 object-cover rounded-lg border border-zinc-800" alt="Vehicle" />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 font-bold text-center block mb-1">Licence Scan</span>
                    <img src={driver?.licenceImage} className="w-full h-20 object-cover rounded-lg border border-zinc-800" alt="Licence" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
