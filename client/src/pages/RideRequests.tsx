import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Compass, Plus, Clock, Users, MapPin, Navigation, X, Trash2 } from 'lucide-react';
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
      const pickupCoords: [number, number] = [80.4992, 16.4971];
      const dropCoords: [number, number] = [80.5, 16.5];

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
        toast.success('🎉 Ride request posted!');
        setShowAddForm(false);
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
    if (!window.confirm('Cancel your ride request?')) return;
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
    <div className="flex flex-col gap-4 py-2 animate-in fade-in duration-300">
      
      {/* Top Action Header */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-emerald-600" />
            Ride Requests Board
          </h1>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5">
            Custom ride postings from fellow students
          </p>
        </div>

        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-3.5 py-2 bg-emerald-600 text-white rounded-2xl text-xs font-extrabold shadow-sm active:scale-95 transition-transform flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            <span>Post Request</span>
          </button>
        )}
      </div>

      {/* Add Request Form Modal / Sheet */}
      {showAddForm && (
        <form onSubmit={handleCreateRequest} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-md flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-black text-slate-900">Post Custom Ride Request</span>
            <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Starting From</label>
            <input
              type="text"
              placeholder="e.g. Block 2, VIT-AP"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Going To</label>
            <input
              type="text"
              placeholder="e.g. Vijayawada Station"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Seats Needed</label>
            <input
              type="number"
              min={1}
              max={6}
              value={seats}
              onChange={(e) => setSeats(parseInt(e.target.value) || 1)}
              className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Additional Notes</label>
            <input
              type="text"
              placeholder="Luggage info, time flexibility..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="flex-1 py-3 rounded-2xl text-xs font-bold text-slate-500 bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitLoading}
              className="flex-1 py-3 rounded-2xl text-xs font-extrabold text-white bg-emerald-600 shadow-md shadow-emerald-600/20"
            >
              {submitLoading ? 'Submitting...' : 'Post Request'}
            </button>
          </div>
        </form>
      )}

      {/* Requests Listings */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <Navigation className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-500">No active ride requests listed</p>
          <p className="text-[10px] text-slate-400 mt-1">Post a request above if you need a custom trip</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((req) => (
            <div
              key={req._id}
              className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src={req.user.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(req.user.name)}`}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover border border-slate-100"
                  />
                  <div>
                    <span className="text-xs font-black text-slate-900 block">{req.user.name}</span>
                    <span className="text-[9px] font-bold text-slate-400">
                      Rating: {req.user.rating} ⭐ • Trust: {req.user.trustScore}%
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                  {req.seatsNeeded} Seat(s)
                </span>
              </div>

              {/* Route */}
              <div className="bg-slate-50 p-2.5 rounded-2xl flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <span className="truncate">{req.source}</span>
                    <span className="text-slate-400">→</span>
                    <span className="truncate">{req.destination}</span>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <span className="text-[9px] font-bold text-slate-400 block">
                    {new Date(req.departureDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="text-xs font-black text-slate-900 block mt-0.5">{req.departureTime}</span>
                </div>
              </div>

              {req.description && (
                <p className="text-[11px] text-slate-600 bg-slate-50/60 p-2 rounded-xl italic">
                  "{req.description}"
                </p>
              )}

              {/* Action footer */}
              <div className="flex items-center justify-end pt-1">
                {req.user._id === user?._id ? (
                  <button
                    onClick={() => handleCancelMyRequest(req._id)}
                    className="text-[11px] font-extrabold text-rose-600 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Cancel Request</span>
                  </button>
                ) : user?.role === 'driver' && user?.verifiedDriver ? (
                  <button
                    onClick={() => handleOfferMatchingRide(req)}
                    className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-transform flex items-center gap-1"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Create Custom Offer</span>
                  </button>
                ) : (
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Open for Drivers
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RideRequests;

