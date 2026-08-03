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

  useEffect(() => {
    if (user?.role === 'driver' && user?.verifiedDriver && hasPaid) {
      const fetchDriverRides = async () => {
        try {
          const response = await api.get('/rides');
          if (response.data.status === 'success') {
            const allRides: RideData[] = response.data.data.rides;
            const filtered = allRides.filter((ride) => ride.driver._id === user._id);
            setMyRides(filtered);
            const completed = filtered.filter((r) => r.status === 'completed');
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
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-primary/10 border-4 border-white rounded-[2.5rem] flex items-center justify-center text-primary mb-8 shadow-2xl shadow-primary/20 animate-bounce">
          <CheckCircle className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-black text-foreground">You're Approved!</h2>
        <p className="text-muted-foreground font-medium mt-2 max-w-sm">
          Just one final step to activate your driver portal.
        </p>

        <div className="mt-10 w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-premium text-left">
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
    <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Banner */}
      <section className="bg-primary rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-primary/30">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="primary" className="bg-white/20 text-white border-white/30 backdrop-blur-sm">Verified Driver</Badge>
              <div className="flex items-center gap-1 text-white/80 font-black text-[10px] uppercase tracking-widest">
                <ShieldCheck className="w-3 h-3" />
                Active
              </div>
            </div>
            <h1 className="text-3xl font-black tracking-tight">Driver Control Center</h1>
            <p className="text-white/70 font-medium mt-1">Host rides and manage passenger requests</p>
          </div>
          <Link to="/offer-ride">
            <Button variant="secondary" className="bg-white text-primary hover:bg-white/90 px-8 py-4 rounded-[1.5rem] shadow-xl">
              <PlusCircle className="w-5 h-5 mr-2" />
              List a New Ride
            </Button>
          </Link>
        </div>
      </section>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Rating', val: user?.rating || 5.0, icon: Star, color: 'text-accent', bg: 'bg-accent/10' },
          { label: 'Live Rides', val: myRides.filter(r => r.status === 'scheduled' || r.status === 'ongoing').length, icon: Car, color: 'text-secondary', bg: 'bg-secondary/10' },
          { label: 'Finished', val: myRides.filter(r => r.status === 'completed').length, icon: CheckCircle, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Earnings', val: `₹${earnings}`, icon: CircleDollarSign, color: 'text-primary', bg: 'bg-primary/10' },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-soft hover:shadow-premium transition-all duration-300">
            <CardContent className="p-6 flex flex-col gap-4">
              <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-black text-foreground mt-1">{stat.val}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="border-none">
            <CardHeader className="flex flex-row items-center justify-between pb-0 px-8 pt-8">
              <div className="flex gap-8">
                {[
                  { id: 'rides', label: 'My Rides', icon: Car },
                  { id: 'requests', label: 'Bookings', icon: MessageSquare, count: pendingRequestsCount },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`relative pb-6 text-sm font-black transition-all ${
                      activeTab === tab.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                       <tab.icon className="w-4 h-4" />
                       {tab.label}
                       {tab.count !== undefined && tab.count > 0 && (
                         <span className="bg-primary text-white text-[9px] px-1.5 py-0.5 rounded-full animate-pulse">{tab.count}</span>
                       )}
                    </span>
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full"></div>
                    )}
                  </button>
                ))}
              </div>
            </CardHeader>
            <div className="h-px bg-border mx-8"></div>
            <CardContent className="p-8">
              {activeTab === 'rides' ? (
                loadingRides ? (
                  <div className="space-y-4">
                    {[1, 2].map(i => <div key={i} className="h-20 bg-muted/5 rounded-[1.5rem] animate-pulse"></div>)}
                  </div>
                ) : myRides.length === 0 ? (
                  <div className="text-center py-20">
                     <div className="w-20 h-20 bg-muted/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Calendar className="w-10 h-10 text-muted-foreground/20" />
                     </div>
                     <h4 className="text-lg font-bold text-muted-foreground">No rides scheduled</h4>
                     <Button variant="ghost" className="mt-4 font-black uppercase tracking-widest text-primary" onClick={() => navigate('/offer-ride')}>Schedule Now</Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {myRides.map((ride) => (
                      <div key={ride._id} className="p-6 bg-white border border-border rounded-[2rem] hover:border-primary/20 transition-all duration-300 shadow-soft">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                          <div className="flex-1 space-y-4">
                            <div className="flex items-center gap-3">
                              <Badge variant={ride.status === 'completed' ? 'success' : ride.status === 'ongoing' ? 'primary' : 'warning'}>
                                {ride.status}
                              </Badge>
                              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(ride.departureDate).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {ride.departureTime}
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                               <div className="flex flex-col items-center gap-1">
                                  <div className="w-2.5 h-2.5 rounded-full border-2 border-primary bg-white"></div>
                                  <div className="w-0.5 h-4 bg-border"></div>
                                  <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
                               </div>
                               <div className="flex flex-col gap-1">
                                  <span className="text-xs font-bold">{ride.source}</span>
                                  <span className="text-xs font-bold">{ride.destination}</span>
                               </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-stretch justify-end border-t sm:border-t-0 pt-4 sm:pt-0">
                             {ride.status === 'scheduled' && (
                                <button onClick={() => handleUpdateStatus(ride._id, 'ongoing')} className="px-6 py-3 bg-primary text-white rounded-xl text-xs font-black shadow-lg shadow-primary/20 active:scale-95 transition-all">Start</button>
                             )}
                             {ride.status === 'ongoing' && (
                                <button onClick={() => handleUpdateStatus(ride._id, 'completed')} className="px-6 py-3 bg-secondary text-white rounded-xl text-xs font-black shadow-lg shadow-secondary/20 active:scale-95 transition-all">Complete</button>
                             )}
                             <Button variant="ghost" size="sm" className="px-2" onClick={() => navigate(`/ride/${ride._id}`)}><ChevronRight /></Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                loadingRequests ? (
                  <div className="space-y-4">
                    {[1, 2].map(i => <div key={i} className="h-20 bg-muted/5 rounded-[1.5rem] animate-pulse"></div>)}
                  </div>
                ) : requests.length === 0 ? (
                  <div className="text-center py-20">
                     <div className="w-20 h-20 bg-muted/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Users className="w-10 h-10 text-muted-foreground/20" />
                     </div>
                     <h4 className="text-lg font-bold text-muted-foreground">No bookings yet</h4>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {requests.map((req) => (
                      <div key={req._id} className="p-6 bg-white border border-border rounded-[2rem] shadow-soft">
                        <div className="flex items-center gap-4 mb-6">
                           <img src={req.passenger?.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${req.passenger?.name}`} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" alt="" />
                           <div className="flex-1">
                              <h4 className="font-black text-foreground">{req.passenger?.name}</h4>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{req.passenger?.email}</p>
                           </div>
                           <Badge variant={req.status === 'accepted' ? 'success' : 'warning'}>{req.status}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-6">
                           <div className="space-y-1">
                              <p>Pickup</p>
                              <p className="text-foreground normal-case text-sm font-bold">{req.pickup}</p>
                           </div>
                           <div className="space-y-1">
                              <p>Drop</p>
                              <p className="text-foreground normal-case text-sm font-bold">{req.drop}</p>
                           </div>
                        </div>
                        <div className="flex gap-2">
                           {req.status === 'pending' && (
                             <>
                               <Button variant="primary" size="sm" className="flex-1 rounded-xl" onClick={() => handleRespondToRequest(req._id, 'accepted')}>Accept</Button>
                               <Button variant="outline" size="sm" className="flex-1 rounded-xl" onClick={() => handleRespondToRequest(req._id, 'rejected')}>Reject</Button>
                             </>
                           )}
                           <Button variant="ghost" size="sm" className="w-12 rounded-xl" onClick={() => handleLaunchChat(req.passenger?._id)}><MessageSquare className="w-5 h-5" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-8">
           <Card className="border-none shadow-soft">
              <CardHeader>
                 <CardTitle className="text-xl">Vehicle Details</CardTitle>
                 <CardDescription>Verified Transport</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                 <div className="p-6 bg-muted/5 rounded-[2rem] border border-border text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Plate Number</p>
                    <p className="text-2xl font-black text-foreground mt-1 select-all">{driver?.vehicleNumber}</p>
                 </div>
                 <div className="space-y-4">
                    {[
                      { l: 'Model', v: driver?.vehicleModel },
                      { l: 'Color', v: driver?.vehicleColour },
                      { l: 'Type', v: driver?.vehicleType },
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center px-2">
                         <span className="text-xs font-bold text-muted-foreground">{item.l}</span>
                         <span className="text-sm font-black capitalize">{item.v}</span>
                      </div>
                    ))}
                 </div>
                 <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                    <img src={driver?.vehicleImage} className="w-full h-24 object-cover rounded-2xl border border-border" alt="" />
                    <img src={driver?.licenceImage} className="w-full h-24 object-cover rounded-2xl border border-border" alt="" />
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>

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
