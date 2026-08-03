import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation2, Wifi, WifiOff, MapPin, Clock } from 'lucide-react';
import { Socket } from 'socket.io-client';

// ─── Driver Marker (animated pulse) ──────────────────────────────────────────
const driverMarkerIcon = L.divIcon({
  html: `
    <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;width:36px;height:36px;border-radius:50%;background:rgba(124,58,237,0.3);animation:liveTrackPulse 1.5s ease-out infinite;"></div>
      <div style="position:absolute;width:20px;height:20px;border-radius:50%;background:#7c3aed;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);z-index:2;display:flex;align-items:center;justify-content:center;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="10" height="10"><path d="M5 3l3.057-3 11.943 12-11.943 12-3.057-3 9-9z"/></svg>
      </div>
    </div>
  `,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
});

// ─── Passenger Pickup Marker ──────────────────────────────────────────────────
const pickupIcon = L.divIcon({
  html: `<div style="background:#10B981;width:14px;height:14px;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
  className: '',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
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
    map.panTo([lat, lng], { animate: true, duration: 0.8 });
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
}

interface DriverLocation {
  lat: number;
  lng: number;
  timestamp: number;
}

const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({
  socket,
  rideId,
  isDriver,
  driverId,
  passengerPickupCoords,
  passengerPickupAddress,
}) => {
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [trackingActive, setTrackingActive] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── PASSENGER: Join tracking room and listen for driver location ───────────
  useEffect(() => {
    if (!socket || isDriver) return;

    socket.emit('passenger_join_tracking', { rideId });

    socket.on('driver_location', (data: DriverLocation) => {
      setDriverLocation(data);
      setTrackingActive(true);

      // Calculate ETA if passenger pickup is known
      if (passengerPickupCoords) {
        const km = haversineKm(data.lat, data.lng, passengerPickupCoords[1], passengerPickupCoords[0]);
        setDistanceKm(parseFloat(km.toFixed(1)));
        setEtaMinutes(Math.max(1, Math.round((km / 30) * 60))); // assume 30 km/h avg speed
      }
    });

    socket.on('tracking_stopped', () => {
      setTrackingActive(false);
    });

    return () => {
      socket.off('driver_location');
      socket.off('tracking_stopped');
    };
  }, [socket, rideId, isDriver, passengerPickupCoords]);

  // ─── DRIVER: Share location every 5 seconds ─────────────────────────────────
  const startSharing = () => {
    if (!socket || !navigator.geolocation) return;

    socket.emit('driver_start_tracking', { rideId, driverId });

    const shareLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng, heading, speed } = pos.coords;
          socket.emit('driver_location_update', {
            rideId,
            driverId,
            lat,
            lng,
            heading: heading ?? undefined,
            speed: speed ? Math.round(speed * 3.6) : undefined, // m/s -> km/h
          });
          setDriverLocation({ lat, lng, timestamp: Date.now() });
        },
        (err) => console.warn('Geolocation error:', err),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    };

    shareLocation(); // immediate
    intervalRef.current = setInterval(shareLocation, 5000);
    setIsSharing(true);
  };

  const stopSharing = () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (intervalRef.current !== null) clearInterval(intervalRef.current);
    socket?.emit('driver_stop_tracking', { rideId });
    setIsSharing(false);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Default center — VIT-AP
  const defaultCenter: [number, number] = [16.4971, 80.4992];

  return (
    <div className="flex flex-col gap-3">
      {/* Driver controls */}
      {isDriver && (
        <div className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
          <div className={`w-2.5 h-2.5 rounded-full ${isSharing ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
          <p className="text-xs text-zinc-300 flex-1">
            {isSharing ? 'Sharing your location with passengers (every 5s)' : 'Start sharing your location so passengers can track you'}
          </p>
          <button
            onClick={isSharing ? stopSharing : startSharing}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isSharing
                ? 'bg-red-950/50 text-red-400 border border-red-800/50 hover:bg-red-900/50'
                : 'bg-violet-600 text-white hover:bg-violet-500'
            }`}
          >
            {isSharing ? 'Stop Sharing' : 'Share Live Location'}
          </button>
        </div>
      )}

      {/* Passenger status bar */}
      {!isDriver && (
        <div className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
          {trackingActive ? (
            <>
              <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-300 flex-1">Live tracking active</p>
              {distanceKm !== null && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-violet-400" />
                    <span className="text-xs font-bold text-violet-300">{distanceKm} km</span>
                  </div>
                  {etaMinutes !== null && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span className="text-xs font-bold text-amber-300">{etaMinutes} min</span>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-zinc-500 shrink-0" />
              <p className="text-xs text-zinc-400">Waiting for driver to share location...</p>
            </>
          )}
        </div>
      )}

      {/* Map */}
      <div className="relative w-full h-[350px] bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
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
                    <p className="font-semibold text-violet-600 text-sm">Driver's Live Location</p>
                    <p className="text-xs text-zinc-500">Updated: {new Date(driverLocation.timestamp).toLocaleTimeString()}</p>
                  </div>
                </Popup>
              </Marker>
              <PanToDriver lat={driverLocation.lat} lng={driverLocation.lng} />
            </>
          )}

          {/* Passenger pickup point (shown on driver's map) */}
          {isDriver && passengerPickupCoords && (
            <Marker position={[passengerPickupCoords[1], passengerPickupCoords[0]]} icon={pickupIcon}>
              <Popup>
                <div className="p-1">
                  <p className="font-semibold text-emerald-600 text-xs">Pickup Point</p>
                  <p className="text-xs text-zinc-500">{passengerPickupAddress || 'Passenger pickup'}</p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* CSS animation for pulsing driver marker */}
        <style>{`
          @keyframes liveTrackPulse {
            0% { transform: scale(1); opacity: 0.8; }
            100% { transform: scale(2.5); opacity: 0; }
          }
        `}</style>

        {/* No driver location overlay */}
        {!driverLocation && !isDriver && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/60 z-20">
            <div className="text-center">
              <Navigation2 className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
              <p className="text-xs text-zinc-400">Waiting for driver to start sharing location</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveTrackingMap;
