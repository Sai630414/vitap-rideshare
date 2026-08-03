import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
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
  Navigation,
  CloudSun,
  Locate,
  Map,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import ReviewDialog from '../components/ReviewDialog';
import WeatherWidget from '../components/WeatherWidget';
import LiveTrackingMap from '../components/LiveTrackingMap';
import rideService, { type RideData } from '../services/rideService';
import bookingService, { type BookingData } from '../services/bookingService';
import chatService from '../services/chatService';
import MapContainerComponent from '../components/MapContainer';
import api from '../services/api';

export const RideDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [ride, setRide] = useState<RideData | null>(null);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [myBooking, setMyBooking] = useState<BookingData | null>(null);

  // Seat booking
  const [requestedSeats, setRequestedSeats] = useState<number>(1);
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [pickupCoords, setPickupCoords] = useState<[number, number] | null>(null);
  const [message, setMessage] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);

  // Reviews (F1 + F2)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewDialogTarget, setReviewDialogTarget] = useState<{ name: string; type: 'driver' | 'passenger'; passengerId?: string }>({ name: '', type: 'driver' });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [existingDriverReview, setExistingDriverReview] = useState<any>(null);
  const [passengerReviewedMap, setPassengerReviewedMap] = useState<Record<string, any>>({});

  // Weather (F5)
  const [weather, setWeather] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  const fetchRideAndBookings = useCallback(async () => {
    if (!id) return;
    try {
      const rideRes = await rideService.getRideDetails(id);
      if (rideRes.status === 'success') {
        setRide(rideRes.data.ride);
      }

      const isDriver = rideRes.data.ride.driver._id === user?._id;
      if (isDriver || user?.role === 'admin') {
        const bookRes = await bookingService.getRideBookings(id);
        if (bookRes.status === 'success') {
          setBookings(bookRes.data.bookings);
        }
      } else {
        const bookRes = await bookingService.getMyBookings();
        if (bookRes.status === 'success') {
          const matched = bookRes.data.bookings.find((b: any) => b.ride._id === id);
          setMyBooking(matched || null);

          // Check if already reviewed driver
          if (matched) {
            try {
              const revRes = await bookingService.getMyReview(id, 'driver');
              if (revRes.status === 'success') {
                setExistingDriverReview(revRes.data.review);
              }
            } catch (_) {}
          }
        }
      }
    } catch (err) {
      toast.error('Failed to load ride details.');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    fetchRideAndBookings();
  }, [fetchRideAndBookings]);

  useEffect(() => {
    if (ride) {
      setPickup(ride.source || '');
      setDrop(ride.destination || '');
    }
  }, [ride]);

  // Fetch weather for ride (F5)
  useEffect(() => {
    if (!ride) return;
    const coords = ride.pickupLocation?.coordinates;
    const date = ride.departureDate;
    if (!coords || !date) return;

    const dateStr = new Date(date).toISOString().split('T')[0];
    setWeatherLoading(true);
    api
      .get('/weather', { params: { lat: coords[1], lng: coords[0], date: dateStr } })
      .then((res) => {
        if (res.data?.data?.weather) setWeather(res.data.data.weather);
      })
      .catch(() => {}) // silently fail
      .finally(() => setWeatherLoading(false));
  }, [ride]);

  const isDriver = ride?.driver._id === user?._id;

  // ─── Passenger: Get current GPS location ────────────────────────────────────
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setPickupCoords([lng, lat]);
        try {
          const res = await api.get(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const addr = res.data?.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          setPickup(addr);
        } catch {
          setPickup(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
        setGettingLocation(false);
      },
      () => {
        toast.error('Could not get your current location.');
        setGettingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  // ─── Booking ─────────────────────────────────────────────────────────────────
  const handleRequestBooking = async () => {
    if (!ride) return;
    if (!pickup.trim() || !drop.trim()) {
      toast.error('Pickup and drop locations are required.');
      return;
    }
    setBookingLoading(true);
    try {
      const res = await bookingService.createBooking(
        ride._id,
        requestedSeats,
        pickup,
        drop,
        message,
        pickupCoords ?? undefined,
        undefined
      );
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

  const handleRespondBooking = async (bookingId: string, status: 'accepted' | 'rejected') => {
    try {
      const res = await bookingService.respondToBooking(bookingId, status);
      if (res.status === 'success') {
        toast.success(`Booking successfully ${status}.`);
        setBookings((prev) => prev.map((b) => (b._id === bookingId ? { ...b, status } : b)));
        fetchRideAndBookings();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to respond to booking.');
    }
  };

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

  // ─── Review Handlers ─────────────────────────────────────────────────────────
  const openDriverReviewDialog = () => {
    if (!ride) return;
    setReviewDialogTarget({ name: ride.driver.name, type: 'driver' });
    setReviewDialogOpen(true);
  };

  const openPassengerReviewDialog = (passengerId: string, passengerName: string) => {
    setReviewDialogTarget({ name: passengerName, type: 'passenger', passengerId });
    setReviewDialogOpen(true);
  };

  const handleReviewSubmit = async (rating: number, comment: string) => {
    if (!ride) return;
    setReviewLoading(true);
    try {
      if (reviewDialogTarget.type === 'driver') {
        if (existingDriverReview) {
          await bookingService.updateReview(existingDriverReview._id, rating, comment);
          toast.success('Review updated!');
        } else {
          await bookingService.createReview(ride._id, rating, comment);
          toast.success('Driver review submitted! ⭐');
          setExistingDriverReview({ rating, comment, createdAt: new Date().toISOString() });
        }
      } else if (reviewDialogTarget.passengerId) {
        await bookingService.createPassengerReview(ride._id, reviewDialogTarget.passengerId, rating, comment);
        toast.success('Passenger review submitted! ⭐');
        setPassengerReviewedMap((prev) => ({ ...prev, [reviewDialogTarget.passengerId!]: true }));
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
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
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
      {/* Route Header */}
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
          {ride.status === 'ongoing' && <Badge variant="warning">On the Road 🚗</Badge>}
          {ride.status === 'completed' && <Badge variant="success">Completed</Badge>}
          {ride.status === 'cancelled' && <Badge variant="destructive">Cancelled</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Map & Management */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Feature 3: Live Tracking Map (shown when ride is ongoing) */}
          {ride.status === 'ongoing' && (isDriver || myBooking?.status === 'accepted') && (
            <Card className="overflow-hidden border-violet-500/30">
              <CardHeader className="bg-zinc-950 p-4 border-b border-zinc-850">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-violet-400 animate-pulse" />
                  Live Driver Tracking
                </CardTitle>
              </CardHeader>
              <div className="p-4">
                <LiveTrackingMap
                  socket={socket}
                  rideId={ride._id}
                  isDriver={isDriver}
                  driverId={ride.driver._id}
                  passengerPickupCoords={myBooking?.pickupCoordinates}
                  passengerPickupAddress={myBooking?.pickup}
                />
              </div>
            </Card>
          )}

          {/* Static Route Map */}
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

          {/* Feature 5: Weather Widget */}
          {(weather || weatherLoading) && (
            <Card>
              <CardHeader className="border-b border-zinc-850 pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <CloudSun className="w-4 h-4 text-blue-400" />
                  Departure Day Weather
                </CardTitle>
                <CardDescription>Forecast for your pickup location</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <WeatherWidget
                  weather={weather || { available: false }}
                  departureDate={ride.departureDate}
                  loading={weatherLoading}
                />
              </CardContent>
            </Card>
          )}

          {/* Driver: Booking Management */}
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
                              {booking.passenger.name}
                              {booking.passenger.branch && ` (${booking.passenger.branch}, Year ${booking.passenger.year})`}
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
                            {booking.pickup && (
                              <p className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1">
                                <MapPin className="w-2.5 h-2.5" />
                                Pickup: {booking.pickup}
                              </p>
                            )}
                          </div>
                        </div>

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
                            <div className="text-right flex flex-col items-end gap-2">
                              {booking.status === 'accepted' && (
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
                              )}
                              {booking.status === 'completed' && !passengerReviewedMap[booking.passenger._id] && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs py-1 h-auto border-amber-700/50 text-amber-400"
                                  onClick={() => openPassengerReviewDialog(booking.passenger._id, booking.passenger.name)}
                                >
                                  <Star className="w-3 h-3 mr-1" />
                                  Rate Passenger
                                </Button>
                              )}
                              {booking.status !== 'accepted' && booking.status !== 'completed' && (
                                <Badge variant="secondary" className="capitalize">{booking.status}</Badge>
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

          {/* Passenger: Driver Review (F1) */}
          {!isDriver && myBooking?.status === 'accepted' && ride.status === 'completed' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rate Your Experience</CardTitle>
                <CardDescription>
                  {existingDriverReview ? 'You reviewed this ride. Edit within 24h.' : 'Share your experience with the driver.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {existingDriverReview ? (
                  <div className="flex items-center justify-between p-4 bg-emerald-950/20 border border-emerald-800/30 rounded-xl">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      <div>
                        <p className="text-xs font-semibold text-zinc-200">Review Submitted</p>
                        <div className="flex gap-0.5 mt-1">
                          {[1,2,3,4,5].map((s) => (
                            <Star key={s} className={`w-3.5 h-3.5 ${s <= existingDriverReview.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={openDriverReviewDialog} className="text-xs h-auto py-1.5">
                      Edit Review
                    </Button>
                  </div>
                ) : (
                  <Button onClick={openDriverReviewDialog} className="w-full">
                    <Star className="w-4 h-4 mr-2" />
                    Rate Driver {ride.driver.name}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Driver Profile & Booking Action */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Driver Card */}
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

              {((myBooking?.status === 'accepted') || isDriver) && ride.driver.phone && (
                <p className="text-xs font-bold text-violet-400 mt-2">Call: {ride.driver.phone}</p>
              )}

              {/* Rating display */}
              <div className="flex items-center justify-center gap-3 mt-4 w-full">
                <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-850 flex-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">Rating</span>
                  <span className="text-sm font-black text-amber-400 flex items-center justify-center gap-0.5 mt-0.5">
                    <Star className="w-4 h-4 fill-amber-400" />
                    {ride.driver.rating}
                  </span>
                </div>
                <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-850 flex-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">Trust</span>
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

          {/* Booking Action / Trip Control */}
          <Card className="border-violet-500/20">
            <CardHeader className="bg-violet-950/15 border-b border-zinc-850 p-4">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span>Trip Action Portal</span>
                <span className="text-base text-violet-400 font-black">₹{ride.price}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {/* DRIVER CONTROLS */}
              {isDriver && (
                <div className="flex flex-col gap-3">
                  {ride.status === 'scheduled' && (
                    <Button onClick={() => handleUpdateStatus('ongoing')} loading={statusLoading} className="w-full py-3">
                      Start Trip (Ongoing)
                    </Button>
                  )}
                  {ride.status === 'ongoing' && (
                    <Button onClick={() => handleUpdateStatus('completed')} loading={statusLoading} className="w-full py-3">
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

              {/* PASSENGER CONTROLS */}
              {!isDriver && (
                <div className="flex flex-col gap-4">
                  {/* Not booked yet */}
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
                            className="w-full px-4 py-3 bg-zinc-950 border border-zinc-850 rounded-xl text-zinc-150 focus:outline-none focus:ring-2 focus:ring-violet-600 transition-all text-sm mb-2"
                          />

                          {/* Feature 4: Map-based pickup selection */}
                          <div className="flex flex-col gap-1">
                            <label className="text-[11px] font-bold text-zinc-455 uppercase tracking-wider flex items-center justify-between">
                              <span>Pickup Location</span>
                              <button
                                type="button"
                                onClick={handleUseCurrentLocation}
                                disabled={gettingLocation}
                                className="flex items-center gap-1 text-violet-400 hover:text-violet-300 text-[10px] font-normal transition-colors disabled:opacity-50"
                              >
                                <Locate className="w-3 h-3" />
                                {gettingLocation ? 'Getting location...' : 'Use GPS'}
                              </button>
                            </label>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                              <input
                                type="text"
                                placeholder="e.g. MH-2 Hostel Gate, Block 3"
                                value={pickup}
                                onChange={(e) => { setPickup(e.target.value); setPickupCoords(null); }}
                                className="w-full pl-9 pr-4 py-3 bg-zinc-950 border border-zinc-850 rounded-xl text-zinc-150 focus:outline-none focus:ring-2 focus:ring-violet-600 transition-all text-sm mb-2"
                                required
                              />
                            </div>
                            {pickupCoords && (
                              <p className="text-[10px] text-emerald-400 flex items-center gap-1 -mt-1 mb-1">
                                <CheckCircle className="w-2.5 h-2.5" />
                                GPS coordinates captured
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[11px] font-bold text-zinc-455 uppercase tracking-wider">Dropoff Location</label>
                            <input
                              type="text"
                              placeholder="e.g. Block 1 Academic Block"
                              value={drop}
                              onChange={(e) => setDrop(e.target.value)}
                              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-850 rounded-xl text-zinc-150 focus:outline-none focus:ring-2 focus:ring-violet-600 transition-all text-sm mb-2"
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
                              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-850 rounded-xl text-zinc-150 focus:outline-none focus:ring-2 focus:ring-violet-600 transition-all text-sm mb-2 resize-none"
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

                  {/* Awaiting driver approval */}
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

                  {/* Booking accepted */}
                  {myBooking && myBooking.status === 'accepted' && (
                    <div className="flex flex-col gap-3">
                      <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5">
                        <CheckCircle className="w-4 h-4" />
                        Seat Confirmed 🎉
                      </div>
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

                  {myBooking && myBooking.status === 'rejected' && (
                    <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded-xl text-xs font-semibold text-center">
                      Your booking request was declined.
                    </div>
                  )}

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

      {/* Review Dialog (F1 + F2) */}
      <ReviewDialog
        isOpen={reviewDialogOpen}
        onClose={() => setReviewDialogOpen(false)}
        onSubmit={handleReviewSubmit}
        targetName={reviewDialogTarget.name}
        reviewType={reviewDialogTarget.type}
        existingReview={reviewDialogTarget.type === 'driver' ? existingDriverReview : null}
        loading={reviewLoading}
      />
    </div>
  );
};

export default RideDetails;
