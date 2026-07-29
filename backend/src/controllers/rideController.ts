import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Ride from '../models/Ride';
import Vehicle from '../models/Vehicle';
import User from '../models/User';
import RideRequest from '../models/RideRequest';
import AppError from '../utils/appError';
import Booking from '../models/Booking';
import Notification from '../models/Notification';
import { sendNotificationToUser } from './notificationController'; // Import our notification trigger helper

export const offerRide = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      vehicleId,
      source,
      destination,
      pickupLocation,
      dropLocation,
      departureDate,
      departureTime,
      price,
      availableSeats,
      description,
      recurring,
      routePoints,
    } = req.body;

    if (!req.user) return next(new AppError('Unauthorized', 401));

    // Verify driver has a verified vehicle matching vehicleId
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return next(new AppError('Vehicle not found', 404));
    }

    if (vehicle.owner.toString() !== req.user.id) {
      return next(new AppError('You do not own this vehicle', 403));
    }

    if (vehicle.status !== 'verified') {
      return next(new AppError('Your vehicle must be approved by an admin before you can offer a ride.', 403));
    }

    const ride = await Ride.create({
      driver: req.user.id,
      vehicle: vehicle._id,
      source,
      destination,
      pickupLocation,
      dropLocation,
      departureDate: new Date(departureDate),
      departureTime,
      price,
      availableSeats,
      description,
      recurring: recurring || { isRecurring: false },
      routePoints: routePoints || { coordinates: [] },
      status: 'scheduled',
    });

    res.status(201).json({
      status: 'success',
      data: {
        ride,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const searchRides = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      source,
      destination,
      date,
      vehicleType,
      seats,
      minPrice,
      maxPrice,
      sort,
      page = 1,
      limit = 10,
    } = req.query;

    if (!req.user) return next(new AppError('Unauthorized', 401));

    // 1) Find users who blocked me or whom I blocked to exclude them
    const blockerList = req.user.blockedUsers || [];
    const usersWhoBlockedMe = await User.find({ blockedUsers: req.user.id }).select('_id');
    const excludeUserIds = [...blockerList, ...usersWhoBlockedMe.map((u) => u._id)];

    // 2) Build filters
    const filter: Record<string, any> = {
      driver: { $nin: excludeUserIds },
      status: 'scheduled',
    };

    if (source) {
      filter.source = { $regex: source as string, $options: 'i' };
    }
    if (destination) {
      filter.destination = { $regex: destination as string, $options: 'i' };
    }
    if (date) {
      // Find matches on the same day
      const startOfDay = new Date(date as string);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date as string);
      endOfDay.setHours(23, 59, 59, 999);
      filter.departureDate = { $gte: startOfDay, $lte: endOfDay };
    }
    if (seats) {
      filter.availableSeats = { $gte: parseInt(seats as string, 10) };
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice as string);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice as string);
    }

    // 3) Filter by vehicle type (join query on Vehicle)
    if (vehicleType) {
      const vehiclesOfType = await Vehicle.find({ type: vehicleType as 'bike' | 'car' }).select('_id');
      filter.vehicle = { $in: vehiclesOfType.map((v) => v._id) };
    }

    // 4) Execute sorting
    let sortOptions: Record<string, any> = { departureDate: 1, departureTime: 1 }; // Default: earliest
    if (sort === 'lowest_price') {
      sortOptions = { price: 1 };
    } else if (sort === 'earliest_time') {
      sortOptions = { departureDate: 1, departureTime: 1 };
    } else if (sort === 'highest_driver_rating') {
      // Sorted on driver rating inside populate, or sort manual. 
      // For mongoose, sort by driver rating requires an aggregation pipeline, but we can do a default sort
      // and sort client-side, or sort here. We will default to rating sort by fetching user records
      const highRatedDrivers = await User.find({ role: 'driver' }).sort({ rating: -1 }).select('_id');
      sortOptions = { driver: highRatedDrivers.map((d) => d._id) }; // placeholder
    }

    const skip = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);

    // If sort by rating is not active, standard find
    const rides = await Ride.find(filter)
      .populate('driver', 'name email profileImage rating verifiedDriver trustScore')
      .populate('vehicle', 'brand model type numberPlate color')
      .sort(sort === 'highest_driver_rating' ? {} : sortOptions)
      .skip(skip)
      .limit(parseInt(limit as string, 10));

    // Manual sort for driver rating if requested
    if (sort === 'highest_driver_rating') {
      rides.sort((a: any, b: any) => {
        const ratingA = a.driver?.rating || 0;
        const ratingB = b.driver?.rating || 0;
        return ratingB - ratingA;
      });
    }

    const total = await Ride.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      results: rides.length,
      total,
      data: {
        rides,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getRideDetails = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('driver', 'name email phone profileImage rating verifiedDriver trustScore branch year registrationNumber')
      .populate('vehicle', 'brand model type color numberPlate seats');

    if (!ride) {
      return next(new AppError('No ride found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        ride,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateRideStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body; // ongoing, completed, cancelled

    const ride = await Ride.findById(id);
    if (!ride) {
      return next(new AppError('Ride not found', 404));
    }

    if (ride.driver.toString() !== req.user?.id && req.user?.role !== 'admin') {
      return next(new AppError('You are not authorized to update this ride status', 403));
    }

    ride.status = status;
    await ride.save();

    // Notify passengers about status change
    const bookings = await Booking.find({ ride: ride._id, status: 'accepted' });
    const passengerIds = bookings.map((b) => b.passenger);

    for (const passengerId of passengerIds) {
      await sendNotificationToUser(
        passengerId.toString(),
        `Ride status updated to ${status}`,
        `Your ride from ${ride.source} to ${ride.destination} is now ${status}.`,
        status === 'cancelled' ? 'ride_cancelled' : 'ride_accepted',
        ride._id
      );
    }

    // If completed, increment trip counters
    if (status === 'completed') {
      // Driver trips increment
      await User.findByIdAndUpdate(ride.driver, { $inc: { totalTrips: 1 } });
      
      // Passenger trips increment
      for (const passengerId of passengerIds) {
        await User.findByIdAndUpdate(passengerId, { $inc: { totalTrips: 1 } });
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        ride,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Ride Requests endpoints
export const createRideRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      source,
      destination,
      pickupLocation,
      dropLocation,
      departureDate,
      departureTime,
      seatsNeeded,
      description,
    } = req.body;

    if (!req.user) return next(new AppError('Unauthorized', 401));

    const rideReq = await RideRequest.create({
      user: req.user.id,
      source,
      destination,
      pickupLocation,
      dropLocation,
      departureDate: new Date(departureDate),
      departureTime,
      seatsNeeded,
      description,
      status: 'active',
    });

    res.status(201).json({
      status: 'success',
      data: {
        rideRequest: rideReq,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getActiveRideRequests = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requests = await RideRequest.find({ status: 'active' })
      .populate('user', 'name email profileImage rating trustScore')
      .sort({ departureDate: 1 });

    res.status(200).json({
      status: 'success',
      results: requests.length,
      data: {
        rideRequests: requests,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteRideRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const request = await RideRequest.findById(id);

    if (!request) {
      return next(new AppError('Ride request not found', 404));
    }

    if (request.user.toString() !== req.user?.id && req.user?.role !== 'admin') {
      return next(new AppError('Unauthorized', 403));
    }

    request.status = 'cancelled';
    await request.save();

    res.status(200).json({
      status: 'success',
      message: 'Ride request cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
};
