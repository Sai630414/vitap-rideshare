import axios from 'axios';
import logger from '../utils/logger';

export interface RouteEstimateResult {
  distanceKm: number;
  durationMinutes: number;
}

export const calculateRouteDistanceAndETA = async (
  originLat: number,
  originLng: number,
  destinationLat: number,
  destinationLng: number
): Promise<RouteEstimateResult> => {
  if (
    typeof originLat !== 'number' ||
    typeof originLng !== 'number' ||
    typeof destinationLat !== 'number' ||
    typeof destinationLng !== 'number' ||
    isNaN(originLat) ||
    isNaN(originLng) ||
    isNaN(destinationLat) ||
    isNaN(destinationLng)
  ) {
    throw new Error('Invalid coordinates provided for route calculation');
  }

  const apiKey = process.env.GOOGLE_ROUTES_API_KEY;
  if (!apiKey) {
    logger.error('GOOGLE_ROUTES_API_KEY environment variable is not defined');
    throw new Error('Google Routes API key is missing on the server');
  }

  const requestBody = {
    origin: {
      location: {
        latLng: {
          latitude: originLat,
          longitude: originLng,
        },
      },
    },
    destination: {
      location: {
        latLng: {
          latitude: destinationLat,
          longitude: destinationLng,
        },
      },
    },
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
  };

  const response = await axios.post(
    'https://routes.googleapis.com/directions/v2:computeRoutes',
    requestBody,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration',
      },
      timeout: 10000,
    }
  );

  const route = response.data?.routes?.[0];
  if (!route) {
    throw new Error('No route available for the specified origin and destination');
  }

  const distanceMeters = route.distanceMeters;
  if (typeof distanceMeters !== 'number') {
    throw new Error('Distance meters missing in Google Routes API response');
  }

  // Duration string is formatted as "1234s" (e.g. "1680s")
  const durationStr = route.duration;
  let durationSeconds = 0;
  if (typeof durationStr === 'string' && durationStr.endsWith('s')) {
    durationSeconds = parseFloat(durationStr.slice(0, -1));
  } else if (typeof durationStr === 'number') {
    durationSeconds = durationStr;
  } else {
    throw new Error('Duration missing or malformed in Google Routes API response');
  }

  const distanceKm = parseFloat((distanceMeters / 1000).toFixed(1));
  const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

  return {
    distanceKm,
    durationMinutes,
  };
};
