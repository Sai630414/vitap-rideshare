import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import AppError from '../utils/appError';
import { AuthRequest } from './auth';

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // Extract token from Authorization header or cookies
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(new AppError('Unauthorized: Please log in to gain admin access.', 401));
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'super_secret_access_token_key_change_in_production'
    ) as { id: string };

    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    // Check if user is banned
    if (currentUser.status === 'banned') {
      return next(new AppError('Your account has been suspended. Access denied.', 403));
    }

    // Attach user to request
    req.user = currentUser;
    next();
  } catch (error) {
    return next(new AppError('Session expired or invalid token. Please log in again.', 401));
  }
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== 'admin') {
    return next(
      new AppError('Access Denied: 403 Forbidden. Administrator privileges required.', 403)
    );
  }
  next();
};
