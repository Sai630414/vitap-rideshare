import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Ride from '../models/Ride';
import Vehicle from '../models/Vehicle';
import User from '../models/User';
import RideRequest from '../models/RideRequest';
import AppError from '../utils/appError';
import Booking from '../models/Booking';
import { sendNotificationToUser } from './notificationController';
import { refundPayment } from './paymentController';

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

    // Enforce 1 active ride per driver rule
    const existingActiveRide = await Ride.findOne({
      driver: req.user.id,
      status: { $in: ['scheduled', 'ongoing'] },
    });
    if (existingActiveRide) {
      return next(
        new AppError(
          'You already have an active ride in progress. Complete or cancel your current ride before offering a new one.',
          400
        )
      );
    }

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

    const seats = Number(availableSeats);
    if (!Number.isFinite(seats) || seats < 1) {
      return next(new AppError('Available seats must be at least 1', 400));
    }
    if (seats > vehicle.seats) {
      return next(
        new AppError(`Available seats cannot exceed vehicle capacity (${vehicle.seats})`, 400)
      );
    }

    // Reject past departure times
    const departure = new Date(departureDate);
    if (Number.isNaN(departure.getTime())) {
      return next(new AppError('Invalid departure date', 400));
    }
    const [hh, mm] = String(departureTime).split(':').map(Number);
    departure.setHours(hh || 0, mm || 0, 0, 0);
    if (departure.getTime() < Date.now()) {
      return next(new AppError('Departure time must be in the future', 400));
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
      availableSeats: seats,
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

// Get rides offered by the currently authenticated driver
export const getMyRides = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));

    const rides = await Ride.find({ driver: req.user.id })
      .populate('vehicle', 'brand model type numberPlate color seats')
      .populate('driver', 'name email profileImage rating verifiedDriver trustScore')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: rides.length,
      data: {
        rides,
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
      minDriverRating,
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
    } else if (sort === 'recently_posted') {
      sortOptions = { createdAt: -1 };
    } else if (sort === 'highest_driver_rating') {
      // Sorted on driver rating inside populate, or sort manual. 
      // For mongoose, sort by driver rating requires an aggregation pipeline, but we can do a default sort
      // and sort client-side, or sort here. We will default to rating sort by fetching user records
      const highRatedDrivers = await User.find({ role: 'driver' }).sort({ rating: -1 }).select('_id');
      sortOptions = { driver: highRatedDrivers.map((d) => d._id) }; // placeholder
    }

    const skip = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);
    const minRating = minDriverRating ? parseFloat(minDriverRating as string) : null;

    let rides;
    if (sort === 'highest_driver_rating' || minRating !== null) {
      // Use aggregation pipeline to sort globally by driver rating before skip & limit
      // Also handles minDriverRating filter
      const pipeline: any[] = [
        { $match: filter },
        // Lookup driver
        {
          $lookup: {
            from: 'users',
            localField: 'driver',
            foreignField: '_id',
            as: 'driverInfo',
          },
        },
        { $unwind: '$driverInfo' },
        // Lookup vehicle
        {
          $lookup: {
            from: 'vehicles',
            localField: 'vehicle',
            foreignField: '_id',
            as: 'vehicleInfo',
          },
        },
        { $unwind: '$vehicleInfo' },
      ];

      // Apply minDriverRating filter after driver lookup
      if (minRating !== null) {
        pipeline.push({ $match: { 'driverInfo.rating': { $gte: minRating } } });
      }

      // Sort
      if (sort === 'highest_driver_rating') {
        pipeline.push({ $sort: { 'driverInfo.rating': -1, departureDate: 1 } });
      } else if (sort === 'lowest_price') {
        pipeline.push({ $sort: { price: 1 } });
      } else if (sort === 'recently_posted') {
        pipeline.push({ $sort: { createdAt: -1 } });
      } else {
        pipeline.push({ $sort: { departureDate: 1, departureTime: 1 } });
      }

      // Pagination
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: parseInt(limit as string, 10) });

      // Project to map fields like populate
      pipeline.push({
        $project: {
          driver: {
            _id: '$driverInfo._id',
            name: '$driverInfo.name',
            email: '$driverInfo.email',
            profileImage: '$driverInfo.profileImage',
            rating: '$driverInfo.rating',
            verifiedDriver: '$driverInfo.verifiedDriver',
            trustScore: '$driverInfo.trustScore',
          },
          vehicle: {
            _id: '$vehicleInfo._id',
            brand: '$vehicleInfo.brand',
            model: '$vehicleInfo.model',
            type: '$vehicleInfo.type',
            numberPlate: '$vehicleInfo.numberPlate',
            color: '$vehicleInfo.color',
          },
          source: 1,
          destination: 1,
          pickupLocation: 1,
          dropLocation: 1,
          departureDate: 1,
          departureTime: 1,
          price: 1,
          availableSeats: 1,
          description: 1,
          status: 1,
          recurring: 1,
          routePoints: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      });

      rides = await Ride.aggregate(pipeline);
    } else {
      rides = await Ride.find(filter)
        .populate('driver', 'name email profileImage rating verifiedDriver trustScore')
        .populate('vehicle', 'brand model type numberPlate color')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit as string, 10));
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
    const { status } = req.body;

    const allowedStatuses = ['ongoing', 'completed', 'cancelled'] as const;
    if (!allowedStatuses.includes(status)) {
      return next(new AppError('Status must be ongoing, completed, or cancelled', 400));
    }

    const ride = await Ride.findById(id);
    if (!ride) {
      return next(new AppError('Ride not found', 404));
    }

    if (ride.driver.toString() !== req.user?.id && req.user?.role !== 'admin') {
      return next(new AppError('You are not authorized to update this ride status', 403));
    }

    const transitions: Record<string, string[]> = {
      scheduled: ['ongoing', 'cancelled'],
      ongoing: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };

    if (!transitions[ride.status]?.includes(status)) {
      return next(
        new AppError(`Cannot change ride status from "${ride.status}" to "${status}"`, 400)
      );
    }

    const bookings = await Booking.find({
      ride: ride._id,
      status: { $in: ['pending', 'accepted'] },
    });

    ride.status = status;
    await ride.save();

    for (const booking of bookings) {
      const previousBookingStatus = booking.status;

      if (status === 'cancelled') {
        if (booking.paymentStatus === 'paid' && booking.razorpayPaymentId) {
          const amountInPaise = booking.seatNumber * ride.price * 100;
          const refundSuccess = await refundPayment(booking.razorpayPaymentId, amountInPaise);
          if (refundSuccess) {
            booking.paymentStatus = 'refunded';
          }
        }

        booking.status = 'cancelled';
        await booking.save();

        if (previousBookingStatus === 'accepted') {
          await Ride.findByIdAndUpdate(ride._id, {
            $inc: { availableSeats: booking.seatNumber },
          });
        }

        await sendNotificationToUser(
          booking.passenger.toString(),
          'Ride Cancelled by Driver',
          `Your ride from ${ride.source} to ${ride.destination} has been cancelled by the driver.`,
          'ride_cancelled',
          ride._id
        );
      } else if (status === 'completed') {
        if (previousBookingStatus === 'accepted') {
          booking.status = 'completed';
          await booking.save();

          await sendNotificationToUser(
            booking.passenger.toString(),
            '🏁 Ride Completed',
            `Your ride from ${ride.source} to ${ride.destination} has been completed. Please rate your driver!`,
            'ride_completed',
            ride._id
          );
        } else {
          booking.status = 'expired';
          await booking.save();
        }
      } else {
        // ongoing
        if (previousBookingStatus === 'accepted') {
          await sendNotificationToUser(
            booking.passenger.toString(),
            '🚗 Driver Started the Ride',
            `Your ride from ${ride.source} to ${ride.destination} is now underway! Track your driver's location.`,
            'driver_started',
            ride._id
          );
        }
      }
    }

    if (status === 'completed') {
      await User.findByIdAndUpdate(ride.driver, { $inc: { totalTrips: 1 } });

      const completedPassengerIds = bookings
        .filter((b) => b.status === 'completed')
        .map((b) => b.passenger);

      for (const passengerId of completedPassengerIds) {
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
