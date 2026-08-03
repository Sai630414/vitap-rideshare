import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation2, Wifi, WifiOff, MapPin, Clock, ShieldCheck } from 'lucide-react';
import { Socket } from 'socket.io-client';
import locationPermissionService from '../services/locationPermissionService';

// ─── Driver Marker (Smoothly animated gliding pulse icon) ────────────────────
const createDriverMarkerIcon = () => {
  return L.divIcon({
    html: `
      <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;transition:all 0.8s linear;">
        <div style="position:absolute;width:40px;height:40px;border-radius:50%;background:rgba(21,160,97,0.25);animation:liveTrackPulse 1.8s ease-out infinite;"></div>
        <div style="position:absolute;width:24px;height:24px;border-radius:50%;background:#15A061;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.3);z-index:2;display:flex;align-items:center;justify-content:center;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="12" height="12">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
          </svg>
        </div>
      </div>
    `,
    className: 'smooth-driver-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

const driverMarkerIcon = createDriverMarkerIcon();

// ─── Passenger Pickup Marker ──────────────────────────────────────────────────
const pickupIcon = L.divIcon({
  html: `<div style="background:#3B82F6;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// ─── Haversine distance formula ───────────────────────────────────────────────
const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ─── Component to smoothly pan to driver ─────────────────────────────────────
const PanToDriver: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    map.panTo([lat, lng], { animate: true, duration: 1.0 });
  }, [lat, lng, map]);
  return null;
};

interface LiveTrackingMapProps {
  socket: Socket | null;
  rideId: string;
  isDriver: boolean;
  driverId?: string;
  passengerPickupCoords?: [number, number]; // [lng, lat]
  passengerPickupAddress?: string;
  rideStatus?: string;
}

interface DriverLocation {
  lat: number;
  lng: number;
  timestamp: number;
  heading?: number;
  speed?: number;
}

const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({
  socket,
  rideId,
  isDriver,
  driverId,
  passengerPickupCoords,
  passengerPickupAddress,
  rideStatus = 'ongoing',
}) => {
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [trackingActive, setTrackingActive] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [permissionState, setPermissionState] = useState<string>('checking');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const watchIdRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Check permissions on mount ───────────────────────────────────────────
  useEffect(() => {
    const initPermission = async () => {
      try {
        const state = await locationPermissionService.checkPermissionStatus();
        setPermissionState(state);
      } catch (err) {
        setPermissionState('prompt');
      }
    };
    initPermission();
  }, []);

  // ─── PASSENGER: Join tracking room and listen for driver location ───────────
  useEffect(() => {
    if (!socket || isDriver) return;

    socket.emit('passenger_join_tracking', { rideId });

    socket.on('driver_location', (data: DriverLocation) => {
      setDriverLocation(data);
      setTrackingActive(true);

      // Calculate ETA & distance if passenger pickup coords are provided
      if (passengerPickupCoords && passengerPickupCoords.length === 2) {
        const km = haversineKm(data.lat, data.lng, passengerPickupCoords[1], passengerPickupCoords[0]);
        const formattedKm = parseFloat(km.toFixed(1));
        setDistanceKm(formattedKm);
        
        // Calculate ETA assuming 30 km/h average speed in city/campus
        const mins = Math.max(1, Math.round((km / 30) * 60));
        setEtaMinutes(mins);
      }
    });

    socket.on('tracking_stopped', () => {
      setTrackingActive(false);
      setDriverLocation(null);
    });

    return () => {
      socket.off('driver_location');
      socket.off('tracking_stopped');
    };
  }, [socket, rideId, isDriver, passengerPickupCoords]);

  // ─── DRIVER: Request permission & start sharing location ───────────────────
  const startSharing = async () => {
    if (!socket) return;
    setGpsLoading(true);
    setLocationError(null);

    try {
      const status = await locationPermissionService.requestPermissions();
      setPermissionState(status);

      if (status !== 'granted') {
        setGpsLoading(false);
        if (status === 'permanently-denied') {
          setLocationError('Location permission permanently denied. Please enable in device App Settings.');
        } else {
          setLocationError('Location access is required for passengers to track your arrival.');
        }
        return;
      }

      socket.emit('driver_start_tracking', { rideId, driverId });

      const sendLocationUpdate = async () => {
        try {
          const coords = await locationPermissionService.getCurrentPosition();
          setGpsLoading(false);
          socket.emit('driver_location_update', {
            rideId,
            driverId,
            lat: coords.latitude,
            lng: coords.longitude,
            heading: coords.heading ?? undefined,
            speed: coords.speed ? Math.round(coords.speed * 3.6) : undefined,
          });
          setDriverLocation({ lat: coords.latitude, lng: coords.longitude, timestamp: Date.now() });
        } catch (err: any) {
          setGpsLoading(false);
          setLocationError(err.message || 'GPS location update failed.');
        }
      };

      await sendLocationUpdate();
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(sendLocationUpdate, 4000);
      setIsSharing(true);
    } catch (err: any) {
      setGpsLoading(false);
      setLocationError(err.message || 'Unable to start location tracking.');
    }
  };

  const stopSharing = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (watchIdRef.current) {
      locationPermissionService.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (socket) {
      socket.emit('driver_stop_tracking', { rideId });
    }
    setIsSharing(false);
  };

  // Automatically start sharing driver location when ride is ongoing
  useEffect(() => {
    if (isDriver && rideStatus === 'ongoing' && socket && !isSharing) {
      startSharing();
    }
  }, [isDriver, rideStatus, socket]);

  useEffect(() => {
    return () => {
      stopSharing();
    };
  }, []);

  // Auto-start location broadcasting if driver and ride is active
  useEffect(() => {
    if (isDriver && rideStatus === 'ongoing') {
      startSharing();
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (isDriver && socket) {
        socket.emit('driver_stop_tracking', { rideId });
      }
    };
  }, [isDriver, rideId, rideStatus]);

  // Default center — VIT-AP Campus
  const defaultCenter: [number, number] = [16.4971, 80.4992];

  return (
    <div className="flex flex-col gap-2.5">
      
      {/* Driver Control Status Banner */}
      {isDriver && (
        <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isSharing ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            <div>
              <p className="text-xs font-black text-slate-800">
                {isSharing ? 'Live GPS Broadcast Active' : 'Location Broadcast Paused'}
              </p>
              <p className="text-[10px] font-bold text-slate-400">Emitting coordinates every 4 seconds</p>
            </div>
          </div>

          <button
            onClick={isSharing ? stopSharing : startSharing}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-transform active:scale-95 ${
              isSharing
                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                : 'bg-emerald-600 text-white shadow-sm'
            }`}
          >
            {isSharing ? 'Pause Sharing' : 'Start Sharing'}
          </button>
        </div>
      )}

      {/* Passenger Status & ETA Banner */}
      {!isDriver && (
        <div className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-between">
          {trackingActive ? (
            <div className="flex items-center gap-2.5 w-full justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-emerald-600 animate-pulse" />
                <div>
                  <span className="text-xs font-black text-slate-900 block">Driver Location Live</span>
                  <span className="text-[9px] font-bold text-emerald-600">Updated in real-time</span>
                </div>
              </div>

              {distanceKm !== null && (
                <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-xs font-black text-slate-800">{distanceKm} km</span>
                  </div>
                  {etaMinutes !== null && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-xs font-black text-amber-600">{etaMinutes} mins ETA</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-500">Waiting for driver live location signal...</span>
            </div>
          )}
        </div>
      )}

      {/* Interactive Map View */}
      <div className="relative w-full h-[320px] bg-slate-100 border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <MapContainer
          center={
            driverLocation
              ? [driverLocation.lat, driverLocation.lng]
              : defaultCenter
          }
          zoom={15}
          scrollWheelZoom={true}
          className="w-full h-full z-10"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Driver's live marker */}
          {driverLocation && (
            <>
              <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverMarkerIcon}>
                <Popup>
                  <div className="p-1">
                    <p className="font-bold text-emerald-600 text-xs">Driver's Live Location</p>
                    <p className="text-[10px] text-slate-500">Updated: {new Date(driverLocation.timestamp).toLocaleTimeString()}</p>
                  </div>
                </Popup>
              </Marker>
              <PanToDriver lat={driverLocation.lat} lng={driverLocation.lng} />
            </>
          )}

          {/* Passenger pickup point */}
          {passengerPickupCoords && passengerPickupCoords.length === 2 && (
            <Marker position={[passengerPickupCoords[1], passengerPickupCoords[0]]} icon={pickupIcon}>
              <Popup>
                <div className="p-1">
                  <p className="font-bold text-blue-600 text-xs">Pickup Location</p>
                  <p className="text-[10px] text-slate-500">{passengerPickupAddress || 'Pickup Point'}</p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Pulse CSS for driver marker */}
        <style>{`
          @keyframes liveTrackPulse {
            0% { transform: scale(1); opacity: 0.8; }
            100% { transform: scale(2.2); opacity: 0; }
          }
          .smooth-driver-marker {
            transition: transform 0.8s linear, left 0.8s linear, top 0.8s linear;
          }
        `}</style>

        {/* Overlay when waiting for location */}
        {!driverLocation && !isDriver && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] z-20">
            <div className="bg-white/90 px-4 py-3 rounded-2xl shadow-lg border border-white text-center flex flex-col items-center gap-1.5">
              <Navigation2 className="w-6 h-6 text-emerald-600 animate-spin" />
              <p className="text-xs font-black text-slate-800">Connecting Live Location Signal</p>
              <p className="text-[10px] text-slate-400">Driver location will appear automatically</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveTrackingMap;
