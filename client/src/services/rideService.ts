import api from './api';

export interface LocationData {
  address: string;
  coordinates: [number, number]; // [lng, lat]
}

export interface RideData {
  _id: string;
  driver: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    profileImage: string;
    rating: number;
    trustScore: number;
    verifiedDriver: boolean;
  };
  vehicle: {
    _id: string;
    brand: string;
    model: string;
    type: 'bike' | 'car';
    numberPlate: string;
    color: string;
  };
  source: string;
  destination: string;
  pickupLocation: LocationData;
  dropLocation: LocationData;
  departureDate: string;
  departureTime: string;
  price: number;
  availableSeats: number;
  description?: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  recurring: {
    isRecurring: boolean;
    days?: string[];
  };
  routePoints?: {
    coordinates: [number, number][];
  };
}

export interface RideSearchParams {
  source?: string;
  destination?: string;
  date?: string;
  vehicleType?: 'bike' | 'car';
  seats?: number;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'lowest_price' | 'earliest_time' | 'highest_driver_rating';
  page?: number;
  limit?: number;
}

export const rideService = {
  searchRides: async (params: RideSearchParams) => {
    const response = await api.get('/rides', { params });
    return response.data;
  },

  offerRide: async (data: Omit<RideData, '_id' | 'driver' | 'status' | 'vehicle'> & { vehicleId: string }) => {
    const response = await api.post('/rides', data);
    return response.data;
  },

  getRideDetails: async (id: string) => {
    const response = await api.get(`/rides/${id}`);
    return response.data;
  },

  updateRideStatus: async (id: string, status: 'ongoing' | 'completed' | 'cancelled') => {
    const response = await api.patch(`/rides/${id}/status`, { status });
    return response.data;
  },

  createRideRequest: async (data: {
    source: string;
    destination: string;
    pickupLocation: LocationData;
    dropLocation: LocationData;
    departureDate: string;
    departureTime: string;
    seatsNeeded: number;
    description?: string;
  }) => {
    const response = await api.post('/rides/requests', data);
    return response.data;
  },

  getActiveRideRequests: async () => {
    const response = await api.get('/rides/requests');
    return response.data;
  },

  deleteRideRequest: async (id: string) => {
    const response = await api.delete(`/rides/requests/${id}`);
    return response.data;
  },
};

export default rideService;
