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
  pickup: string;
  drop: string;
  pickupCoordinates?: [number, number];
  dropCoordinates?: [number, number];
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid';
  createdAt: string;
}

export const bookingService = {
  createBooking: async (
    rideId: string,
    seatNumber: number,
    pickup: string,
    drop: string,
    message?: string,
    pickupCoordinates?: [number, number],
    dropCoordinates?: [number, number]
  ) => {
    const response = await api.post('/bookings', {
      rideId,
      seatNumber,
      pickup,
      drop,
      message,
      pickupCoordinates,
      dropCoordinates,
    });
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

  // ─── Review & Rating endpoints ───────────────────────────────────────────────

  /** Passenger reviews driver */
  createReview: async (rideId: string, rating: number, comment?: string) => {
    const response = await api.post('/reviews', { rideId, rating, comment });
    return response.data;
  },

  /** Driver reviews passenger */
  createPassengerReview: async (rideId: string, passengerId: string, rating: number, comment?: string) => {
    const response = await api.post('/reviews/passenger', { rideId, passengerId, rating, comment });
    return response.data;
  },

  /** Edit a review within 24 hours */
  updateReview: async (reviewId: string, rating: number, comment?: string) => {
    const response = await api.patch(`/reviews/${reviewId}`, { rating, comment });
    return response.data;
  },

  /** Check if current user already submitted a review */
  getMyReview: async (rideId: string, type: 'driver' | 'passenger' = 'driver', passengerId?: string) => {
    const response = await api.get('/reviews/my-review', {
      params: { rideId, type, passengerId },
    });
    return response.data;
  },

  getDriverReviews: async (driverId: string) => {
    const response = await api.get(`/reviews/driver/${driverId}`);
    return response.data;
  },

  getPassengerReviews: async (passengerId: string) => {
    const response = await api.get(`/reviews/passenger/${passengerId}`);
    return response.data;
  },
};

export default bookingService;
