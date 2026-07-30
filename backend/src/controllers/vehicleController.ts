import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Vehicle from '../models/Vehicle';
import Ride from '../models/Ride';
import AppError from '../utils/appError';

export const registerVehicle = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { type, brand, model, numberPlate, color, seats, insuranceExpiry } = req.body;
    if (!req.user) return next(new AppError('Unauthorized', 401));

    // Check if plate already registered
    const existing = await Vehicle.findOne({ numberPlate });
    if (existing) {
      return next(new AppError('Vehicle plate number already registered', 400));
    }

    const vehicle = await Vehicle.create({
      owner: req.user.id,
      type,
      brand,
      model,
      numberPlate,
      color,
      seats,
      insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : undefined,
      verified: false,
      status: 'pending',
    });

    res.status(201).json({
      status: 'success',
      data: {
        vehicle,
      },
    });
  } catch (error) {
    next(error);
  }
};


export const getMyVehicles = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));

    const vehicles = await Vehicle.find({ owner: req.user.id });

    res.status(200).json({
      status: 'success',
      data: {
        vehicles,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteVehicle = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const vehicle = await Vehicle.findById(id);

    if (!vehicle) {
      return next(new AppError('Vehicle not found', 404));
    }

    if (vehicle.owner.toString() !== req.user?.id && req.user?.role !== 'admin') {
      return next(new AppError('You are not authorized to delete this vehicle', 403));
    }

    const activeRide = await Ride.findOne({
      vehicle: vehicle._id,
      status: { $in: ['scheduled', 'ongoing'] },
    });
    if (activeRide) {
      return next(
        new AppError('Cannot delete a vehicle that has scheduled or ongoing rides', 400)
      );
    }

    await Vehicle.findByIdAndDelete(id);

    res.status(200).json({
      status: 'success',
      message: 'Vehicle deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
