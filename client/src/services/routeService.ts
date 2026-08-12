import api from './api';

export interface RouteEstimateResponse {
  status: string;
  data: {
    distanceKm: number;
    durationMinutes: number;
  };
}

export const getRouteEstimate = async (
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number }
): Promise<{ distanceKm: number; durationMinutes: number }> => {
  const response = await api.post<RouteEstimateResponse>('/routes/estimate', {
    origin,
    destination,
  });
  return response.data.data;
};

export default {
  getRouteEstimate,
};
