import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation2, Wifi, WifiOff, MapPin, Clock, UserCheck, Users, ExternalLink } from 'lucide-react';
import { Socket } from 'socket.io-client';
import locationPermissionService from '../services/locationPermissionService';

// ─── Distinct Color Themes for Up to 4 Passengers ─────────────────────────────
export const PASSENGER_THEMES = [
  {
    id: 0,
    hex: '#2563EB', // Blue
    borderHex: '#1D4ED8',
    label: 'P1',
    name: 'Blue',
    bgBadge: 'bg-blue-50 text-blue-700 border-blue-200',
    dotBg: 'bg-blue-600',
    btnBg: 'bg-blue-600 hover:bg-blue-700',
  },
  {
    id: 1,
    hex: '#059669', // Emerald Green
    borderHex: '#047857',
    label: 'P2',
    name: 'Emerald',
    bgBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotBg: 'bg-emerald-600',
    btnBg: 'bg-emerald-600 hover:bg-emerald-700',
  },
  {
    id: 2,
    hex: '#7C3AED', // Purple
    borderHex: '#6D28D9',
    label: 'P3',
    name: 'Purple',
    bgBadge: 'bg-purple-50 text-purple-700 border-purple-200',
    dotBg: 'bg-purple-600',
    btnBg: 'bg-purple-600 hover:bg-purple-700',
  },
  {
    id: 3,
    hex: '#D97706', // Amber Orange
    borderHex: '#B45309',
    label: 'P4',
    name: 'Amber',
    bgBadge: 'bg-amber-50 text-amber-700 border-amber-200',
    dotBg: 'bg-amber-600',
    btnBg: 'bg-amber-600 hover:bg-amber-700',
  },
];

// ─── Driver Marker (Green animated pulse gliding icon) ─────────────────────────
const createDriverMarkerIcon = () => {
  return L.divIcon({
    html: `
      <div style="position:relative;width:42px;height:42px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:42px;height:42px;border-radius:50%;background:rgba(16,185,129,0.25);animation:liveTrackPulse 1.8s ease-out infinite;"></div>
        <div style="position:absolute;width:26px;height:26px;border-radius:50%;background:#059669;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.3);z-index:2;display:flex;align-items:center;justify-content:center;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="14" height="14">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
          </svg>
        </div>
      </div>
    `,
    className: 'smooth-driver-marker',
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -21],
  });
};

const driverMarkerIcon = createDriverMarkerIcon();

// ─── Dynamic Passenger Marker Generator ───────────────────────────────────────
const createPassengerMarkerIcon = (colorHex: string, labelText: string) => {
  return L.divIcon({
    html: `
      <div style="position:relative;width:38px;height:38px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:38px;height:38px;border-radius:50%;background:${colorHex}35;animation:liveTrackPulse 1.8s ease-out infinite;"></div>
        <div style="position:absolute;width:24px;height:24px;border-radius:50%;background:${colorHex};border:2.5px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.3);z-index:2;display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:10px;font-family:sans-serif;">
          ${labelText}
        </div>
      </div>
    `,
    className: 'smooth-passenger-marker',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -19],
  });
};

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

// ─── Component to smoothly pan map ───────────────────────────────────────────
const PanToDriver: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    map.panTo([lat, lng], { animate: true, duration: 1.0 });
  }, [lat, lng, map]);
  return null;
};

// ─── Component to fit bounds showing Driver and all Passengers ───────────────
const FitMultiRouteBounds: React.FC<{ points: Array<[number, number]> }> = ({ points }) => {
  const map = useMap();
  const hasFittedRef = useRef(false);

  useEffect(() => {
    if (points.length >= 2 && !hasFittedRef.current) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      hasFittedRef.current = true;
    }
  }, [points, map]);

  return null;
};

export interface PassengerInfo {
  id: string;
  name: string;
  pickupCoords?: [number, number]; // [lng, lat]
  pickupAddress?: string;
}

interface LiveTrackingMapProps {
  socket: Socket | null;
  rideId: string;
  isDriver: boolean;
  driverId?: string;
  currentUserId?: string;
  passengers?: PassengerInfo[];
  passengerPickupCoords?: [number, number]; // Legacy fallback
  passengerPickupAddress?: string;
  rideStatus?: string;
}

interface DriverLocation {
  lat: number;
  lng: number;
  timestamp: number;
}

