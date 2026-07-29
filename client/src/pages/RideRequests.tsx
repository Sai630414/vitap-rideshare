import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Compass, Plus, Clock, Users, MapPin, Sparkles, Navigation } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import rideService from '../services/rideService';

interface RideRequestData {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    profileImage: string;
    rating: number;
    trustScore: number;
  };
  source: string;
  destination: string;
  pickupLocation: { address: string; coordinates: [number, number] };
  dropLocation: { address: string; coordinates: [number, number] };
  departureDate: string;
  departureTime: string;
  seatsNeeded: number;
  description?: string;
  status: string;
  createdAt: string;
}

export const RideRequests: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<RideRequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Form states
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [seats, setSeats] = useState<number>(1);
  const [description, setDescription] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await rideService.getActiveRideRequests();
      if (res.status === 'success') {
        setRequests(res.data.rideRequests);
      }
    } catch (err) {
      toast.error('Failed to load active ride requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!source || !destination || !date || !time) {
      toast.error('Please complete all form fields.');
      return;
    }

    setSubmitLoading(true);
    try {
      // Simulate geocoding to attach mock coordinates to requested trips
      const pickupCoords: [number, number] = [80.4992, 16.4971]; // default central VIT-AP
      const dropCoords: [number, number] = [80.5, 16.5];        // offset slightly

      const res = await rideService.createRideRequest({
        source,
        destination,
        pickupLocation: { address: source, coordinates: pickupCoords },
        dropLocation: { address: destination, coordinates: dropCoords },
        departureDate: date,
        departureTime: time,
        seatsNeeded: seats,
        description: description || undefined,
      });

      if (res.status === 'success') {
        toast.success('🎉 Your ride request has been listed on the board.');
        setShowAddForm(false);
        // Reset form
        setSource('');
        setDestination('');
        setDate('');
        setTime('');
        setSeats(1);
        setDescription('');
        
        fetchRequests();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit request.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleOfferMatchingRide = (req: RideRequestData) => {
    // Navigate driver to offer ride page, prefilling the coordinates
    navigate('/offer-ride', {
      state: {
        prefill: {
          source: req.source,
          destination: req.destination,
          departureDate: new Date(req.departureDate).toISOString().split('T')[0],
          departureTime: req.departureTime,
          seats: req.seatsNeeded,
        },
      },
    });
  };

  const handleCancelMyRequest = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel your ride request?')) return;
    try {
      const res = await rideService.deleteRideRequest(id);
      if (res.status === 'success') {
        toast.success('Ride request cancelled.');
        setRequests((prev) => prev.filter((r) => r._id !== id));
      }
    } catch (err) {
      toast.error('Failed to cancel request.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2 font-sans">
            <Compass className="w-7 h-7 text-violet-400" />
            Ride Requests Board
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Passengers seeking rides commute splits</p>
        </div>
        {!showAddForm && (
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Request Ride
          </Button>
        )}
      </div>

      {/* Add Request Form Panel */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Post Ride Request</CardTitle>
            <CardDescription>Need a ride? List your destination so drivers can see</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateRequest} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Leaving From"
                placeholder="Block 1, Main Gate, Vijayawada station..."
                value={source}
                onChange={(e) => setSource(e.target.value)}
                icon={<MapPin className="w-4 h-4" />}
                required
              />
              <Input
                label="Going To"
                placeholder="Destinations, hostel blocks, Guntur..."
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                icon={<MapPin className="w-4 h-4 text-violet-500" />}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Departure Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-155 focus:outline-none focus:ring-2 focus:ring-violet-600 transition-all text-sm light:bg-white light:border-zinc-300 light:text-zinc-900"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Departure Time</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-155 focus:outline-none focus:ring-2 focus:ring-violet-600 transition-all text-sm light:bg-white light:border-zinc-300 light:text-zinc-900"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-zinc-300">Seats Required</label>
                <div className="relative flex items-center">
                  <Users className="absolute left-4 w-4 h-4 text-zinc-500" />
                  <input
                    type="number"
                    value={seats}
                    onChange={(e) => setSeats(parseInt(e.target.value) || 1)}
                    className="w-full pl-11 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-150 focus:outline-none focus:ring-2 focus:ring-violet-600 transition-all text-sm light:bg-white light:border-zinc-300"
                    min={1}
                    max={6}
                    required
                  />
                </div>
              </div>

              <Input
                label="Notes"
                placeholder="Bag details, split preferences, custom timings..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="sm:col-span-2"
              />

              <div className="sm:col-span-2 flex justify-end gap-3 mt-4">
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={submitLoading}>
                  List Requested Trip
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Requests Listings Board */}
      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 bg-zinc-900 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <Compass className="w-16 h-16 text-zinc-700 mx-auto mb-4 animate-pulse" />
          <h3 className="text-lg font-bold text-zinc-300">No active requests listed</h3>
          <p className="text-xs text-zinc-500 mt-1">
            There are no passengers requesting rides right now. If you need a ride, post one above!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <Card key={req._id}>
              <CardContent className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex-1 min-w-0">
                  {/* Top line metadata */}
                  <div className="flex items-center gap-2.5 text-[10px] font-bold text-zinc-400 uppercase">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      {new Date(req.departureDate).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                      {' '}at {req.departureTime}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-violet-400">
                      <Users className="w-3.5 h-3.5" />
                      {req.seatsNeeded} Seat(s) requested
                    </span>
                  </div>

                  {/* Route path */}
                  <div className="flex items-center gap-2 mt-3 text-base font-extrabold text-zinc-150">
                    <span>{req.source}</span>
                    <span className="text-zinc-500 font-normal">→</span>
                    <span>{req.destination}</span>
                  </div>

                  {/* Description note */}
                  {req.description && (
                    <p className="text-xs text-zinc-400 mt-2 bg-zinc-950 p-2.5 border border-zinc-850 rounded-xl leading-relaxed">
                      {req.description}
                    </p>
                  )}

                  {/* Requested by passenger */}
                  <div className="flex items-center gap-3 mt-4">
                    <img
                      src={req.user.profileImage || 'https://api.dicebear.com/7.x/initials/svg?seed=user'}
                      className="w-7 h-7 rounded-full object-cover border border-zinc-700/50"
                      alt=""
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-zinc-300">
                        Requested by {req.user.name} | Rating: {req.user.rating} ⭐ | Trust: {req.user.trustScore}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 w-full md:w-auto flex justify-end border-t md:border-0 border-zinc-850 pt-4 md:pt-0">
                  {req.user._id === user?._id ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs text-red-400 py-1.5 h-auto"
                      onClick={() => handleCancelMyRequest(req._id)}
                    >
                      Cancel Request
                    </Button>
                  ) : user?.role === 'driver' && user?.verifiedDriver ? (
                    <Button
                      size="sm"
                      className="text-xs py-1.5 h-auto flex items-center gap-1.5"
                      onClick={() => handleOfferMatchingRide(req)}
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      Create Custom Offer
                    </Button>
                  ) : (
                    <span className="text-[10px] text-zinc-500 font-bold uppercase italic p-2 border border-zinc-850 rounded-xl">
                      Visible to Verified Drivers
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default RideRequests;
