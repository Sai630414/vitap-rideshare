import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import {
  MapPin,
  Calendar,
  Clock,
  CircleDollarSign,
  Users,
  AlertCircle,
  Plus,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import vehicleService, { type VehicleData } from '../services/vehicleService';
import rideService from '../services/rideService';
import MapContainerComponent from '../components/MapContainer';
import AutocompleteInput from '../components/AutocompleteInput';

export const OfferRide: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Driver vehicle states
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  // Form states
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [price, setPrice] = useState('');
  const [seats, setSeats] = useState<number>(1);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  // Map Coordinates selection state
  const [pickupCoords, setPickupCoords] = useState<[number, number] | undefined>(undefined);
  const [dropCoords, setDropCoords] = useState<[number, number] | undefined>(undefined);
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropAddress, setDropAddress] = useState('');

  // Fetch driver's verified vehicles
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await vehicleService.getMyVehicles();
        if (res.status === 'success') {
          // Filter only verified vehicles
          const verifiedOnly = res.data.vehicles.filter((v: any) => v.status === 'verified');
          setVehicles(verifiedOnly);
          if (verifiedOnly.length > 0) {
            setSelectedVehicleId(verifiedOnly[0]._id);
            setSeats(verifiedOnly[0].seats);
          }
        }
      } catch (err) {
        console.error('Failed to load vehicles:', err);
      } finally {
        setLoadingVehicles(false);
      }
    };
    fetchVehicles();
  }, []);

  const handleVehicleChange = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    const selected = vehicles.find((v) => v._id === vehicleId);
    if (selected) {
      setSeats(selected.seats);
    }
  };

  // Map coordinates selection callback
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

  const handleResetCoords = () => {
    setPickupCoords(undefined);
    setDropCoords(undefined);
    setPickupAddress('');
    setDropAddress('');
  };

  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId) {
      toast.error('Please register and select a verified vehicle first.');
      return;
    }
    if (!pickupCoords || !dropCoords) {
      toast.error('Please click on the map to set both pickup and drop coordinates.');
      return;
    }
    if (!source || !destination || !departureDate || !departureTime || !price) {
      toast.error('Please complete all form fields.');
      return;
    }

    setLoading(true);
    try {
      const response = await rideService.offerRide({
        vehicleId: selectedVehicleId,
        source,
        destination,
        pickupLocation: {
          address: pickupAddress || source,
          coordinates: pickupCoords,
        },
        dropLocation: {
          address: dropAddress || destination,
          coordinates: dropCoords,
        },
        departureDate,
        departureTime,
        price: parseFloat(price),
        availableSeats: seats,
        description,
        recurring: { isRecurring: false },
      });

      if (response.status === 'success') {
        toast.success('🎉 Your ride offer has been listed successfully.');
        navigate('/dashboard');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to list ride offer.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingVehicles) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Guard: If driver has no approved vehicles, block listing a ride
  if (vehicles.length === 0) {
    return (
      <div className="flex flex-col gap-6 max-w-xl mx-auto items-center text-center py-16">
        <div className="p-4 bg-amber-950/40 border border-amber-800/30 text-amber-400 rounded-full mb-2">
          <AlertCircle className="w-10 h-10 animate-pulse" />
        </div>
        <h2 className="text-xl font-bold text-zinc-200">No Verified Vehicles Found</h2>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          You must register a vehicle and upload its Registration Certificate (RC) scan. Once an administrator approves your vehicle, you'll be authorized to list ride offers.
        </p>
        <Link to="/profile" className="mt-6">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Register Vehicle RC
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-sans">
        Offer a Ride
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Input Details Form (span 1) */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader className="border-b border-zinc-850 pb-4">
            <CardTitle className="text-base">Trip Details</CardTitle>
            <CardDescription>Setup pricing and route names</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleOfferSubmit} className="flex flex-col gap-4">
              {/* Vehicle Select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-zinc-300">Select Vehicle</label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-150 focus:outline-none focus:ring-2 focus:ring-violet-600 transition-all text-sm light:bg-white light:border-zinc-300"
                >
                  {vehicles.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.brand} {v.model} ({v.numberPlate}) - max {v.seats} seats
                    </option>
                  ))}
                </select>
              </div>

              <AutocompleteInput
                label="Leaving From (Pickup Address)"
                placeholder="e.g. Hostels gate, Block 1"
                value={source}
                onChange={(val) => setSource(val)}
                onSelect={(coords, name) => {
                  setPickupCoords(coords);
                  setPickupAddress(name);
                }}
                required
              />

              <AutocompleteInput
                label="Going To (Drop Address)"
                placeholder="e.g. Vijayawada Railway Station"
                value={destination}
                onChange={(val) => setDestination(val)}
                onSelect={(coords, name) => {
                  setDropCoords(coords);
                  setDropAddress(name);
                }}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Departure Date</label>
                  <div className="relative flex items-center">
                    <Calendar className="absolute left-4 w-4 h-4 text-zinc-500" />
                    <input
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-150 focus:outline-none focus:ring-2 focus:ring-violet-600 transition-all text-sm light:bg-white light:border-zinc-300 light:text-zinc-900"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Departure Time</label>
                  <div className="relative flex items-center">
                    <Clock className="absolute left-4 w-4 h-4 text-zinc-500" />
                    <input
                      type="time"
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-150 focus:outline-none focus:ring-2 focus:ring-violet-600 transition-all text-sm light:bg-white light:border-zinc-300 light:text-zinc-900"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Price per Seat (₹)"
                  placeholder="e.g. 150"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  icon={<CircleDollarSign className="w-4 h-4 text-zinc-500" />}
                  required
                />

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-zinc-300">Available Seats</label>
                  <div className="relative flex items-center">
                    <Users className="absolute left-4 w-4 h-4 text-zinc-500" />
                    <input
                      type="number"
                      value={seats}
                      onChange={(e) => setSeats(parseInt(e.target.value) || 1)}
                      className="w-full pl-11 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-150 focus:outline-none focus:ring-2 focus:ring-violet-600 transition-all text-sm light:bg-white light:border-zinc-300"
                      min={1}
                      max={vehicles.find((v) => v._id === selectedVehicleId)?.seats || 4}
                      required
                    />
                  </div>
                </div>
              </div>

              <Input
                label="Description/Note (Optional)"
                placeholder="Luggage details, dynamic pickup spots, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <Button type="submit" loading={loading} className="w-full py-3 mt-2">
                List Ride Offer
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right: Map Selector Canvas (span 2) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card className="h-full flex flex-col">
            <CardHeader className="border-b border-zinc-850 pb-4 flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-base">Route Coordinates Selector</CardTitle>
                <CardDescription>Click on the OpenStreetMap canvas to bind coordinates</CardDescription>
              </div>
              {(pickupCoords || dropCoords) && (
                <button
                  onClick={handleResetCoords}
                  className="text-[10px] font-bold text-red-400 hover:text-red-300 uppercase"
                >
                  Reset Pins
                </button>
              )}
            </CardHeader>
            <CardContent className="pt-6 flex-1 flex flex-col gap-4">
              <MapContainerComponent
                pickupCoords={pickupCoords}
                dropCoords={dropCoords}
                pickupAddress={pickupAddress}
                dropAddress={dropAddress}
                interactive={true}
                onSelectCoords={handleMapSelect}
              />

              {/* Displays selected pins info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-xl">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block">Selected Pickup Point</span>
                  <span className="text-xs font-semibold text-zinc-300 mt-1 block truncate">
                    {pickupCoords
                      ? `${pickupAddress} (${pickupCoords[0].toFixed(3)}, ${pickupCoords[1].toFixed(3)})`
                      : 'None - Click Map to Pin'}
                  </span>
                </div>
                <div className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-xl">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block">Selected Drop Point</span>
                  <span className="text-xs font-semibold text-zinc-300 mt-1 block truncate">
                    {dropCoords
                      ? `${dropAddress} (${dropCoords[0].toFixed(3)}, ${dropCoords[1].toFixed(3)})`
                      : 'None - Click Map to Pin'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OfferRide;