interface LivePassengerLocation {
  lat: number;
  lng: number;
  passengerName?: string;
  timestamp?: number;
}

const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({
  socket,
  rideId,
  isDriver,
  driverId,
  currentUserId,
  passengers: propPassengers,
  passengerPickupCoords,
  passengerPickupAddress,
  rideStatus = 'ongoing',
}) => {
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [passengerLiveLocations, setPassengerLiveLocations] = useState<
    Record<string, LivePassengerLocation>
  >({});

  const [isSharing, setIsSharing] = useState(false);
  const [trackingActive, setTrackingActive] = useState(false);
  const [permissionState, setPermissionState] = useState<string>('checking');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const passengerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Normalize passengers list (up to 4 passengers)
  const normalizedPassengers: PassengerInfo[] = React.useMemo(() => {
    if (propPassengers && propPassengers.length > 0) {
      return propPassengers.slice(0, 4);
    }
    if (passengerPickupCoords && passengerPickupCoords.length === 2) {
      return [
        {
          id: currentUserId || 'passenger_1',
          name: 'Passenger',
          pickupCoords: passengerPickupCoords,
          pickupAddress: passengerPickupAddress,
        },
      ];
    }
    return [];
  }, [propPassengers, passengerPickupCoords, passengerPickupAddress, currentUserId]);

  // ─── Check location permissions on mount ─────────────────────────────────
  useEffect(() => {
    const initPermission = async () => {
      try {
        const state = await locationPermissionService.checkPermissionStatus();
        setPermissionState(state);
      } catch {
        setPermissionState('prompt');
      }
    };
    initPermission();
  }, []);

  // ─── PASSENGER: Join tracking room & listen for driver location ─────────────
  useEffect(() => {
    if (!socket || isDriver) return;

    socket.emit('passenger_join_tracking', { rideId });

    socket.on('driver_location', (data: DriverLocation) => {
      setDriverLocation(data);
      setTrackingActive(true);
    });

    socket.on('tracking_stopped', () => {
      setTrackingActive(false);
      setDriverLocation(null);
    });

    return () => {
      socket.off('driver_location');
      socket.off('tracking_stopped');
    };
  }, [socket, rideId, isDriver]);

  // ─── LISTEN: Receive live location updates from passengers via socket ───────
  useEffect(() => {
    if (!socket) return;

    const handlePassengerLoc = (data: {
      passengerId?: string;
      passengerName?: string;
      lat: number;
      lng: number;
      timestamp?: number;
    }) => {
      const pId = data.passengerId || 'default_passenger';
      setPassengerLiveLocations((prev) => ({
        ...prev,
        [pId]: {
          lat: data.lat,
          lng: data.lng,
          passengerName: data.passengerName,
          timestamp: data.timestamp,
        },
      }));
    };

    socket.on('passenger_location', handlePassengerLoc);
    return () => {
      socket.off('passenger_location', handlePassengerLoc);
    };
  }, [socket]);

  // ─── PASSENGER: Broadcast live position periodically when ride is ongoing ───
  useEffect(() => {
    if (isDriver || rideStatus !== 'ongoing' || !socket) return;

    const updatePassengerLocation = async () => {
      try {
        const coords = await locationPermissionService.getCurrentPosition();
        const pId = currentUserId || 'passenger_1';
        setPassengerLiveLocations((prev) => ({
          ...prev,
          [pId]: { lat: coords.latitude, lng: coords.longitude },
        }));
        socket.emit('passenger_location_update', {
          rideId,
          passengerId: pId,
          lat: coords.latitude,
          lng: coords.longitude,
        });
      } catch (err) {
        // Fallback silently if GPS unavailable
      }
    };

    updatePassengerLocation();
    if (passengerIntervalRef.current) clearInterval(passengerIntervalRef.current);
    passengerIntervalRef.current = setInterval(updatePassengerLocation, 5000);

    return () => {
      if (passengerIntervalRef.current) {
        clearInterval(passengerIntervalRef.current);
        passengerIntervalRef.current = null;
      }
    };
  }, [isDriver, rideStatus, socket, rideId, currentUserId]);

  // ─── DRIVER: Request permission & broadcast driver location ──────────────
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
          setLocationError('Location permission permanently denied. Enable in device App Settings.');
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
    if (socket) {
      socket.emit('driver_stop_tracking', { rideId });
    }
    setIsSharing(false);
  };

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

  const requestPassengerPermission = async () => {
    try {
      const status = await locationPermissionService.requestPermissions();
      setPermissionState(status);
      if (status === 'granted') {
        const coords = await locationPermissionService.getCurrentPosition();
        const pId = currentUserId || 'passenger_1';
        setPassengerLiveLocations((prev) => ({
          ...prev,
          [pId]: { lat: coords.latitude, lng: coords.longitude },
        }));
        if (socket) {
          socket.emit('passenger_location_update', {
            rideId,
            passengerId: pId,
            lat: coords.latitude,
            lng: coords.longitude,
          });
        }
      }
    } catch (err: any) {
      console.warn('Passenger location permission request error:', err);
    }
  };

  // ─── Calculate Passenger Position & Distance Details ──────────────────────
  const resolvedPassengers = normalizedPassengers.map((p, index) => {
    const theme = PASSENGER_THEMES[index % 4];
    const liveLoc = passengerLiveLocations[p.id];
    let pos: [number, number] | null = null;

    if (liveLoc) {
      pos = [liveLoc.lat, liveLoc.lng];
    } else if (p.pickupCoords && p.pickupCoords.length === 2) {
      pos = [p.pickupCoords[1], p.pickupCoords[0]];
    }

    let distKm: number | null = null;
    let etaMins: number | null = null;

    if (driverLocation && pos) {
      distKm = parseFloat(haversineKm(driverLocation.lat, driverLocation.lng, pos[0], pos[1]).toFixed(1));
      etaMins = Math.max(1, Math.round((distKm / 30) * 60));
    }

    return {
      ...p,
      theme,
      pos,
      isLive: !!liveLoc,
      distKm,
      etaMins,
    };
  });

  // Filter passengers visible to the current viewer:
  // - Driver sees ALL passengers
  // - Passenger ONLY sees himself/herself
  const visiblePassengers = isDriver
    ? resolvedPassengers
    : resolvedPassengers.filter((p) => !currentUserId || p.id === currentUserId);

  const activeVisiblePassengers = visiblePassengers.length > 0 ? visiblePassengers : resolvedPassengers.slice(0, 1);

  // All map bounds points (Driver + Passengers)
  const allMapPoints: Array<[number, number]> = [];
  if (driverLocation) allMapPoints.push([driverLocation.lat, driverLocation.lng]);
  activeVisiblePassengers.forEach((p) => {
    if (p.pos) allMapPoints.push(p.pos);
  });

  const defaultCenter: [number, number] = [16.4971, 80.4992];

  return (
    <div className="flex flex-col gap-2.5">
      {/* Passenger Permission Prompt Banner */}
      {!isDriver && permissionState !== 'granted' && (
        <div className="flex items-center justify-between p-3 bg-blue-50/80 border border-blue-200 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600 animate-bounce" />
            <div>
              <p className="text-xs font-black text-slate-900">Enable Live GPS Location</p>
              <p className="text-[10px] text-slate-500 font-bold">Allows driver to track your pickup point</p>
            </div>
          </div>
          <button
            onClick={requestPassengerPermission}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-transform shrink-0"
          >
            Allow GPS
          </button>
        </div>
      )}

      {/* Driver GPS Status Banner */}
      {isDriver && (
        <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isSharing ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            <div>
              <p className="text-xs font-black text-slate-800">
                {isSharing ? 'Live GPS Broadcast Active' : 'Location Broadcast Paused'}
              </p>
              <p className="text-[10px] font-bold text-slate-400">
                Tracking {resolvedPassengers.length} passenger{resolvedPassengers.length > 1 ? 's' : ''} on live map
              </p>
            </div>
          </div>

          <button
            onClick={isSharing ? stopSharing : startSharing}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-transform active:scale-95 ${
              isSharing ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-emerald-600 text-white shadow-sm'
            }`}
          >
            {isSharing ? 'Pause Sharing' : 'Start Sharing'}
          </button>
        </div>
      )}

      {/* Driver Turn-by-Turn GPS Links per passenger */}
      {isDriver && resolvedPassengers.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1 flex items-center gap-1">
            <Navigation2 className="w-3 h-3 text-emerald-600" />
            Turn-by-Turn Google Maps Navigation
          </span>
          <div className="flex flex-wrap gap-1.5">
            {resolvedPassengers.map((p) => {
              if (!p.pos) return null;
              return (
                <a
                  key={p.id}
                  href={`https://www.google.com/maps/dir/?api=1&destination=${p.pos[0]},${p.pos[1]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-3 py-2 ${p.theme.btnBg} text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95`}
                >
                  <Navigation2 className="w-3.5 h-3.5" />
                  <span>Navigate {p.theme.label}: {p.name.split(' ')[0]}</span>
                  <ExternalLink className="w-3 h-3 text-white/80" />
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Multi-Passenger Status Bar */}
      <div className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isDriver ? (
              <>
                <Users className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-black text-slate-900">
                  Passengers ({resolvedPassengers.length})
                </span>
              </>
            ) : trackingActive ? (
              <>
                <Wifi className="w-4 h-4 text-emerald-600 animate-pulse" />
                <span className="text-xs font-black text-slate-900">Driver Location Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-500">Waiting for driver signal...</span>
              </>
            )}
          </div>
        </div>

        {/* Passenger Color Badges Legend */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
          {activeVisiblePassengers.map((p) => (
            <div
              key={p.id}
              className={`px-2.5 py-1 rounded-xl border text-[10px] font-extrabold flex items-center gap-1.5 ${p.theme.bgBadge}`}
            >
              <span className={`w-2 h-2 rounded-full ${p.theme.dotBg} animate-pulse`} />
              <span>{p.theme.label}: {p.name}</span>
              {p.distKm !== null && (
                <span className="font-black text-slate-700">({p.distKm} km • {p.etaMins} mins)</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Leaflet Map View */}
      <div className="relative w-full h-[360px] bg-slate-100 border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <MapContainer
          center={
            driverLocation
              ? [driverLocation.lat, driverLocation.lng]
              : allMapPoints.length > 0
              ? allMapPoints[0]
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

          {/* Driver's Live Gliding Marker */}
          {driverLocation && (
            <>
              <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverMarkerIcon}>
                <Popup>
                  <div className="p-1">
                    <p className="font-black text-emerald-600 text-xs">Driver Vehicle</p>
                    <p className="text-[10px] text-slate-500">
                      Updated: {new Date(driverLocation.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </Popup>
              </Marker>
              {isDriver && <PanToDriver lat={driverLocation.lat} lng={driverLocation.lng} />}
            </>
          )}

          {/* Passenger Markers & Polylines */}
          {activeVisiblePassengers.map((p) => {
            if (!p.pos) return null;
            const markerIcon = createPassengerMarkerIcon(p.theme.hex, p.theme.label);

            return (
              <React.Fragment key={p.id}>
                {/* Passenger Unique Marker */}
                <Marker position={p.pos} icon={markerIcon}>
                  <Popup>
                    <div className="p-1">
                      <p className="font-black text-xs" style={{ color: p.theme.hex }}>
                        {p.theme.label}: {p.name}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {p.isLive ? 'Live GPS Location' : p.pickupAddress || 'Pickup Point'}
                      </p>
                      {p.distKm !== null && (
                        <p className="text-[10px] font-bold text-slate-700 mt-1">
                          Distance to Driver: {p.distKm} km (~{p.etaMins} mins)
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>

                {/* DISTINCT COLOR Polyline Route from Driver to this Passenger */}
                {driverLocation && (
                  <Polyline
                    positions={[
                      [driverLocation.lat, driverLocation.lng],
                      p.pos,
                    ]}
                    pathOptions={{
                      color: p.theme.hex, // Unique Passenger Route Line Color
                      weight: 5,
                      opacity: 0.9,
                      dashArray: p.isLive ? undefined : '8, 8', // Solid for Live GPS, dashed for pickup address
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}

          {/* Fit view bounds for Driver + Passengers */}
          {allMapPoints.length >= 2 && <FitMultiRouteBounds points={allMapPoints} />}
        </MapContainer>

        {/* Pulse Animations */}
        <style>{`
          @keyframes liveTrackPulse {
            0% { transform: scale(1); opacity: 0.8; }
            100% { transform: scale(2.2); opacity: 0; }
          }
          .smooth-driver-marker, .smooth-passenger-marker {
            transition: transform 0.8s linear, left 0.8s linear, top 0.8s linear;
          }
        `}</style>

        {/* Waiting Overlay */}
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
