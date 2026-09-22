import { Request, Response, NextFunction } from 'express';
import { calculateRouteDistanceAndETA } from '../services/googleRoutesService';
import AppError from '../utils/appError';
import logger from '../utils/logger';

export const getRouteEstimate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { origin, destination } = req.body;

    if (!origin || !destination) {
      return next(new AppError('Origin and destination objects are required', 400));
    }

    const { latitude: originLat, longitude: originLng } = origin;
    const { latitude: destinationLat, longitude: destinationLng } = destination;

    if (
      typeof originLat !== 'number' ||
      typeof originLng !== 'number' ||
      typeof destinationLat !== 'number' ||
      typeof destinationLng !== 'number'
    ) {
      return next(
        new AppError('Origin and destination must include numerical latitude and longitude', 400)
      );
    }

    const routeData = await calculateRouteDistanceAndETA(
      originLat,
      originLng,
      destinationLat,
      destinationLng
    );

    res.status(200).json({
      status: 'success',
      data: routeData,
    });
  } catch (error: any) {
    logger.error('Error calculating route estimate:', error?.message || error);
    return next(
      new AppError(
        error?.message || 'Failed to calculate route estimate via Google Routes API',
        error?.response?.status || 500
      )
    );
  }
};
