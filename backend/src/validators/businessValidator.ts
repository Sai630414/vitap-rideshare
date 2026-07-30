import { z } from 'zod';
import { Types } from 'mongoose';

// Custom validation for MongoDB ObjectId
const objectIdSchema = z.string().refine((val) => Types.ObjectId.isValid(val), {
  message: 'Invalid MongoDB ObjectId',
});

export const registerVehicleSchema = z.object({
  body: z.object({
    type: z.enum(['bike', 'car'], {
      required_error: 'Vehicle type must be bike or car',
    }),
    brand: z.string().min(2, 'Vehicle brand must be at least 2 characters'),
    model: z.string().min(2, 'Vehicle model must be at least 2 characters'),
    numberPlate: z
      .string()
      .min(5, 'Vehicle number plate must be valid')
      .toUpperCase(),
    color: z.string().min(2, 'Vehicle color must be specified'),
    seats: z.coerce.number().min(1, 'Must offer at least 1 seat'),
    insuranceExpiry: z.string().optional(),
  }),
});

export const offerRideSchema = z.object({
  body: z.object({
    vehicleId: objectIdSchema,
    source: z.string().min(2, 'Source location name must be valid'),
    destination: z.string().min(2, 'Destination location name must be valid'),
    pickupLocation: z.object({
      address: z.string().min(2),
      coordinates: z.tuple([z.number(), z.number()]),
    }),
    dropLocation: z.object({
      address: z.string().min(2),
      coordinates: z.tuple([z.number(), z.number()]),
    }),
    departureDate: z.string(),
    departureTime: z.string().regex(/^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format'),
    price: z.coerce.number().min(0, 'Price cannot be negative'),
    availableSeats: z.coerce.number().min(1, 'Available seats must be at least 1'),
    description: z.string().optional(),
    recurring: z
      .object({
        isRecurring: z.boolean(),
        days: z.array(z.string()).optional(),
      })
      .optional(),
    routePoints: z
      .object({
        coordinates: z.array(z.tuple([z.number(), z.number()])),
      })
      .optional(),
  }),
});

export const createRideRequestSchema = z.object({
  body: z.object({
    source: z.string().min(2, 'Source location name must be valid'),
    destination: z.string().min(2, 'Destination location name must be valid'),
    pickupLocation: z.object({
      address: z.string().min(2),
      coordinates: z.tuple([z.number(), z.number()]),
    }),
    dropLocation: z.object({
      address: z.string().min(2),
      coordinates: z.tuple([z.number(), z.number()]),
    }),
    departureDate: z.string(),
    departureTime: z.string().min(2),
    seatsNeeded: z.coerce.number().min(1, 'Seats needed must be at least 1'),
    description: z.string().optional(),
  }),
});

export const createBookingSchema = z.object({
  body: z.object({
    rideId: objectIdSchema,
    seatNumber: z.coerce.number().min(1, 'Seat count must be at least 1').optional(),
    pickup: z.string().min(2, 'Pickup address is required'),
    drop: z.string().min(2, 'Drop address is required'),
    message: z.string().optional(),
  }),
});

export const respondToBookingSchema = z.object({
  body: z.object({
    status: z.enum(['accepted', 'rejected']),
  }),
});

export const createReviewSchema = z.object({
  body: z.object({
    rideId: objectIdSchema,
    rating: z.coerce.number().min(1).max(5),
    comment: z.string().optional(),
  }),
});

export const updateRideStatusSchema = z.object({
  body: z.object({
    status: z.enum(['ongoing', 'completed', 'cancelled']),
  }),
});
