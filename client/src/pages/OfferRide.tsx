import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import {
  Calendar,
  Clock,
  CircleDollarSign,
  Users,
  AlertCircle,
  Plus,
  Car,
  ChevronRight,
  ShieldCheck,
  Zap,
  MapPin,
  X,
  CheckCircle2,
} from 'lucide-react';
import vehicleService, { type VehicleData } from '../services/vehicleService';
import rideService from '../services/rideService';
import MapContainerComponent from '../components/MapContainer';
import AutocompleteInput from '../components/AutocompleteInput';

import { useAuth } from '../context/AuthContext';

export const OfferRide: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [activeRide, setActiveRide] = useState<any | null>(null);

  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [price, setPrice] = useState('');
  const [seats, setSeats] = useState<number>(1);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const [pickupCoords, setPickupCoords] = useState<[number, number] | undefined>(undefined);
  const [dropCoords, setDropCoords] = useState<[number, number] | undefined>(undefined);
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropAddress, setDropAddress] = useState('');

  useEffect(() => {
    const fetchVehiclesAndActiveRides = async () => {
      try {
        const res = await vehicleService.getMyVehicles();
        if (res.status === 'success') {
          const verifiedOnly = res.data.vehicles.filter((v: any) => v.status === 'verified');
          setVehicles(verifiedOnly);
          if (verifiedOnly.length > 0) {
            setSelectedVehicleId(verifiedOnly[0]._id);
            setSeats(verifiedOnly[0].seats);
          }
        }

        const ridesRes = await rideService.searchRides({});
        if (ridesRes.status === 'success') {
          const existingActive = ridesRes.data.rides.find(
            (r: any) => r.driver._id === user?._id && (r.status === 'scheduled' || r.status === 'ongoing')
          );
          if (existingActive) {
            setActiveRide(existingActive);
          }
        }
      } catch (err) {
        console.error('Failed to load vehicles or active rides:', err);
      } finally {
        setLoadingVehicles(false);
      }
    };
    fetchVehiclesAndActiveRides();
  }, [user]);

  const handleVehicleChange = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    const selected = vehicles.find((v) => v._id === vehicleId);
    if (selected) setSeats(selected.seats);
  };

  const handleMapSelect = (type: 'pickup' | 'drop', coords: [number, number], address: string) => {
    if (type === 'pickup') {
      setPickupCoords(coords);
      setPickupAddress(address);
      if (!source) setSource(address);
    } else {
      setDropCoords(coords);
      setDropAddress(address);
      if (!destination) setDestination(address);
    }
  };

  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId) return toast.error('Select a verified vehicle.');
    if (!pickupCoords || !dropCoords) return toast.error('Set both pickup and drop coordinates on map or search.');
    if (!source || !destination || !departureDate || !departureTime || !price) return toast.error('Complete all trip fields.');

    setLoading(true);
    try {
      const response = await rideService.offerRide({
        vehicleId: selectedVehicleId,
        source,
        destination,
        pickupLocation: { address: pickupAddress || source, coordinates: pickupCoords },
        dropLocation: { address: dropAddress || destination, coordinates: dropCoords },
        departureDate,
        departureTime,
        price: parseFloat(price),
        availableSeats: seats,
        description,
        recurring: { isRecurring: false },
      });
      if (response.status === 'success') {
        toast.success('🎉 Ride published successfully!');
        navigate('/dashboard');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to list ride.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingVehicles) return (
    <div className="min-h-[300px] flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs font-bold text-slate-500">Checking vehicle fleet...</p>
    </div>
  );

  if (vehicles.length === 0) return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col items-center text-center my-4 gap-4">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
        <AlertCircle className="w-7 h-7" />
      </div>
      <div>
        <h2 className="text-lg font-black text-slate-900">Vehicle Approval Required</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
          You need at least one verified vehicle in your profile to offer rides.
        </p>
      </div>
      <Link to="/profile" className="w-full">
        <button className="w-full py-3.5 bg-emerald-600 text-white rounded-2xl font-extrabold text-xs shadow-md shadow-emerald-600/20">
          + Add & Verify Vehicle
        </button>
      </Link>
    </div>
  );

  if (activeRide) return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col items-center text-center my-4 gap-4 animate-in fade-in">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
        <AlertCircle className="w-7 h-7" />
      </div>
      <div>
        <h2 className="text-lg font-black text-slate-900">Active Ride in Progress</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed font-bold">
          You already have an active ride hosted ({activeRide.source} → {activeRide.destination}). Complete or cancel your current trip before offering another one.
        </p>
      </div>
      <button
        onClick={() => navigate(`/ride/${activeRide._id}`)}
        className="w-full py-3.5 bg-emerald-600 text-white rounded-2xl font-extrabold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-transform"
      >
        View Active Trip Details
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 py-2 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-600 text-white p-4 rounded-3xl shadow-md flex items-center justify-between">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-200 block">Host a Trip</span>
          <h1 className="text-lg font-black tracking-tight mt-0.5">Offer Campus Ride</h1>
        </div>
        <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
          <Zap className="w-5 h-5 text-emerald-300" />
        </div>
      </div>

      <form onSubmit={handleOfferSubmit} className="flex flex-col gap-4">
        
        {/* Vehicle Selection Card */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-2">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider ml-1">
            Select Approved Vehicle
          </label>
          <div className="relative flex items-center">
            <select
              value={selectedVehicleId}
              onChange={(e) => handleVehicleChange(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {vehicles.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.brand} {v.model} ({v.numberPlate}) - {v.seats} seats
                </option>
              ))}
            </select>
            <ChevronRight className="absolute right-3 w-4 h-4 text-slate-400 pointer-events-none rotate-90" />
          </div>
        </div>

        {/* Route Details Card */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
          <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-600" />
            Route Points
          </span>

          <div className="space-y-2.5">
            <AutocompleteInput
              label="Pickup Location"
              placeholder="e.g. VIT-AP Main Gate"
              value={source}
              onChange={setSource}
              onSelect={(c, n) => {
                setPickupCoords(c);
                setPickupAddress(n);
                setSource(n);
              }}
              required
            />
            <AutocompleteInput
              label="Dropoff Location"
              placeholder="e.g. Vijayawada Railway Station"
              value={destination}
              onChange={setDestination}
              onSelect={(c, n) => {
                setDropCoords(c);
                setDropAddress(n);
                setDestination(n);
              }}
              required
            />
          </div>
        </div>

        {/* Date & Time Selection */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
          <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-600" />
            Schedule
          </span>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                Departure Date
              </label>
              <input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                Time
              </label>
              <input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                required
              />
            </div>
          </div>
        </div>

        {/* Seats & Price */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
          <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
            <CircleDollarSign className="w-4 h-4 text-emerald-600" />
            Seats & Fare
          </span>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                Price Per Seat (₹)
              </label>
              <input
                type="number"
                placeholder="150"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                Available Seats
              </label>
              <input
                type="number"
                min={1}
                max={vehicles.find((v) => v._id === selectedVehicleId)?.seats || 4}
                value={seats}
                onChange={(e) => setSeats(parseInt(e.target.value) || 1)}
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                required
              />
            </div>
          </div>
        </div>

        {/* Map Location Selector */}
        <div className="bg-white p-3 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black text-slate-900">Map Pin Preview</span>
            {(pickupCoords || dropCoords) && (
              <button
                type="button"
                onClick={() => {
                  setPickupCoords(undefined);
                  setDropCoords(undefined);
                  setPickupAddress('');
                  setDropAddress('');
                }}
                className="text-[10px] font-extrabold text-rose-600"
              >
                Reset Pins
              </button>
            )}
          </div>
          <div className="h-44 rounded-2xl overflow-hidden border border-slate-200 relative">
            <MapContainerComponent
              pickupCoords={pickupCoords}
              dropCoords={dropCoords}
              pickupAddress={pickupAddress}
              dropAddress={dropAddress}
              interactive={true}
              onSelectCoords={handleMapSelect}
            />
          </div>
        </div>

        {/* Submit Floating Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] transition-all text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 mt-2"
        >
          {loading ? 'Publishing Ride...' : '🚀 Publish Campus Ride'}
        </button>

      </form>
    </div>
  );
};

export default OfferRide;

