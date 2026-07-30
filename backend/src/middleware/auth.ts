import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import AppError from '../utils/appError';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // 1) Extract token from Authorization header or cookies
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    // 2) Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'super_secret_access_token_key_change_in_production'
    ) as { id: string };

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    // 4) Check if user is banned
    if (currentUser.status === 'banned') {
      return next(new AppError('Your account has been banned. Please contact the administrator.', 403));
    }

    // 5) Grant access (append user to request)
    req.user = currentUser;
    next();
  } catch (error) {
    return next(new AppError('Invalid token or session expired. Please log in again.', 401));
  }
};

export const restrictTo = (...roles: ('student' | 'driver' | 'admin')[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

export const requireVerifiedDriver = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== 'driver' || !req.user.verifiedDriver) {
    return next(
      new AppError('You must be a verified driver to offer rides. Please upload your documents and wait for approval.', 403)
    );
  }
  next();
};

export const requireVerifiedStudent = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || !req.user.verifiedStudent) {
    return next(
      new AppError('Your student account must be verified before performing booking actions.', 403)
    );
  }
  next();
};
