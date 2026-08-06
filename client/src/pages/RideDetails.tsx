import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  Navigation2,
  ShieldCheck,
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
import AutocompleteInput from '../components/AutocompleteInput';
import rideService, { type RideData } from '../services/rideService';
import bookingService, { type BookingData } from '../services/bookingService';
import chatService from '../services/chatService';
import MapContainerComponent from '../components/MapContainer';
import locationPermissionService from '../services/locationPermissionService';
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
  const [isMandatoryReview, setIsMandatoryReview] = useState(false);
  const [hasDismissedMandatory, setHasDismissedMandatory] = useState(false);

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

  // Real-time Socket listeners for active trip screen
  useEffect(() => {
    if (!socket || !id) return;

    const handleRideUpdated = (updatedRide: RideData) => {
      if (updatedRide._id === id) {
        setRide(updatedRide);
      }
    };

    const handleBookingCreated = (newBooking: BookingData) => {
      const bRideId = typeof newBooking.ride === 'string' ? newBooking.ride : newBooking.ride?._id;
      if (bRideId === id) {
        setBookings((prev) => [newBooking, ...prev.filter((b) => b._id !== newBooking._id)]);
      }
    };

    const handleBookingUpdated = (updatedBooking: BookingData) => {
      const bRideId = typeof updatedBooking.ride === 'string' ? updatedBooking.ride : updatedBooking.ride?._id;
      if (bRideId === id) {
        setBookings((prev) => prev.map((b) => (b._id === updatedBooking._id ? updatedBooking : b)));
        if (updatedBooking.passenger._id === user?._id) {
          setMyBooking(updatedBooking);
        }
      }
    };

    socket.on('ride_updated', handleRideUpdated);
    socket.on('booking_created', handleBookingCreated);
    socket.on('booking_updated', handleBookingUpdated);

    return () => {
      socket.off('ride_updated', handleRideUpdated);
      socket.off('booking_created', handleBookingCreated);
      socket.off('booking_updated', handleBookingUpdated);
    };
  }, [socket, id, user]);

  useEffect(() => {
    if (ride) {
      setPickup(ride.source || '');
      setDrop(ride.destination || '');
    }
  }, [ride]);

  // Auto-trigger mandatory driver review modal when driver completes the ride
  useEffect(() => {
    if (!ride || !user || hasDismissedMandatory) return;
    const isRideDriver = ride.driver._id === user._id;
    if (
      ride.status === 'completed' &&
      !isRideDriver &&
      myBooking &&
      (myBooking.status === 'accepted' || myBooking.status === 'completed') &&
      !existingDriverReview
    ) {
      setReviewDialogTarget({ name: ride.driver.name, type: 'driver' });
      setIsMandatoryReview(true);
      setReviewDialogOpen(true);
    }
  }, [ride, user, myBooking, existingDriverReview, hasDismissedMandatory]);

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

  // ─── Passenger: Get current GPS location with Android location permissions ─
  const handleUseCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      const coords = await locationPermissionService.getCurrentPosition();
      const { latitude: lat, longitude: lng } = coords;
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
    } catch (err: any) {
      toast.error(err.message || 'Could not get your current location.');
    } finally {
      setGettingLocation(false);
    }
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

        if (status === 'completed') {
          if (isDriver) {
            const acceptedBooking = bookings.find((b) => b.status === 'accepted');
            if (acceptedBooking) {
              openPassengerReviewDialog(acceptedBooking.passenger._id, acceptedBooking.passenger.name);
            }
          } else {
            openDriverReviewDialog();
          }
        }
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
          setExistingDriverReview((prev: any) => ({ ...prev, rating, comment }));
        } else {
          const res = await bookingService.createReview(ride._id, rating, comment);
          toast.success('Driver review submitted! ⭐');
          setExistingDriverReview(
            res?.data?.review || res?.review || { _id: 'rev_' + Date.now(), rating, comment, createdAt: new Date().toISOString() }
          );
        }
        setIsMandatoryReview(false);
        setHasDismissedMandatory(true);
      } else if (reviewDialogTarget.passengerId) {
        await bookingService.createPassengerReview(ride._id, reviewDialogTarget.passengerId, rating, comment);
        toast.success('Passenger review submitted! ⭐');
        setPassengerReviewedMap((prev) => ({ ...prev, [reviewDialogTarget.passengerId!]: true }));
      }
      setReviewDialogOpen(false);
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
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3 animate-pulse" />
        <p className="text-slate-600 font-extrabold text-sm">Ride not found or has been removed.</p>
        <Link to="/search-rides" className="inline-block mt-4 text-xs font-black text-emerald-600 hover:underline">
          ← Back to Ride Search
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-2 max-w-xl mx-auto animate-in fade-in duration-300 pb-12">
      {/* Top Banner & Header */}
      <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-lg flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Trip Specification</span>
          <h1 className="text-base font-black tracking-tight mt-0.5">
            {ride.source} → {ride.destination}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {ride.status === 'ongoing' && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
              Trip Ongoing
            </span>
          )}
          {ride.status === 'completed' && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Completed
            </span>
          )}
          {ride.status === 'scheduled' && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Scheduled
            </span>
          )}
        </div>
      </div>

      {/* Live Map or Route Preview */}
      <div className="flex flex-col gap-4">
        {/* Live GPS Tracking Map Section (if ongoing) */}
        {(ride.status === 'ongoing' || ride.status === 'scheduled') && (
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Navigation2 className="w-4 h-4 text-emerald-600 animate-pulse" />
                <span className="text-xs font-black text-slate-900">Live GPS Radar & Passenger Locations</span>
              </div>
              <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Realtime Socket</span>
            </div>
            <LiveTrackingMap
              socket={socket}
              rideId={ride._id}
              isDriver={isDriver}
              driverId={ride.driver._id}
              currentUserId={user?._id}
              passengers={bookings
                .filter((b) => b.status === 'accepted' || b.status === 'completed')
                .map((b) => ({
                  id: typeof b.passenger === 'object' && b.passenger?._id ? b.passenger._id : String(b.passenger || ''),
                  name: typeof b.passenger === 'object' && b.passenger?.name ? b.passenger.name : 'Passenger',
                  pickupCoords: b.pickupCoordinates,
                  pickupAddress: b.pickup,
                }))}
              passengerPickupCoords={
                isDriver
                  ? bookings.find((b) => b.status === 'accepted' || b.status === 'completed')?.pickupCoordinates
                  : myBooking?.pickupCoordinates
              }
              passengerPickupAddress={
                isDriver
                  ? bookings.find((b) => b.status === 'accepted' || b.status === 'completed')?.pickup
                  : myBooking?.pickup
              }
              rideStatus={ride.status}
            />
          </div>
        )}

        {/* Static Route Map */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Map className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-black text-slate-900">Trip Route Preview</span>
          </div>
          <MapContainerComponent
            pickupCoords={ride.pickupLocation.coordinates}
            dropCoords={ride.dropLocation.coordinates}
            pickupAddress={ride.pickupLocation.address}
            dropAddress={ride.dropLocation.address}
            height="h-56"
          />
        </div>

        {/* Departure Day Weather */}
        {(weather || weatherLoading) && (
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <CloudSun className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-black text-slate-900">Departure Weather Forecast</span>
            </div>
            <WeatherWidget
              weather={weather || { available: false }}
              departureDate={ride.departureDate}
              loading={weatherLoading}
            />
          </div>
        )}

        {/* Driver Profile & Vehicle Card */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <img
              src={ride.driver.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(ride.driver.name)}`}
              className="w-12 h-12 rounded-full object-cover border border-slate-100"
              alt=""
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                {ride.driver.name}
                <ShieldCheck className="w-4 h-4 text-emerald-600 fill-emerald-100 shrink-0" />
              </h3>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-100">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-xs font-black text-slate-800">{ride.driver.rating}</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs flex justify-between items-center">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Vehicle</span>
              <span className="font-extrabold text-slate-800 capitalize">{ride.vehicle.brand} {ride.vehicle.model} ({ride.vehicle.color})</span>
            </div>
            {((myBooking?.status === 'accepted') || isDriver) && (
              <span className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 font-black uppercase text-[10px] text-slate-900">
                {ride.vehicle.numberPlate}
              </span>
            )}
          </div>
        </div>

        {/* Driver: Booking Requests Management */}
        {isDriver && (
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-black text-slate-900">Passenger Requests ({bookings.length})</span>
              <span className="text-[10px] font-bold text-slate-400">Available Seats: {ride.availableSeats}</span>
            </div>

            {bookings.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-xs font-bold">No passenger booking requests yet.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {bookings.map((booking) => (
                  <div key={booking._id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={booking.passenger.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(booking.passenger.name)}`}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        alt=""
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 truncate">{booking.passenger.name}</p>
                        <p className="text-[10px] font-bold text-slate-400">{booking.seatNumber} Seat(s) • Rating: {booking.passenger.rating} ⭐</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {booking.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleRespondBooking(booking._id, 'rejected')}
                            className="px-2.5 py-1 bg-rose-50 text-rose-600 rounded-xl text-xs font-extrabold"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => handleRespondBooking(booking._id, 'accepted')}
                            className="px-3 py-1 bg-emerald-600 text-white rounded-xl text-xs font-extrabold shadow-sm"
                          >
                            Approve
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold capitalize ${
                            booking.status === 'accepted' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {booking.status}
                          </span>
                          {booking.status === 'accepted' && (
                            <>
                              {ride.status !== 'completed' && ride.status !== 'cancelled' && (
                                <button
                                  onClick={() => handleLaunchChat(booking.passenger._id)}
                                  className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl"
                                  title="Chat with Passenger"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {ride.status === 'completed' && (
                                <button
                                  onClick={() => openPassengerReviewDialog(booking.passenger._id, booking.passenger.name)}
                                  className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-extrabold flex items-center gap-1"
                                >
                                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                  <span>{passengerReviewedMap[booking.passenger._id] ? 'Reviewed' : 'Rate'}</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Driver Trip Status Control Panel */}
        {isDriver && (
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-2.5">
            <span className="text-xs font-black text-slate-900 border-b border-slate-100 pb-2">Trip Status Control</span>
            {ride.status === 'scheduled' && (
              <button
                onClick={() => handleUpdateStatus('ongoing')}
                disabled={statusLoading}
                className="w-full py-3 bg-emerald-600 text-white rounded-2xl font-extrabold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-transform"
              >
                Start Ride (Set Status: Ongoing)
              </button>
            )}
            {ride.status === 'ongoing' && (
              <button
                onClick={() => handleUpdateStatus('completed')}
                disabled={statusLoading}
                className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-extrabold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-transform"
              >
                Mark Ride as Completed
              </button>
            )}
            {ride.status !== 'completed' && ride.status !== 'cancelled' && (
              <button
                onClick={() => handleUpdateStatus('cancelled')}
                disabled={statusLoading}
                className="w-full py-2.5 bg-rose-50 text-rose-600 rounded-2xl font-bold text-xs border border-rose-200"
              >
                Cancel This Trip
              </button>
            )}
          </div>
        )}

        {/* Passenger Review Section */}
        {!isDriver && myBooking?.status === 'accepted' && ride.status === 'completed' && (
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900">Rate Your Experience</span>
              <span className="text-[10px] font-bold text-slate-400">Driver Review</span>
            </div>
            {existingDriverReview ? (
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-900">Review Submitted</span>
                </div>
                <button
                  onClick={openDriverReviewDialog}
                  className="px-3 py-1 bg-white text-emerald-700 border border-emerald-200 rounded-xl text-xs font-extrabold"
                >
                  Edit Review
                </button>
              </div>
            ) : (
              <button
                onClick={openDriverReviewDialog}
                className="w-full py-3 bg-emerald-600 text-white rounded-2xl font-extrabold text-xs shadow-sm flex items-center justify-center gap-2"
              >
                <Star className="w-4 h-4 fill-white text-white" />
                Rate Driver {ride.driver.name}
              </button>
            )}
          </div>
        )}

        {/* Passenger Booking Action Card */}
        {!isDriver && (
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-black text-slate-900">Seat Booking Portal</span>
              <span className="text-sm font-black text-emerald-600">₹{ride.price} <span className="text-[10px] text-slate-400 font-bold">/ seat</span></span>
            </div>

            {/* Not booked yet */}
            {!myBooking && (
              <div className="flex flex-col gap-3">
                {ride.availableSeats > 0 ? (
                  <>
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                        Seats Needed (Available: {ride.availableSeats})
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={Math.min(4, ride.availableSeats)}
                        value={requestedSeats}
                        onChange={(e) => setRequestedSeats(parseInt(e.target.value) || 1)}
                        className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
                      />
                    </div>

                    <AutocompleteInput
                      label="Pickup Point"
                      placeholder="Search pickup place, hostel, campus gate..."
                      value={pickup}
                      onChange={(val) => setPickup(val)}
                      onSelect={(coords, name) => {
                        setPickup(name);
                        setPickupCoords(coords);
                      }}
                      required
                    />

                    {pickupCoords && (
                      <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1 ml-1">
                        <CheckCircle className="w-3 h-3" />
                        Exact coordinates attached ({pickupCoords[1].toFixed(4)}, {pickupCoords[0].toFixed(4)})
                      </p>
                    )}

                    <AutocompleteInput
                      label="Dropoff Point"
                      placeholder="Search drop location, landmark, station..."
                      value={drop}
                      onChange={(val) => setDrop(val)}
                      onSelect={(coords, name) => setDrop(name)}
                      required
                    />

                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Message to Driver (Optional)</label>
                      <textarea
                        placeholder="e.g. Carrying a luggage bag..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={2}
                        className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none resize-none"
                      />
                    </div>

                    <button
                      onClick={handleRequestBooking}
                      disabled={bookingLoading || ride.status !== 'scheduled'}
                      className="w-full py-3 bg-emerald-600 text-white rounded-2xl text-xs font-extrabold shadow-md shadow-emerald-600/20 active:scale-95 transition-transform"
                    >
                      {bookingLoading ? 'Submitting Request...' : 'Submit Booking Request'}
                    </button>
                  </>
                ) : (
                  <div className="text-center text-xs text-rose-600 font-bold p-3 bg-rose-50 border border-rose-100 rounded-2xl">
                    Seats are fully booked for this trip
                  </div>
                )}
              </div>
            )}

            {/* Awaiting Driver Approval */}
            {myBooking && myBooking.status === 'pending' && (
              <div className="flex flex-col gap-2.5 text-center">
                <div className="p-3 bg-amber-50 border border-amber-100 text-amber-700 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Awaiting Driver Approval</span>
                </div>
                <button
                  onClick={handleCancelBooking}
                  disabled={bookingLoading}
                  className="w-full py-2.5 bg-rose-50 text-rose-600 rounded-2xl text-xs font-extrabold border border-rose-200"
                >
                  Cancel Seat Request
                </button>
              </div>
            )}

            {/* Booking Accepted */}
            {myBooking && myBooking.status === 'accepted' && (
              <div className="flex flex-col gap-2.5">
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Seat Booking Approved 🎉</span>
                </div>
                {ride.status !== 'completed' && ride.status !== 'cancelled' && (
                  <button
                    onClick={() => handleLaunchChat(ride.driver._id)}
                    className="w-full py-3 bg-indigo-600 text-white rounded-2xl text-xs font-extrabold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Chat with Driver
                  </button>
                )}
                {ride.status !== 'completed' && ride.status !== 'cancelled' && (
                  <button
                    onClick={handleCancelBooking}
                    disabled={bookingLoading}
                    className="w-full py-2.5 bg-rose-50 text-rose-600 rounded-2xl text-xs font-bold border border-rose-200"
                  >
                    Cancel Confirmed Seat
                  </button>
                )}
              </div>
            )}

            {myBooking && myBooking.status === 'rejected' && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl text-xs font-extrabold text-center">
                Your booking request was declined by the driver.
              </div>
            )}

            {myBooking && myBooking.status === 'cancelled' && (
              <div className="p-3 bg-slate-100 text-slate-500 rounded-2xl text-xs font-extrabold text-center">
                Seat Request Cancelled.
              </div>
            )}
          </div>
        )}

        {/* Review Dialog (F1 + F2) */}
        <ReviewDialog
          isOpen={reviewDialogOpen}
          onClose={() => {
            setReviewDialogOpen(false);
            setIsMandatoryReview(false);
            setHasDismissedMandatory(true);
          }}
          onSubmit={handleReviewSubmit}
          targetName={reviewDialogTarget.name}
          reviewType={reviewDialogTarget.type}
          existingReview={reviewDialogTarget.type === 'driver' ? existingDriverReview : null}
          loading={reviewLoading}
          mandatory={isMandatoryReview}
        />
      </div>
    </div>
  );
};

export default RideDetails;
