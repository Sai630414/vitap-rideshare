import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, Clock } from 'lucide-react';
import { reverseGeocode } from '../utils/locationUtils';

const createMarkerIcon = (color: string) => {
  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" class="w-10 h-10 filter drop-shadow-xl">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
    `,
    className: 'custom-map-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

const greenIcon = createMarkerIcon('#0F9D58');
const redIcon = createMarkerIcon('#EF4444');

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
};

const AutoFitBounds: React.FC<{ coords: [number, number][] }> = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords.length >= 2) {
      const bounds = L.latLngBounds(coords.map((c) => [c[0], c[1]]));
      map.fitBounds(bounds, { padding: [80, 80] });
    } else if (coords.length === 1) {
      map.setView([coords[0][0], coords[0][1]], 16);
    }
  }, [coords, map]);
  return null;
};

interface MapContainerProps {
  pickupCoords?: [number, number];
  dropCoords?: [number, number];
  pickupAddress?: string;
  dropAddress?: string;
  interactive?: boolean;
  onSelectCoords?: (type: 'pickup' | 'drop', coords: [number, number], address: string) => void;
}

export const MapContainerComponent: React.FC<MapContainerProps> = ({
  pickupCoords,
  dropCoords,
  pickupAddress = 'Pickup',
  dropAddress = 'Drop',
  interactive = false,
  onSelectCoords,
}) => {
  const defaultCenter: [number, number] = [16.4971, 80.4992];
  const [distance, setDistance] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  useEffect(() => {
    if (pickupCoords && dropCoords) {
      const roadDistance = parseFloat((calculateDistance(pickupCoords[1], pickupCoords[0], dropCoords[1], dropCoords[0]) * 1.3).toFixed(1));
      setDistance(roadDistance);
      setDuration(Math.max(5, Math.round((roadDistance / 35) * 60)));
    }
  }, [pickupCoords, dropCoords]);

  const activeCoordinates: [number, number][] = [];
  if (pickupCoords) activeCoordinates.push([pickupCoords[1], pickupCoords[0]]);
  if (dropCoords) activeCoordinates.push([dropCoords[1], dropCoords[0]]);

  const MapClickHandler = () => {
    const map = useMap();
    if (!interactive || !onSelectCoords) return null;
    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      const addressName = await reverseGeocode(lat, lng);
      if (!pickupCoords) onSelectCoords('pickup', [lng, lat], addressName);
      else onSelectCoords('drop', [lng, lat], addressName);
    });
    return null;
  };

  return (
    <div className="relative w-full h-full bg-muted/5 border-2 border-border rounded-[2.5rem] overflow-hidden shadow-soft">
      <MapContainer
        center={activeCoordinates.length > 0 ? activeCoordinates[0] : defaultCenter}
        zoom={15}
        className="w-full h-full z-10"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {pickupCoords && (
          <Marker position={[pickupCoords[1], pickupCoords[0]]} icon={greenIcon}>
            <Popup><p className="font-black text-xs">{pickupAddress}</p></Popup>
          </Marker>
        )}
        {dropCoords && (
          <Marker position={[dropCoords[1], dropCoords[0]]} icon={redIcon}>
            <Popup><p className="font-black text-xs">{dropAddress}</p></Popup>
          </Marker>
        )}
        {pickupCoords && dropCoords && (
          <Polyline positions={[[pickupCoords[1], pickupCoords[0]], [dropCoords[1], dropCoords[0]]]} color="#0F9D58" weight={5} opacity={0.6} dashArray="1, 10" />
        )}
        {activeCoordinates.length > 0 && <AutoFitBounds coords={activeCoordinates} />}
        <MapClickHandler />
      </MapContainer>

      {pickupCoords && dropCoords && (
        <div className="absolute bottom-6 left-6 right-6 z-20 bg-white/90 backdrop-blur-xl border border-border p-6 rounded-[2rem] flex items-center justify-around shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl"><Navigation className="w-6 h-6" /></div>
            <div><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Distance</p><p className="text-lg font-black">{distance} km</p></div>
          </div>
          <div className="h-10 w-px bg-border"></div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl"><Clock className="w-6 h-6" /></div>
            <div><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Time</p><p className="text-lg font-black">{duration} mins</p></div>
          </div>
        </div>
      )}

      {interactive && !dropCoords && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 bg-foreground text-white px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest shadow-2xl animate-bounce">
          Tap Map to set {!pickupCoords ? 'Pickup' : 'Dropoff'}
        </div>
      )}
    </div>
  );
};

export default MapContainerComponent;
