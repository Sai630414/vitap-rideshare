import { Request, Response, NextFunction } from 'express';
import { getWeatherForecast } from '../services/weatherService';

/**
 * GET /api/weather?lat=&lng=&date=YYYY-MM-DD
 * Returns weather data for the given coordinates and date.
 * Never throws an error — returns { available: false } if API is down.
 */
export const getWeather = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { lat, lng, date } = req.query;

    if (!lat || !lng || !date) {
      res.status(400).json({
        status: 'fail',
        message: 'lat, lng, and date (YYYY-MM-DD) are required query parameters',
      });
      return;
    }

    const latNum = parseFloat(lat as string);
    const lngNum = parseFloat(lng as string);

    if (isNaN(latNum) || isNaN(lngNum)) {
      res.status(400).json({
        status: 'fail',
        message: 'lat and lng must be valid numbers',
      });
      return;
    }

    const weather = await getWeatherForecast(latNum, lngNum, date as string);

    res.status(200).json({
      status: 'success',
      data: { weather },
    });
  } catch (error) {
    // Non-blocking — always return a response
    res.status(200).json({
      status: 'success',
      data: { weather: { available: false } },
    });
  }
};
