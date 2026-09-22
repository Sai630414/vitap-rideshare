import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Clock } from 'lucide-react';
import { reverseGeocode } from '../utils/locationUtils';
import { getRouteEstimate } from '../services/routeService';

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
  pickupCoords?: [number, number]; // [lng, lat]
  dropCoords?: [number, number];   // [lng, lat]
  pickupAddress?: string;
  dropAddress?: string;
  interactive?: boolean;
  onSelectCoords?: (type: 'pickup' | 'drop', coords: [number, number], address: string) => void;
  height?: string;
}

export const MapContainerComponent: React.FC<MapContainerProps> = ({
  pickupCoords,
  dropCoords,
  pickupAddress = 'Pickup',
  dropAddress = 'Drop',
  interactive = false,
  onSelectCoords,
  height = 'h-48',
}) => {
  const defaultCenter: [number, number] = [16.4971, 80.4992];
  const [distanceDisplay, setDistanceDisplay] = useState<string | null>(null);
  const [durationDisplay, setDurationDisplay] = useState<string | null>(null);
  const [loadingRoute, setLoadingRoute] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    if (pickupCoords && dropCoords) {
      setLoadingRoute(true);
      setRouteError(false);
      setDistanceDisplay(null);
      setDurationDisplay(null);

      getRouteEstimate(
        { latitude: pickupCoords[1], longitude: pickupCoords[0] },
        { latitude: dropCoords[1], longitude: dropCoords[0] }
      )
        .then((res) => {
          if (isMounted) {
            setDistanceDisplay(`${res.distanceKm} km`);
            setDurationDisplay(`${res.durationMinutes} mins`);
            setLoadingRoute(false);
          }
        })
        .catch((err) => {
          console.error('Failed to get route estimate from backend:', err);
          if (isMounted) {
            setRouteError(true);
            setLoadingRoute(false);
          }
        });
    } else {
      setDistanceDisplay(null);
      setDurationDisplay(null);
      setLoadingRoute(false);
      setRouteError(false);
    }

    return () => {
      isMounted = false;
    };
  }, [pickupCoords?.[0], pickupCoords?.[1], dropCoords?.[0], dropCoords?.[1]]);

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
    <div className="flex flex-col gap-2.5 w-full">
      {pickupCoords && dropCoords && (
        <div className="bg-emerald-50/70 border border-emerald-200/60 px-4 py-2.5 rounded-2xl flex items-center justify-around shadow-xs animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-800/70">Distance</p>
              <p className="text-xs font-black text-slate-900">
                {loadingRoute ? 'Calculating...' : routeError ? 'Unavailable' : distanceDisplay}
              </p>
            </div>
          </div>
          <div className="h-6 w-px bg-emerald-200/80"></div>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-800/70">Estimated Time</p>
              <p className="text-xs font-black text-slate-900">
                {loadingRoute ? 'Calculating...' : routeError ? 'Unavailable' : durationDisplay}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className={`relative w-full ${height} border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-slate-50`}>
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

        {interactive && !dropCoords && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1001] bg-slate-900/90 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg animate-bounce pointer-events-none">
            Tap Map to set {!pickupCoords ? 'Pickup' : 'Dropoff'}
          </div>
        )}
      </div>
    </div>
  );
};

export default MapContainerComponent;
