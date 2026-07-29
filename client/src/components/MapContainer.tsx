import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation } from 'lucide-react';
import { reverseGeocode } from '../utils/locationUtils';

// Inline premium SVG markers to prevent leaflet icon resolution bugs
const createMarkerIcon = (color: string) => {
  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="black" stroke-width="1.5" class="w-8 h-8 filter drop-shadow">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
        <span class="absolute w-2.5 h-2.5 rounded-full bg-white top-[7px]"></span>
      </div>
    `,
    className: 'custom-map-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const greenIcon = createMarkerIcon('#10B981'); // Pickup
const redIcon = createMarkerIcon('#EF4444');   // Drop

// Haversine formula to compute distance
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return parseFloat(distance.toFixed(1)); // Return 1 decimal place
};

// Component to dynamically fit bounds of markers
const AutoFitBounds: React.FC<{ coords: [number, number][] }> = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords.length >= 2) {
      const bounds = L.latLngBounds(coords.map((c) => [c[0], c[1]]));
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (coords.length === 1) {
      map.setView([coords[0][0], coords[0][1]], 14);
    }
  }, [coords, map]);
  return null;
};

interface MapContainerProps {
  pickupCoords?: [number, number]; // [lng, lat]
  dropCoords?: [number, number];   // [lng, lat]
  pickupAddress?: string;
  dropAddress?: string;
  interactive?: boolean;
  onSelectCoords?: (type: 'pickup' | 'drop', coords: [number, number], address: string) => void;
}

export const MapContainerComponent: React.FC<MapContainerProps> = ({
  pickupCoords,
  dropCoords,
  pickupAddress = 'Pickup Point',
  dropAddress = 'Drop Point',
  interactive = false,
  onSelectCoords,
}) => {
  // Center on VIT-AP by default: Lat 16.4971, Lng 80.4992
  const defaultCenter: [number, number] = [16.4971, 80.4992];
  
  const [distance, setDistance] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // Compute stats if coordinates exist
  useEffect(() => {
    if (pickupCoords && dropCoords) {
      const dist = calculateDistance(pickupCoords[1], pickupCoords[0], dropCoords[1], dropCoords[0]);
      // Estimate distance along roads (typically ~1.3x straight line)
      const roadDistance = parseFloat((dist * 1.3).toFixed(1));
      setDistance(roadDistance);
      
      // Assume avg speed of 40 km/h for travel time estimation
      const mins = Math.max(3, Math.round((roadDistance / 40) * 60));
      setDuration(mins);
    }
  }, [pickupCoords, dropCoords]);

  // Gather coordinates in LatLng array for Leaflet bounds fitting
  const activeCoordinates: [number, number][] = [];
  if (pickupCoords) activeCoordinates.push([pickupCoords[1], pickupCoords[0]]);
  if (dropCoords) activeCoordinates.push([dropCoords[1], dropCoords[0]]);

  // Simple Click Handler component to handle selects during ride offerings
  const MapClickHandler = () => {
    const map = useMap();
    if (!interactive || !onSelectCoords) return null;

    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      // Get address name using geocoder helper
      const addressName = await reverseGeocode(lat, lng);
      
      if (!pickupCoords) {
        onSelectCoords('pickup', [lng, lat], addressName);
      } else {
        onSelectCoords('drop', [lng, lat], addressName);
      }
    });
    return null;
  };

  return (
    <div className="relative w-full h-[350px] md:h-[400px] bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden light:bg-zinc-150 light:border-zinc-200">
      <MapContainer
        center={activeCoordinates.length > 0 ? activeCoordinates[0] : defaultCenter}
        zoom={14}
        scrollWheelZoom={true}
        className="w-full h-full z-10"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {pickupCoords && (
          <Marker position={[pickupCoords[1], pickupCoords[0]]} icon={greenIcon}>
            <Popup>
              <div className="p-1">
                <p className="font-semibold text-emerald-500">Pickup</p>
                <p className="text-xs text-zinc-300 mt-0.5">{pickupAddress}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {dropCoords && (
          <Marker position={[dropCoords[1], dropCoords[0]]} icon={redIcon}>
            <Popup>
              <div className="p-1">
                <p className="font-semibold text-red-500">Drop</p>
                <p className="text-xs text-zinc-300 mt-0.5">{dropAddress}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Draw straight connecting line route polyline */}
        {pickupCoords && dropCoords && (
          <Polyline
            positions={[
              [pickupCoords[1], pickupCoords[0]],
              [dropCoords[1], dropCoords[0]],
            ]}
            color="#8B5CF6"
            weight={4}
            opacity={0.8}
            dashArray="10, 10"
          />
        )}

        {activeCoordinates.length > 0 && <AutoFitBounds coords={activeCoordinates} />}
        <MapClickHandler />
      </MapContainer>

      {/* Ride Info Stats Overlay Card */}
      {pickupCoords && dropCoords && (
        <div className="absolute bottom-4 left-4 right-4 z-25 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 p-4 rounded-xl flex items-center justify-around text-center shadow-lg light:bg-white/95 light:border-zinc-250">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 text-violet-400 rounded-lg">
              <Navigation className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-xs text-zinc-400">Total Distance</p>
              <p className="text-sm font-bold text-zinc-100 light:text-zinc-950">{distance} km</p>
            </div>
          </div>
          <div className="h-8 w-px bg-zinc-800"></div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 text-violet-400 rounded-lg">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-xs text-zinc-400">Est. Time</p>
              <p className="text-sm font-bold text-zinc-100 light:text-zinc-950">{duration} mins</p>
            </div>
          </div>
        </div>
      )}

      {/* Interactive selection helper banner */}
      {interactive && !pickupCoords && (
        <div className="absolute top-4 left-4 z-20 bg-zinc-950/90 text-zinc-300 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs font-semibold">
          Click on the map to set the Pickup Location
        </div>
      )}
      {interactive && pickupCoords && !dropCoords && (
        <div className="absolute top-4 left-4 z-20 bg-zinc-950/90 text-zinc-300 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs font-semibold">
          Click on the map to set the Drop Location
        </div>
      )}
    </div>
  );
};

export default MapContainerComponent;
