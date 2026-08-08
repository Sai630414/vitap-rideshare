import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  Calendar,
  Car,
  Bike,
  Star,
  X,
  MapPin,
  ChevronRight,
  Filter,
  ShieldCheck,
  ArrowUpDown,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import AutocompleteInput from '../components/AutocompleteInput';
import rideService, { type RideData, type RideSearchParams } from '../services/rideService';
import MapContainerComponent from '../components/MapContainer';

import useSocket from '../context/SocketContext';

export const SearchRides: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { socket } = useSocket();

  // Search parameters
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [vType, setVType] = useState<'bike' | 'car' | ''>('');
  const [seats, setSeats] = useState<number>(1);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minDriverRating, setMinDriverRating] = useState('');
  const [sort, setSort] = useState<RideSearchParams['sort']>('earliest_time');

  const [rides, setRides] = useState<RideData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // Map preview
  const [previewRide, setPreviewRide] = useState<RideData | null>(null);

  const fetchRides = async (searchParams: RideSearchParams = {}) => {
    setLoading(true);
    try {
      const res = await rideService.searchRides(searchParams);
      if (res.status === 'success') {
        setRides(res.data.rides);
        setPreviewRide(null);
      }
    } catch (err) {
      toast.error('Failed to load rides matching filters.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRides();
  }, []);

  // Real-time socket updates for SearchRides page
  useEffect(() => {
    if (!socket) return;

    const handleRideCreated = (newRide: RideData) => {
      if (newRide.status === 'scheduled') {
        setRides((prev) => [newRide, ...prev.filter((r) => r._id !== newRide._id)]);
      }
    };

    const handleRideUpdated = (updatedRide: RideData) => {
      setRides((prev) => {
        if (updatedRide.status !== 'scheduled') {
          return prev.filter((r) => r._id !== updatedRide._id);
        }
        return prev.map((r) => (r._id === updatedRide._id ? updatedRide : r));
      });
    };

    socket.on('ride_created', handleRideCreated);
    socket.on('ride_updated', handleRideUpdated);

    return () => {
      socket.off('ride_created', handleRideCreated);
      socket.off('ride_updated', handleRideUpdated);
    };
  }, [socket]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query: RideSearchParams = {
      source: source || undefined,
      destination: destination || undefined,
      date: date || undefined,
      vehicleType: vType || undefined,
      seats: seats || undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      minDriverRating: minDriverRating ? parseFloat(minDriverRating) : undefined,
      sort,
    };
    fetchRides(query);
    setShowFiltersModal(false);
  };

  const handleClearFilters = () => {
    setSource('');
    setDestination('');
    setDate('');
    setVType('');
    setSeats(1);
    setMinPrice('');
    setMaxPrice('');
    setMinDriverRating('');
    setSort('earliest_time');
    fetchRides();
    setShowFiltersModal(false);
  };

  const activeFiltersCount = [source, destination, date, vType, minPrice, maxPrice, minDriverRating]
    .filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4 py-2 animate-in fade-in duration-300">
      
      {/* Sticky Native Search Header Box */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-md flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-600" />
            Find Campus Commutes
          </h1>
          <button
            onClick={() => setShowFiltersModal(true)}
            className="px-3 py-1.5 rounded-2xl bg-emerald-50 text-emerald-700 font-extrabold text-xs flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-2.5">
          <AutocompleteInput
            label="Pickup"
            placeholder="Search pickup location..."
            value={source}
            onChange={(val) => setSource(val)}
            onSelect={(coords, name) => setSource(name)}
          />
          <AutocompleteInput
            label="Destination"
            placeholder="Search drop location..."
            value={destination}
            onChange={(val) => setDestination(val)}
            onSelect={(coords, name) => setDestination(name)}
          />
        </div>

        <button
          onClick={() => handleSearchSubmit()}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-md shadow-emerald-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
        >
          <Search className="w-4 h-4" />
          <span>Search Available Rides</span>
        </button>
      </div>

      {/* Horizontal Quick Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => { setVType(''); handleSearchSubmit(); }}
          className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold shrink-0 transition-all ${
            vType === '' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          All Vehicles
        </button>
        <button
          onClick={() => { setVType('car'); handleSearchSubmit(); }}
          className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold shrink-0 flex items-center gap-1.5 transition-all ${
            vType === 'car' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          <Car className="w-3.5 h-3.5" />
          Cars
        </button>
        <button
          onClick={() => { setVType('bike'); handleSearchSubmit(); }}
          className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold shrink-0 flex items-center gap-1.5 transition-all ${
            vType === 'bike' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          <Bike className="w-3.5 h-3.5" />
          Bikes
        </button>
        <button
          onClick={() => { setSort('lowest_price'); handleSearchSubmit(); }}
          className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold shrink-0 flex items-center gap-1.5 transition-all ${
            sort === 'lowest_price' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          Cheapest First
        </button>
      </div>

      {/* Map Preview Container if open */}
      {previewRide && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md">
          <div className="bg-slate-900 text-white px-4 py-2.5 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black">Route Map Preview</span>
            </div>
            <button
              onClick={() => setPreviewRide(null)}
              className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-3">
            <MapContainerComponent
              pickupCoords={previewRide.pickupLocation.coordinates}
              dropCoords={previewRide.dropLocation.coordinates}
              pickupAddress={previewRide.pickupLocation.address}
              dropAddress={previewRide.dropLocation.address}
              height="h-56"
            />
          </div>
        </div>
      )}

      {/* Ride Results */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
            Available Rides ({rides.length})
          </span>
          {activeFiltersCount > 0 && (
            <button onClick={handleClearFilters} className="text-[11px] font-extrabold text-rose-600">
              Clear Filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-slate-100 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : rides.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <Car className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-black text-slate-800">No matching rides found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Try adjusting your route filters or clearing search parameters.
            </p>
            <button
              onClick={handleClearFilters}
              className="mt-4 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-black"
            >
              Reset Search Filters
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rides.map((ride) => (
              <div
                key={ride._id}
                onClick={() => navigate(`/ride/${ride._id}`)}
                className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm active:bg-slate-50 transition-all cursor-pointer flex flex-col gap-3"
              >
                {/* Top Row: Driver & Vehicle details */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={ride.driver.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(ride.driver.name)}`}
                      alt="driver"
                      className="w-10 h-10 rounded-full object-cover border border-slate-100"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900">{ride.driver.name}</span>
                        {ride.driver.trustScore >= 90 && (
                          <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded-full">
                            VERIFIED
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-bold">
                        <span className="flex items-center text-amber-500">
                          <Star className="w-3 h-3 fill-amber-400 mr-0.5" />
                          {ride.driver.rating}
                        </span>
                        <span>•</span>
                        <span>{ride.vehicle.brand} {ride.vehicle.model}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-lg font-black text-emerald-600 block leading-tight">₹{ride.price}</span>
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                      {ride.availableSeats} Seats Left
                    </span>
                  </div>
                </div>

                {/* Middle Route Timeline */}
                <div className="bg-slate-50 p-3 rounded-2xl flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-xs font-bold text-slate-800 truncate">{ride.source}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 rounded-full bg-slate-800 shrink-0" />
                      <span className="text-xs font-bold text-slate-800 truncate">{ride.destination}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-2">
                    <span className="text-[10px] font-extrabold text-slate-500 block">
                      {new Date(ride.departureDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-xs font-black text-slate-900 block mt-0.5">{ride.departureTime}</span>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewRide(ride);
                    }}
                    className="text-[11px] font-extrabold text-slate-500 hover:text-emerald-600 flex items-center gap-1"
                  >
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    <span>View Map</span>
                  </button>

                  <button className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-transform flex items-center gap-1">
                    <span>Book Seat</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter Modal */}
      {showFiltersModal && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                Refine Search
              </h3>
              <button onClick={() => setShowFiltersModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar">
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Departure Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Seats Needed
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={seats}
                    onChange={(e) => setSeats(parseInt(e.target.value) || 1)}
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Max Price (₹)
                  </label>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="e.g. 200"
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Sort Results By
                </label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as any)}
                  className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                >
                  <option value="earliest_time">Earliest Departure</option>
                  <option value="lowest_price">Lowest Price</option>
                  <option value="highest_driver_rating">Top Rated Drivers</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={handleClearFilters}
                className="flex-1 py-3 rounded-2xl text-xs font-bold text-slate-500 bg-slate-100"
              >
                Clear All
              </button>
              <button
                onClick={() => handleSearchSubmit()}
                className="flex-1 py-3 rounded-2xl text-xs font-extrabold text-white bg-emerald-600 shadow-md shadow-emerald-600/20"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchRides;

