import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  Calendar,
  Users,
  Car,
  Bike,
  Star,
  MapPin,
  Clock,
  ArrowRight,
  TrendingDown,
  Sparkles,
  Filter,
  X,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import AutocompleteInput from '../components/AutocompleteInput';
import Badge from '../components/ui/Badge';
import rideService, { type RideData, type RideSearchParams } from '../services/rideService';
import MapContainerComponent from '../components/MapContainer';

export const SearchRides: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

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
  const [filtersExpanded, setFiltersExpanded] = useState(false);

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
  };

  const activeFiltersCount = [source, destination, date, vType, minPrice, maxPrice, minDriverRating]
    .filter(Boolean).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-sans">
          Find Campus Rides
        </h1>
        {activeFiltersCount > 0 && (
          <Badge variant="primary" className="flex items-center gap-1">
            <Filter className="w-3 h-3" />
            {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} active
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Filter Card */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader className="border-b border-zinc-850 pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <SlidersHorizontal className="w-5 h-5 text-violet-400" />
              Advanced Filters
            </CardTitle>
            <CardDescription>Narrow down routes and pricing</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4">
              <AutocompleteInput
                label="Leaving From"
                placeholder="Block 1, Chennai Main gate, etc."
                value={source}
                onChange={(val) => setSource(val)}
                onSelect={(coords, name) => setSource(name)}
              />
              <AutocompleteInput
                label="Going To"
                placeholder="Vijayawada, Guntur, Hostel, etc."
                value={destination}
                onChange={(val) => setDestination(val)}
                onSelect={(coords, name) => setDestination(name)}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase">Departure Date</label>
                <div className="relative flex items-center">
                  <Calendar className="absolute left-4 w-4 h-4 text-zinc-500" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-150 focus:outline-none focus:ring-2 focus:ring-violet-600 transition-all text-sm light:bg-white light:border-zinc-300 light:text-zinc-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Required Seats</label>
                  <div className="relative flex items-center">
                    <Users className="absolute left-4 w-4 h-4 text-zinc-500" />
                    <input
                      type="number"
                      value={seats}
                      onChange={(e) => setSeats(parseInt(e.target.value) || 1)}
                      min={1}
                      max={8}
                      className="w-full pl-11 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-150 focus:outline-none focus:ring-2 focus:ring-violet-600 transition-all text-sm light:bg-white light:border-zinc-300 light:text-zinc-900"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Vehicle Type</label>
                  <select
                    value={vType}
                    onChange={(e) => setVType(e.target.value as any)}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-150 focus:outline-none focus:ring-2 focus:ring-violet-600 transition-all text-sm light:bg-white light:border-zinc-300 light:text-zinc-900"
                  >
                    <option value="">Any Vehicle</option>
                    <option value="car">Car Only</option>
                    <option value="bike">Bike Only</option>
                  </select>
                </div>
              </div>

              {/* Price Range */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Min Price (₹)"
                  placeholder="0"
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
                <Input
                  label="Max Price (₹)"
                  placeholder="500"
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>

              {/* Min Driver Rating (Feature 7) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  Min Driver Rating
                </label>
                <select
                  value={minDriverRating}
                  onChange={(e) => setMinDriverRating(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-150 focus:outline-none focus:ring-2 focus:ring-violet-600 transition-all text-sm"
                >
                  <option value="">Any Rating</option>
                  <option value="4.5">⭐⭐⭐⭐⭐ 4.5+</option>
                  <option value="4">⭐⭐⭐⭐ 4.0+</option>
                  <option value="3.5">⭐⭐⭐⭐ 3.5+</option>
                  <option value="3">⭐⭐⭐ 3.0+</option>
                </select>
              </div>

              {/* Sort Options */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase">Sort Results</label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as any)}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-150 focus:outline-none focus:ring-2 focus:ring-violet-600 transition-all text-sm light:bg-white light:border-zinc-300"
                >
                  <option value="earliest_time">🕐 Earliest Departure</option>
                  <option value="lowest_price">💰 Lowest Price</option>
                  <option value="highest_driver_rating">⭐ Highest Rated Driver</option>
                  <option value="recently_posted">🆕 Recently Posted</option>
                </select>
              </div>

              <div className="flex gap-3 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={handleClearFilters}
                >
                  <X className="w-3 h-3 mr-1" />
                  Reset
                </Button>
                <Button type="submit" className="flex-1 text-xs">
                  <Search className="w-3 h-3 mr-1" />
                  Apply Filters
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Right Listings Area */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Inline Map Preview */}
          {previewRide && (
            <Card className="overflow-hidden border-violet-500/30">
              <CardHeader className="bg-zinc-950 p-4 border-b border-zinc-850 flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="text-sm font-bold">Route Visualizer</CardTitle>
                  <CardDescription className="text-[10px]">
                    From {previewRide.source} to {previewRide.destination}
                  </CardDescription>
                </div>
                <button
                  onClick={() => setPreviewRide(null)}
                  className="text-[10px] font-bold text-red-400 hover:text-red-300 uppercase shrink-0"
                >
                  Close Preview
                </button>
              </CardHeader>
              <MapContainerComponent
                pickupCoords={previewRide.pickupLocation.coordinates}
                dropCoords={previewRide.dropLocation.coordinates}
                pickupAddress={previewRide.pickupLocation.address}
                dropAddress={previewRide.dropLocation.address}
              />
            </Card>
          )}

          {loading ? (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-zinc-900 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : rides.length === 0 ? (
            <div className="text-center py-20 bg-zinc-900 border border-zinc-800 rounded-2xl">
              <Car className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-zinc-300">No scheduled rides found</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                No matching drivers have offered a ride with these search criteria. Try modifying your source, destination, or dates.
              </p>
              <Button onClick={handleClearFilters} variant="secondary" size="sm" className="mt-6 text-xs">
                Reset Search Filters
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-zinc-500">{rides.length} ride{rides.length !== 1 ? 's' : ''} found</p>
              {rides.map((ride) => (
                <Card
                  key={ride._id}
                  className={`hover:border-zinc-800 border transition-all ${
                    previewRide?._id === ride._id ? 'border-violet-500/50' : 'border-zinc-850'
                  }`}
                >
                  <CardContent className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex-1 min-w-0">
                      {/* Top badges */}
                      <div className="flex items-center gap-2 flex-wrap text-[10px] uppercase font-bold text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          {new Date(ride.departureDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                          {' '}at {ride.departureTime}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          {ride.vehicle.type === 'car' ? (
                            <Car className="w-3.5 h-3.5 text-zinc-500" />
                          ) : (
                            <Bike className="w-3.5 h-3.5 text-zinc-500" />
                          )}
                          {ride.vehicle.brand} {ride.vehicle.model}
                        </span>
                      </div>

                      {/* Route */}
                      <div className="flex items-center gap-2 mt-3 text-base font-extrabold text-zinc-150">
                        <span>{ride.source}</span>
                        <ArrowRight className="w-4 h-4 text-zinc-500 shrink-0" />
                        <span>{ride.destination}</span>
                      </div>

                      {/* Driver row */}
                      <div className="flex items-center gap-4 mt-4">
                        <img
                          src={ride.driver.profileImage || 'https://api.dicebear.com/7.x/initials/svg?seed=driver'}
                          className="w-9 h-9 rounded-full object-cover border border-zinc-700/50"
                          alt=""
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                            {ride.driver.name}
                            {ride.driver.trustScore >= 90 && (
                              <Badge variant="primary" className="py-0 px-1 text-[8px]">
                                Trusted
                              </Badge>
                            )}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-400">
                            {/* Star rating display */}
                            <span className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-2.5 h-2.5 ${
                                    s <= Math.round(ride.driver.rating)
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-zinc-700'
                                  }`}
                                />
                              ))}
                              <span className="ml-1 text-amber-400 font-bold">{ride.driver.rating}</span>
                            </span>
                            <span>•</span>
                            <span>Trust: {ride.driver.trustScore}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: price, seats, actions */}
                    <div className="flex md:flex-col items-end gap-3.5 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-zinc-850 justify-between md:justify-center shrink-0">
                      <div className="text-right">
                        <p className="text-[10px] text-zinc-500">Splitted cost</p>
                        <p className="text-lg font-black text-violet-400 mt-0.5">₹{ride.price}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          {ride.availableSeats} seat(s) left
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs py-1.5 h-auto"
                          onClick={() => setPreviewRide(ride)}
                        >
                          Route
                        </Button>
                        <Button
                          size="sm"
                          className="text-xs py-1.5 h-auto"
                          onClick={() => navigate(`/ride/${ride._id}`)}
                        >
                          Book Seats
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchRides;
