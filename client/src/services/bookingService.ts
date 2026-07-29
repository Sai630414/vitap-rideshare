import api from './api';

export interface BookingData {
  _id: string;
  ride: {
    _id: string;
    source: string;
    destination: string;
    departureDate: string;
    departureTime: string;
    price: number;
    status: string;
    driver: {
      _id: string;
      name: string;
      email: string;
      phone?: string;
      profileImage: string;
      rating: number;
      trustScore: number;
    };
    vehicle: {
      brand: string;
      model: string;
      type: 'bike' | 'car';
      numberPlate: string;
      color: string;
    };
  };
  passenger: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    profileImage: string;
    registrationNumber?: string;
    branch?: string;
    year?: number;
    rating: number;
    trustScore: number;
  };
  seatNumber: number;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  paymentStatus: 'pending' | 'paid';
  createdAt: string;
}

export const bookingService = {
  createBooking: async (rideId: string, seatNumber: number, pickup: string, drop: string, message?: string) => {
    const response = await api.post('/bookings', { rideId, seatNumber, pickup, drop, message });
    return response.data;
  },

  respondToBooking: async (bookingId: string, status: 'accepted' | 'rejected') => {
    const response = await api.patch(`/bookings/${bookingId}/respond`, { status });
    return response.data;
  },

  cancelBooking: async (bookingId: string) => {
    const response = await api.patch(`/bookings/${bookingId}/cancel`);
    return response.data;
  },

  getMyBookings: async () => {
    const response = await api.get('/bookings/my-bookings');
    return response.data;
  },

  getDriverRequests: async () => {
    const response = await api.get('/bookings/driver-requests');
    return response.data;
  },

  getRideBookings: async (rideId: string) => {
    const response = await api.get(`/bookings/ride/${rideId}`);
    return response.data;
  },

  // Review & Ratings endpoints
  createReview: async (rideId: string, rating: number, comment?: string) => {
    const response = await api.post('/reviews', { rideId, rating, comment });
    return response.data;
  },

  getDriverReviews: async (driverId: string) => {
    const response = await api.get(`/reviews/driver/${driverId}`);
    return response.data;
  },
};

export default bookingService;
