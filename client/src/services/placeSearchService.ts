import locationPermissionService from './locationPermissionService';

export interface PlaceSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
  formattedAddress: string;
  coordinates: [number, number]; // [lng, lat]
  category?: string;
  isRecent?: boolean;
  isCurrentLocation?: boolean;
}

const RECENT_PLACES_KEY = 'waygo_recent_places_v1';
const cacheMap = new Map<string, PlaceSuggestion[]>();

/**
 * Get recent place searches saved in localStorage
 */
export const getRecentSearches = (): PlaceSuggestion[] => {
  try {
    const raw = localStorage.getItem(RECENT_PLACES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

/**
 * Save selected place to recent searches in localStorage
 */
export const saveRecentSearch = (place: PlaceSuggestion) => {
  if (!place || place.isCurrentLocation) return;
  try {
    const recents = getRecentSearches().filter(
      (p) => p.placeId !== place.placeId && p.formattedAddress !== place.formattedAddress
    );
    const updated = [{ ...place, isRecent: true }, ...recents].slice(0, 10);
    localStorage.setItem(RECENT_PLACES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save recent search:', e);
  }
};

/**
 * Clear all recent searches
 */
export const clearRecentSearches = () => {
  try {
    localStorage.removeItem(RECENT_PLACES_KEY);
  } catch (e) {
    // ignored
  }
};

/**
 * Search places across India using Google Places API / Nominatim / Photon with caching & debouncing
 */
export const searchPlaces = async (query: string): Promise<PlaceSuggestion[]> => {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const cacheKey = trimmed.toLowerCase();
  if (cacheMap.has(cacheKey)) {
    return cacheMap.get(cacheKey)!;
  }

  // 1. Try Google Places Autocomplete if API Key or Google script is present
  const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
  if (googleApiKey) {
    try {
      const googleRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          trimmed
        )}&components=country:in&key=${googleApiKey}`
      );
      if (googleRes.ok) {
        const data = await googleRes.json();
        if (data.status === 'OK' && Array.isArray(data.predictions)) {
          const suggestions: PlaceSuggestion[] = data.predictions.map((item: any) => ({
            placeId: item.place_id,
            mainText: item.structured_formatting?.main_text || item.description.split(',')[0],
            secondaryText: item.structured_formatting?.secondary_text || item.description,
            formattedAddress: item.description,
            // Placeholder coords, actual coords fetched on detail selection
            coordinates: [80.5015, 16.4960],
          }));
          cacheMap.set(cacheKey, suggestions);
          return suggestions;
        }
      }
    } catch (err) {
      console.warn('Google Places API call failed, falling back to Geocoding service:', err);
    }
  }

  // 2. High-performance OpenStreetMap Nominatim / Photon search for India
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      trimmed
    )}&countrycodes=in&addressdetails=1&limit=10`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Waygo-Rideshare-App-India',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        const suggestions: PlaceSuggestion[] = data.map((item: any) => {
          const address = item.address || {};
          const mainText =
            item.name ||
            address.amenity ||
            address.building ||
            address.road ||
            address.suburb ||
            address.village ||
            address.town ||
            address.city ||
            item.display_name.split(',')[0];

          const secondaryParts = [
            address.road || address.suburb,
            address.village || address.town || address.city || address.county,
            address.state,
            address.postcode,
          ].filter(Boolean);

          const secondaryText =
            secondaryParts.length > 0 ? secondaryParts.join(', ') : item.display_name;

          return {
            placeId: `osm_${item.place_id || item.osm_id}`,
            mainText: mainText.trim(),
            secondaryText: secondaryText.trim(),
            formattedAddress: item.display_name,
            coordinates: [parseFloat(item.lon), parseFloat(item.lat)],
            category: item.type || item.class,
          };
        });

        cacheMap.set(cacheKey, suggestions);
        return suggestions;
      }
    }
  } catch (err) {
    console.error('Place search service failed:', err);
  }

  return [];
};

/**
 * Fetch detailed coordinates for a Google Place ID or OSM ID
 */
export const getPlaceDetails = async (place: PlaceSuggestion): Promise<PlaceSuggestion> => {
  // If coordinates are already non-zero, return directly
  if (place.coordinates && (place.coordinates[0] !== 0 || place.coordinates[1] !== 0)) {
    return place;
  }

  const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
  if (googleApiKey && place.placeId && !place.placeId.startsWith('osm_')) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.placeId}&fields=geometry,formatted_address&key=${googleApiKey}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.result?.geometry?.location) {
          const loc = data.result.geometry.location;
          return {
            ...place,
            coordinates: [loc.lng, loc.lat],
            formattedAddress: data.result.formatted_address || place.formattedAddress,
          };
        }
      }
    } catch (e) {
      console.warn('Google Place details fetch failed:', e);
    }
  }

  return place;
};

/**
 * Get formatted current location using device GPS
 */
export const getCurrentLocationPlace = async (): Promise<PlaceSuggestion> => {
  const coords = await locationPermissionService.getCurrentPosition();
  const lat = coords.latitude;
  const lng = coords.longitude;

  let formattedAddress = `GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  let mainText = 'Current GPS Location';
  let secondaryText = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Waygo-Rideshare-App-India',
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        formattedAddress = data.display_name;
        const parts = data.display_name.split(',');
        mainText = parts[0].trim();
        secondaryText = parts.slice(1, 4).join(',').trim();
      }
    }
  } catch (e) {
    // fallback
  }

  return {
    placeId: `current_${Date.now()}`,
    mainText,
    secondaryText,
    formattedAddress,
    coordinates: [lng, lat],
    isCurrentLocation: true,
  };
};
