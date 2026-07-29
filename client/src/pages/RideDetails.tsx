import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Car,
  MapPin,
  Calendar,
  Clock,
  CircleDollarSign,
  Users,
  Star,
  CheckCircle,
  MessageSquare,
  AlertTriangle,
  User,
  Navigation,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import rideService, { type RideData } from '../services/rideService';
import bookingService, { type BookingData } from '../services/bookingService';
import chatService from '../services/chatService';
import MapContainerComponent from '../components/MapContainer';

export const RideDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [ride, setRide] = useState<RideData | null>(null);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  // Seat booking selection
  const [requestedSeats, setRequestedSeats] = useState<number>(1);
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [message, setMessage] = useState('');

  // Review states
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  const fetchRideAndBookings = async () => {
    if (!id) return;
    try {
      const rideRes = await rideService.getRideDetails(id);
      if (rideRes.status === 'success') {
        setRide(rideRes.data.ride);
      }

      // If logged in user is the driver, fetch passenger bookings for this ride
      const isDriver = rideRes.data.ride.driver._id === user?._id;
      if (isDriver || user?.role === 'admin') {
        const bookRes = await bookingService.getRideBookings(id);
        if (bookRes.status === 'success') {
          setBookings(bookRes.data.bookings);
        }
      } else {
        // Passenger - check if they already booked this ride
        const bookRes = await bookingService.getMyBookings();
        if (bookRes.status === 'success') {
          const userBooking = bookRes.data.bookings.find((b: any) => b.ride._id === id);
          if (userBooking) {
            // Find if passenger reviewed
            try {
              const revRes = await bookingService.getDriverReviews(rideRes.data.ride.driver._id);
              if (revRes.status === 'success') {
                const reviewed = revRes.data.reviews.some((r: any) => r.ride === id && r.passenger._id === user?._id);
                setHasReviewed(reviewed);
              }
            } catch (err) {
              console.error('Failed to load review checks:', err);
            }
          }
        }
      }
    } catch (err) {
      toast.error('Failed to load ride details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRideAndBookings();
  }, [id, user]);

  useEffect(() => {
    if (ride) {
      setPickup(ride.source || '');
      setDrop(ride.destination || '');
    }
  }, [ride]);

  const isDriver = ride?.driver._id === user?._id;

  // Passenger booking status (if any)
  const [myBooking, setMyBooking] = useState<BookingData | null>(null);

  useEffect(() => {
    const checkMyBookingStatus = async () => {
      if (isDriver || !ride) return;
      try {
        const bookRes = await bookingService.getMyBookings();
        if (bookRes.status === 'success') {
          const matched = bookRes.data.bookings.find((b: any) => b.ride._id === ride._id);
          setMyBooking(matched || null);
        }
      } catch (err) {
        console.error('Failed checking booking details:', err);
      }
    };
    checkMyBookingStatus();
  }, [ride, isDriver]);

  // Submit seat booking request
  const handleRequestBooking = async () => {
    if (!ride) return;
    if (!pickup.trim() || !drop.trim()) {
      toast.error('Pickup and drop locations are required.');
      return;
    }
    setBookingLoading(true);
    try {
      const res = await bookingService.createBooking(ride._id, requestedSeats, pickup, drop, message);
      if (res.status === 'success') {
        toast.success('🎉 Booking request sent to driver.');
        setMyBooking(res.data.booking);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit seat request.');
    } finally {
      setBookingLoading(false);
    }
  };

  // Cancel booking request
  const handleCancelBooking = async () => {
    if (!myBooking) return;
    if (!window.confirm('Are you sure you want to cancel your seat booking?')) return;
    setBookingLoading(true);
    try {
      const res = await bookingService.cancelBooking(myBooking._id);
      if (res.status === 'success') {
        toast.success('Booking cancelled.');
        setMyBooking(null);
        fetchRideAndBookings();
      }
    } catch (err) {
      toast.error('Failed to cancel booking.');
    } finally {
      setBookingLoading(false);
    }
  };

  // Driver respond to passenger booking
  const handleRespondBooking = async (bookingId: string, status: 'accepted' | 'rejected') => {
    try {
      const res = await bookingService.respondToBooking(bookingId, status);
      if (res.status === 'success') {
        toast.success(`Booking successfully ${status}.`);
        setBookings((prev) =>
          prev.map((b) => (b._id === bookingId ? { ...b, status } : b))
        );
        fetchRideAndBookings();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to respond to booking.');
    }
  };

  // Driver update ride status (ongoing, completed, cancelled)
  const handleUpdateStatus = async (status: 'ongoing' | 'completed' | 'cancelled') => {
    if (!ride) return;
    if (status === 'cancelled' && !window.confirm('Are you sure you want to cancel this trip?')) return;
    
    setStatusLoading(true);
    try {
      const res = await rideService.updateRideStatus(ride._id, status);
      if (res.status === 'success') {
        setRide(res.data.ride);
        toast.success(`Ride status updated to: ${status.toUpperCase()}`);
        fetchRideAndBookings();
      }
    } catch (err) {
      toast.error('Failed to update trip status.');
    } finally {
      setStatusLoading(false);
    }
  };

  // Launch chat with the driver / passenger
  const handleLaunchChat = async (recipientId: string) => {
    try {
      const res = await chatService.getOrCreateChat(recipientId);
      if (res.status === 'success') {
        navigate(`/chat?active=${res.data.chat._id}`);
      }
    } catch (err) {
      toast.error('Failed to launch chat session.');
    }
  };

  // Submit Driver rating review
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ride) return;
    setReviewLoading(true);
    try {
      const res = await bookingService.createReview(ride._id, rating, comment);
      if (res.status === 'success') {
        toast.success('Thank you! Review submitted successfully.');
        setHasReviewed(true);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <p className="text-zinc-300">Ride not found or has been deleted.</p>
      </div>
    );
  }

  const departureDateObj = new Date(ride.departureDate);

  return (
    <div className="flex flex-col gap-6">
      {/* Route Header summary */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/40 p-6 rounded-2xl border border-zinc-850">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold text-zinc-150">
              {ride.source} → {ride.destination}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1.5 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-violet-400" />
            {departureDateObj.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
            <span>at</span>
            <Clock className="w-4 h-4 text-violet-400" />
            {ride.departureTime}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ride.status === 'scheduled' && <Badge variant="primary">Scheduled</Badge>}
          {ride.status === 'ongoing' && <Badge variant="warning">On the Road</Badge>}
          {ride.status === 'completed' && <Badge variant="success">Completed</Badge>}
          {ride.status === 'cancelled' && <Badge variant="destructive">Cancelled</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Map Preview & Info (span 2) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="overflow-hidden">
            <CardHeader className="bg-zinc-950 p-4 border-b border-zinc-850">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Navigation className="w-4 h-4 text-violet-400" />
                Trip Route Map
              </CardTitle>
            </CardHeader>
            <MapContainerComponent
              pickupCoords={ride.pickupLocation.coordinates}
              dropCoords={ride.dropLocation.coordinates}
              pickupAddress={ride.pickupLocation.address}
              dropAddress={ride.dropLocation.address}
            />
          </Card>

          {/* Booking Management for Driver */}
          {isDriver && (
            <Card>
              <CardHeader className="border-b border-zinc-850 pb-4">
                <CardTitle className="text-base">Seat Booking Requests ({bookings.length})</CardTitle>
                <CardDescription>Review student requests for this ride</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {bookings.length === 0 ? (
                  <div className="text-center py-6 text-zinc-500 text-xs">
                    No booking requests submitted yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <div
                        key={booking._id}
                        className="p-4 bg-zinc-950 border border-zinc-850 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={booking.passenger.profileImage || 'https://api.dicebear.com/7.x/initials/svg?seed=pass'}
                            className="w-10 h-10 rounded-full object-cover"
                            alt=""
                          />
                          <div>
                            <p className="text-xs font-bold text-zinc-200">
                              {booking.passenger.name} ({booking.passenger.branch}, Year {booking.passenger.year})
                            </p>
                            <p className="text-[10px] text-zinc-400 mt-1 flex items-center gap-2">
                              <span>Seats: <strong className="text-violet-400">{booking.seatNumber}</strong></span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5 text-amber-400">
                                <Star className="w-3 h-3 fill-amber-400" />
                                {booking.passenger.rating}
                              </span>
                              <span>•</span>
                              <span>Trust: {booking.passenger.trustScore}%</span>
                            </p>
                          </div>
                        </div>

                        {/* Respond Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {booking.status === 'pending' ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs py-1.5 h-auto text-red-400"
                                onClick={() => handleRespondBooking(booking._id, 'rejected')}
                              >
                                Decline
                              </Button>
                              <Button
                                size="sm"
                                className="text-xs py-1.5 h-auto"
                                onClick={() => handleRespondBooking(booking._id, 'accepted')}
                              >
                                Approve
                              </Button>
                            </>
                          ) : (
                            <div className="text-right">
                              {booking.status === 'accepted' ? (
                                <div className="flex items-center gap-2">
                                  <Badge variant="success">Approved</Badge>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="text-xs py-1.5 h-auto px-2"
                                    onClick={() => handleLaunchChat(booking.passenger._id)}
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                <Badge variant="secondary" className="capitalize">
                                  {booking.status}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Rating/Review Submission (Completed passenger) */}
          {!isDriver && myBooking?.status === 'accepted' && ride.status === 'completed' && !hasReviewed && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rate Driver {ride.driver.name}</CardTitle>
                <CardDescription>Provide rating feedback about your transit experience</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleReviewSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-zinc-300">Driver Rating</label>
                    <select
                      value={rating}
                      onChange={(e) => setRating(parseInt(e.target.value))}
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-amber-400 focus:outline-none focus:ring-2 focus:ring-violet-600 transition-all font-bold text-sm light:bg-white light:border-zinc-300"
                    >
                      <option value={5}>⭐⭐⭐⭐⭐ (5/5 Excellent)</option>
                      <option value={4}>⭐⭐⭐⭐ (4/5 Good)</option>
                      <option value={3}>⭐⭐⭐ (3/5 Average)</option>
                      <option value={2}>⭐⭐ (2/5 Poor)</option>
                      <option value={1}>⭐ (1/5 Terrible)</option>
                    </select>
                  </div>
                  <Input
                    label="Comments"
                    placeholder="Describe driver safe driving, cost split clarity, etc..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <div className="flex justify-end mt-2">
                    <Button type="submit" loading={reviewLoading}>
                      Submit Driver Review
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Completed Passenger Review state confirmation */}
          {!isDriver && myBooking?.status === 'accepted' && ride.status === 'completed' && hasReviewed && (
            <div className="p-4 bg-emerald-950/20 border border-emerald-800/30 rounded-2xl flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-xs text-zinc-400 font-medium">
                You have already submitted your review feedback for this trip. Thank you!
              </p>
            </div>
          )}
        </div>

        {/* Right Panel: Driver Bio & Booking Trigger (span 1) */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Driver Card Info */}
          <Card>
            <CardHeader className="border-b border-zinc-850 pb-4">
              <CardTitle className="text-base">Driver Profile</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <img
                src={ride.driver.profileImage || 'https://api.dicebear.com/7.x/initials/svg?seed=driver'}
                className="w-20 h-20 rounded-full object-cover border-2 border-zinc-800"
                alt=""
              />
              <h3 className="font-bold text-base mt-3 flex items-center gap-1.5">
                {ride.driver.name}
                {ride.driver.verifiedDriver && <Badge variant="success" className="py-0 px-1.5 text-[8px]">Verified</Badge>}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">{ride.driver.email}</p>
              
              {/* Extra details (only visible to accepted passengers or driver themselves) */}
              {((myBooking?.status === 'accepted') || isDriver) && ride.driver.phone && (
                <p className="text-xs font-bold text-violet-400 mt-2">Call: {ride.driver.phone}</p>
              )}

              {/* Rating stars */}
              <div className="flex items-center justify-center gap-3 mt-4 w-full">
                <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-850 flex-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">Rating</span>
                  <span className="text-sm font-black text-amber-400 flex items-center justify-center gap-0.5 mt-0.5">
                    <Star className="w-4 h-4 fill-amber-400" />
                    {ride.driver.rating}
                  </span>
                </div>
                <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-850 flex-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">Trust Score</span>
                  <span className="text-sm font-black text-violet-400 block mt-0.5">{ride.driver.trustScore}%</span>
                </div>
              </div>

              {/* Vehicle Bio */}
              <div className="w-full bg-zinc-950/60 p-4 rounded-xl border border-zinc-850 text-left space-y-2 mt-4 text-xs">
                <p className="font-bold text-zinc-400 border-b border-zinc-850 pb-1.5 uppercase tracking-wide">Vehicle Details</p>
                <p className="text-zinc-300">
                  Model: <strong className="text-zinc-150 capitalize">{ride.vehicle.brand} {ride.vehicle.model}</strong>
                </p>
                <p className="text-zinc-300">
                  Type: <span className="capitalize">{ride.vehicle.type}</span> | Color: {ride.vehicle.color}
                </p>
                {((myBooking?.status === 'accepted') || isDriver) && (
                  <p className="text-zinc-300">
                    Plate: <strong className="text-zinc-150 uppercase">{ride.vehicle.numberPlate}</strong>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Booking Action Card (For Passengers) / Trip Control Card (For Drivers) */}
          <Card className="border-violet-500/20">
            <CardHeader className="bg-violet-950/15 border-b border-zinc-850 p-4">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span>Trip Action Portal</span>
                <span className="text-base text-violet-400 font-black">₹{ride.price}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {/* 1) DRIVER CONTROLS */}
              {isDriver && (
                <div className="flex flex-col gap-3">
                  {ride.status === 'scheduled' && (
                    <Button
                      onClick={() => handleUpdateStatus('ongoing')}
                      loading={statusLoading}
                      className="w-full py-3"
                    >
                      Start Trip (Ongoing)
                    </Button>
                  )}
                  {ride.status === 'ongoing' && (
                    <Button
                      onClick={() => handleUpdateStatus('completed')}
                      loading={statusLoading}
                      className="w-full py-3"
                    >
                      Mark as Completed
                    </Button>
                  )}
                  {ride.status !== 'completed' && ride.status !== 'cancelled' && (
                    <Button
                      variant="destructive"
                      onClick={() => handleUpdateStatus('cancelled')}
                      loading={statusLoading}
                      className="w-full py-3 text-xs bg-red-950/30 border border-red-800/30 hover:bg-red-950/50"
                    >
                      Cancel This Trip
                    </Button>
                  )}
                  {ride.status === 'completed' && (
                    <div className="text-center py-2 text-xs text-emerald-400 font-bold uppercase flex items-center justify-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Trip Completed
                    </div>
                  )}
                </div>
              )}

              {/* 2) PASSENGER CONTROLS */}
              {!isDriver && (
                <div className="flex flex-col gap-4">
                  {/* If not booked yet */}
                  {!myBooking && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                        <span>Requested Seats</span>
                        <span>{ride.availableSeats} available</span>
                      </div>
                      
                      {ride.availableSeats > 0 ? (
                        <>
                          <input
                            type="number"
                            min={1}
                            max={Math.min(4, ride.availableSeats)}
                            value={requestedSeats}
                            onChange={(e) => setRequestedSeats(parseInt(e.target.value) || 1)}
                            className="w-full px-4 py-3 bg-zinc-950 border border-zinc-850 rounded-xl text-zinc-150 focus:outline-none focus:ring-2 focus:ring-violet-600 transition-all text-sm mb-2 light:bg-white light:border-zinc-300"
                          />

                          <div className="flex flex-col gap-1">
                            <label className="text-[11px] font-bold text-zinc-455 uppercase tracking-wider">Pickup Location</label>
                            <input
                              type="text"
                              placeholder="e.g. MH-2 Hostel Gate"
                              value={pickup}
                              onChange={(e) => setPickup(e.target.value)}
                              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-850 rounded-xl text-zinc-150 focus:outline-none focus:ring-2 focus:ring-violet-600 transition-all text-sm mb-2 light:bg-white light:border-zinc-300"
                              required
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[11px] font-bold text-zinc-455 uppercase tracking-wider">Dropoff Location</label>
                            <input
                              type="text"
                              placeholder="e.g. Block 1 Academic Block"
                              value={drop}
                              onChange={(e) => setDrop(e.target.value)}
                              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-850 rounded-xl text-zinc-150 focus:outline-none focus:ring-2 focus:ring-violet-600 transition-all text-sm mb-2 light:bg-white light:border-zinc-300"
                              required
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[11px] font-bold text-zinc-455 uppercase tracking-wider">Message to Driver (Optional)</label>
                            <textarea
                              placeholder="e.g. Carrying a backpack, will wait at the gate..."
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              rows={2}
                              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-850 rounded-xl text-zinc-150 focus:outline-none focus:ring-2 focus:ring-violet-600 transition-all text-sm mb-2 resize-none light:bg-white light:border-zinc-300"
                            />
                          </div>

                          <Button
                            onClick={handleRequestBooking}
                            loading={bookingLoading}
                            className="w-full py-3 mt-2"
                            disabled={ride.status !== 'scheduled'}
                          >
                            Submit Booking Request
                          </Button>
                        </>
                      ) : (
                        <div className="text-center text-xs text-red-400 font-bold p-3 bg-red-950/20 border border-red-900/30 rounded-xl">
                          Seats are fully booked
                        </div>
                      )}
                    </div>
                  )}

                  {/* If booked and pending */}
                  {myBooking && myBooking.status === 'pending' && (
                    <div className="flex flex-col gap-3 text-center">
                      <div className="p-3 bg-amber-950/20 border border-amber-900/30 text-amber-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5">
                        <Clock className="w-4 h-4 animate-spin" />
                        Awaiting Driver Approval
                      </div>
                      <Button
                        variant="destructive"
                        onClick={handleCancelBooking}
                        loading={bookingLoading}
                        className="w-full text-xs py-2 bg-red-950/30 border border-red-800/30 hover:bg-red-900/40 text-red-400 mt-2"
                      >
                        Cancel Seat Request
                      </Button>
                    </div>
                  )}

                  {/* If booked and accepted */}
                  {myBooking && myBooking.status === 'accepted' && (
                    <div className="flex flex-col gap-3">
                      <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5">
                        <CheckCircle className="w-4 h-4" />
                        Seat Confirmed 🎉
                      </div>

                      {/* Chat trigger */}
                      <Button
                        variant="secondary"
                        onClick={() => handleLaunchChat(ride.driver._id)}
                        className="w-full py-3 flex items-center justify-center gap-2 mt-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Chat with Driver
                      </Button>

                      {ride.status !== 'completed' && ride.status !== 'cancelled' && (
                        <Button
                          variant="destructive"
                          onClick={handleCancelBooking}
                          loading={bookingLoading}
                          className="w-full text-xs py-2 bg-red-950/30 border border-red-800/30 hover:bg-red-900/40 mt-1"
                        >
                          Cancel Confirmed Seat
                        </Button>
                      )}
                    </div>
                  )}

                  {/* If booking rejected */}
                  {myBooking && myBooking.status === 'rejected' && (
                    <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded-xl text-xs font-semibold text-center">
                      Your booking request was declined.
                    </div>
                  )}

                  {/* If booking cancelled */}
                  {myBooking && myBooking.status === 'cancelled' && (
                    <div className="p-3 bg-zinc-950 border border-zinc-850 text-zinc-500 rounded-xl text-xs font-semibold text-center">
                      Booking Cancelled.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RideDetails;
