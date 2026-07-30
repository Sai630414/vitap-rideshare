import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Booking from '../models/Booking';
import Ride from '../models/Ride';
import { Chat } from '../models/Chat';
import AppError from '../utils/appError';
import { sendNotificationToUser } from './notificationController';
import { refundPayment } from './paymentController';

export const createBooking = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { rideId, seatNumber = 1, pickup, drop, message } = req.body;
    if (!req.user) return next(new AppError('Unauthorized', 401));

    if (!pickup || !drop) {
      return next(new AppError('Pickup and drop point locations are required.', 400));
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return next(new AppError('Ride not found', 404));
    }

    if (ride.status !== 'scheduled') {
      return next(new AppError('You can only book scheduled rides', 400));
    }

    if (ride.driver.toString() === req.user.id) {
      return next(new AppError('You cannot book seats in your own ride', 400));
    }

    const requestedSeats = Number(seatNumber) || 1;
    if (requestedSeats < 1) {
      return next(new AppError('Seat count must be at least 1', 400));
    }

    if (ride.availableSeats < requestedSeats) {
      return next(new AppError('Not enough available seats in this ride', 400));
    }

    // Check if passenger already has a booking for this ride that is not rejected/cancelled/expired
    const existingBooking = await Booking.findOne({
      ride: ride._id,
      passenger: req.user.id,
      status: { $in: ['pending', 'accepted'] },
    });

    if (existingBooking) {
      return next(
        new AppError(
          `You already have an active request or confirmed booking for this ride. Status: ${existingBooking.status}`,
          400
        )
      );
    }

    // Create the booking request document
    const booking = await Booking.create({
      ride: ride._id,
      passenger: req.user.id,
      driver: ride.driver,
      pickup,
      drop,
      message,
      seatNumber: requestedSeats,
      status: 'pending',
      paymentStatus: 'pending',
    });

    // Automatically create a Chat conversation between passenger and driver
    let chat = await Chat.findOne({
      participants: { $all: [req.user.id, ride.driver], $size: 2 },
    });
    if (!chat) {
      await Chat.create({
        participants: [req.user.id, ride.driver],
      });
    }

    // Notify the driver
    await sendNotificationToUser(
      ride.driver.toString(),
      'New Ride Request 🚗',
      `${req.user.name} requested ${requestedSeats} seat(s) on your ride from ${ride.source} to ${ride.destination}.`,
      'booking_request',
      booking._id
    );

    res.status(201).json({
      status: 'success',
      data: {
        booking,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getDriverRequests = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));

    const bookings = await Booking.find({ driver: req.user.id })
      .populate('passenger', 'name email phone registrationNumber branch year profileImage rating trustScore')
      .populate({
        path: 'ride',
        populate: [
          { path: 'driver', select: 'name email phone profileImage rating verifiedDriver trustScore' },
          { path: 'vehicle', select: 'brand model type numberPlate color' },
        ],
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: {
        bookings,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const respondToBooking = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body; // accepted or rejected

    if (!['accepted', 'rejected'].includes(status)) {
      return next(new AppError('Status must be accepted or rejected', 400));
    }

    const booking = await Booking.findById(id).populate('ride');
    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    const ride = booking.ride as any; // Cast to access fields
    if (!ride) {
      return next(new AppError('Ride associated with this booking not found', 404));
    }

    // Check if driver is the one responding
    if (ride.driver.toString() !== req.user?.id) {
      return next(new AppError('You are not authorized to respond to this booking request', 403));
    }

    if (booking.status !== 'pending') {
      return next(new AppError(`This booking request is already ${booking.status}`, 400));
    }

    if (ride.status !== 'scheduled') {
      return next(new AppError(`Cannot respond to bookings for a ride that is ${ride.status}`, 400));
    }

    if (status === 'accepted') {
      // Atomically decrement seats if available
      const updatedRide = await Ride.findOneAndUpdate(
        { _id: ride._id, availableSeats: { $gte: booking.seatNumber } },
        { $inc: { availableSeats: -booking.seatNumber } },
        { new: true, runValidators: true }
      );

      if (!updatedRide) {
        booking.status = 'rejected';
        await booking.save();
        
        // Notify passenger about rejection due to no seats
        await sendNotificationToUser(
          booking.passenger.toString(),
          'Booking Declined',
          `Your booking request for the ride to ${ride.destination} was auto-declined because the seats are full.`,
          'ride_cancelled',
          ride._id
        );
        
        return next(new AppError('Not enough available seats left. Request rejected automatically.', 400));
      }

      booking.status = 'accepted';
      await booking.save();

      // Notify passenger
      await sendNotificationToUser(
        booking.passenger.toString(),
        'Booking Approved 🎉',
        `Your request for ${booking.seatNumber} seat(s) on the ride to ${ride.destination} has been accepted! Contact the driver.`,
        'ride_accepted',
        ride._id
      );
    } else {
      booking.status = 'rejected';
      await booking.save();

      // Notify passenger
      await sendNotificationToUser(
        booking.passenger.toString(),
        'Booking Rejected',
        `Your request for the ride to ${ride.destination} was rejected by the driver.`,
        'ride_cancelled',
        ride._id
      );
    }

    res.status(200).json({
      status: 'success',
      data: {
        booking,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const cancelBooking = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id).populate('ride');

    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    if (booking.passenger.toString() !== req.user?.id) {
      return next(new AppError('You are not authorized to cancel this booking', 403));
    }

    if (!['pending', 'accepted'].includes(booking.status)) {
      return next(
        new AppError(`Cannot cancel a booking with status "${booking.status}"`, 400)
      );
    }

    const rideDoc = booking.ride as any;
    if (rideDoc && ['completed', 'cancelled'].includes(rideDoc.status)) {
      return next(new AppError('Cannot cancel a booking for a completed or cancelled ride', 400));
    }

    const previousStatus = booking.status;
    const previousPaymentStatus = booking.paymentStatus;
    
    // Process refund if passenger already paid
    if (previousPaymentStatus === 'paid' && booking.razorpayPaymentId) {
      const rideDetails = booking.ride as any;
      const totalAmount = booking.seatNumber * (rideDetails?.price || 0);
      const amountInPaise = totalAmount * 100;
      
      const refundSuccess = await refundPayment(booking.razorpayPaymentId, amountInPaise);
      if (!refundSuccess) {
        return next(new AppError('Refund failed. Booking was not cancelled. Please contact support.', 502));
      }
      booking.paymentStatus = 'refunded';
    }

    booking.status = 'cancelled';
    await booking.save();

    const ride = booking.ride as any;

    if (ride) {
      // If the booking was accepted, restore seats atomically
      if (previousStatus === 'accepted') {
        await Ride.findByIdAndUpdate(ride._id, { $inc: { availableSeats: booking.seatNumber } });
      }

      // Notify driver of cancellation
      await sendNotificationToUser(
        ride.driver.toString(),
        'Booking Cancelled',
        `Passenger ${req.user.name} cancelled their booking on your ride to ${ride.destination}.`,
        'ride_cancelled',
        booking._id
      );
    }

    res.status(200).json({
      status: 'success',
      message: 'Booking cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getMyBookings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));

    const bookings = await Booking.find({ passenger: req.user.id })
      .populate({
        path: 'ride',
        populate: [
          { path: 'driver', select: 'name email phone profileImage rating verifiedDriver trustScore' },
          { path: 'vehicle', select: 'brand model type numberPlate color' },
        ],
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: {
        bookings,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getRideBookings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { rideId } = req.params;
    const ride = await Ride.findById(rideId);

    if (!ride) {
      return next(new AppError('Ride not found', 404));
    }

    if (ride.driver.toString() !== req.user?.id && req.user?.role !== 'admin') {
      return next(new AppError('You are not authorized to view bookings for this ride', 403));
    }

    const bookings = await Booking.find({ ride: rideId })
      .populate('passenger', 'name email phone registrationNumber branch year profileImage rating trustScore')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: {
        bookings,
      },
    });
  } catch (error) {
    next(error);
  }
};
