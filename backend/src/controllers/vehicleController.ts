import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Vehicle from '../models/Vehicle';
import AppError from '../utils/appError';
import { uploadToCloudinaryOrLocal } from '../services/cloudinaryService';

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

export const uploadVehicleRC = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return next(new AppError('Please upload an RC document image', 400));
    }

    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return next(new AppError('Vehicle not found', 404));
    }

    // Authorize owner
    if (vehicle.owner.toString() !== req.user?.id && req.user?.role !== 'admin') {
      return next(new AppError('You do not own this vehicle', 403));
    }

    const rcUrl = await uploadToCloudinaryOrLocal(req.file.path, 'vehicles');
    
    vehicle.rcImage = rcUrl;
    vehicle.status = 'pending'; // reset status to pending when a document is updated
    await vehicle.save();

    res.status(200).json({
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

    await Vehicle.findByIdAndDelete(id);

    res.status(200).json({
      status: 'success',
      message: 'Vehicle deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
