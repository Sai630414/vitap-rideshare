import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Vehicle from '../models/Vehicle';
import DrivingLicence from '../models/DrivingLicence';
import Ride from '../models/Ride';
import Booking from '../models/Booking';
import Report from '../models/Report';
import Driver from '../models/Driver';
import Setting from '../models/Setting';
import AuditLog from '../models/AuditLog';
import AppError from '../utils/appError';
import { sendNotificationToUser } from './notificationController';
import logger from '../utils/logger';
import { createAccessToken, createRefreshToken } from '../utils/jwt';
import { sendToUser, broadcastToAll } from '../services/socketService';
import {
  sendDriverApprovalEmail,
  sendDriverRejectionEmail,
} from '../services/emailService';
import { refundPayment } from './paymentController';

/**
 * POST /api/admin/login
 * Dedicated Administrator Authenticator
 */
export const adminLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError('Incorrect email or password.', 401));
    }

    if (user.role !== 'admin') {
      return next(new AppError('Access Denied: You are not authorized as an administrator.', 403));
    }

    if (user.status === 'banned') {
      return next(new AppError('Your admin account has been suspended.', 403));
    }

    // Generate JWTs
    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    // Secure HTTP-only refresh cookie
    const cookieOptions = {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none' as const,
    };
    res.cookie('jwt', refreshToken, cookieOptions);

    user.password = undefined;

    // Log the successful login in AuditLog
    await AuditLog.create({
      admin: user._id,
      action: 'ADMIN_LOGIN',
      details: `Successful password authentication from IP: ${req.ip}`,
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: 'success',
      token: accessToken,
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/dashboard
 * Fetch analytical metrics and statistics for visual graphs
 */
export const getDashboardStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalUsers,
      totalStudents,
      totalDriversCount,
      pendingApprovalsCount,
      approvedDriversCount,
      completedTrips,
      cancelledTrips,
      todayTrips,
      paidCompletedBookings,
      registrationsTrend,
      rideTrend,
      approvalTrends,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'driver' }),
      Driver.countDocuments({ approvalStatus: 'pending' }),
      Driver.countDocuments({ approvalStatus: 'approved' }),
      Ride.countDocuments({ status: 'completed' }),
      Ride.countDocuments({ status: 'cancelled' }),
      Ride.countDocuments({ createdAt: { $gte: todayStart } }),
      Booking.find({
        status: 'completed',
        paymentStatus: 'paid',
      }).populate('ride').exec(),
      User.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Ride.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Driver.aggregate([
        {
          $group: {
            _id: '$approvalStatus',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    let revenue = 0;
    paidCompletedBookings.forEach((booking: any) => {
      if (booking.ride) {
        revenue += (booking.seatNumber || 1) * (booking.ride.price || 0);
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          totalUsers,
          totalStudents,
          totalDrivers: totalDriversCount,
          pendingApprovals: pendingApprovalsCount,
          approvedDrivers: approvedDriversCount,
          completedTrips,
          cancelledTrips,
          todayTrips,
          revenue,
        },
        charts: {
          dailyRegistrations: registrationsTrend,
          rideGrowth: rideTrend,
          approvalTrends,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/drivers
 * Retrieve list of driver profiles with search and status filters
 */
export const getDrivers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { approvalStatus, search, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};
    if (approvalStatus) {
      query.approvalStatus = approvalStatus;
    }

    if (search) {
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: search as string, $options: 'i' } },
          { email: { $regex: search as string, $options: 'i' } },
        ],
      });
      const userIds = matchingUsers.map((u) => u._id);
      query.user = { $in: userIds };
    }

    logger.info("Admin Query Executed");
    const total = await Driver.countDocuments(query);
    logger.info(`Pending Applications Found: ${total}`);
    const drivers = await Driver.find(query)
      .populate('user', 'name email profileImage branch year status')
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: drivers.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: {
        drivers,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/drivers/:id
 * Retrieve details of a single driver profile
 */
export const getDriverById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const driver = await Driver.findById(req.params.id).populate(
      'user',
      'name email profileImage branch year status verifiedStudent verifiedDriver role phone'
    );

    if (!driver) {
      return next(new AppError('No driver application found with this ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        driver,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/drivers/:id/approve
 * Set driver profile as Approved and enable ride offer options
 */
export const approveDriver = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return next(new AppError('Driver application profile not found', 404));
    }

    const user = await User.findById(driver.user);
    if (!user) {
      return next(new AppError('User profile linked to driver not found', 404));
    }

    if (!driver.emailVerified && !user.isVerified) {
      return next(new AppError('Driver email is not verified yet. Ask them to verify OTP first.', 400));
    }

    if (driver.approvalStatus === 'approved') {
      return next(new AppError('Driver application is already approved.', 400));
    }

    // Set statuses — payment still required before hosting rides
    driver.approvalStatus = 'approved';
    driver.driverStatus = 'PAYMENT_PENDING';
    driver.rejectionReason = undefined;
    await driver.save();
    logger.info('Driver Approved');

    user.verifiedDriver = false; // Must pay subscription before role upgrades
    await user.save();

    // Sync DrivingLicence only when real licence data exists (avoid unique/required failures)
    if (driver.licenceNumber && driver.licenceImage) {
      await DrivingLicence.findOneAndUpdate(
        { user: user._id },
        {
          licenceNumber: driver.licenceNumber,
          expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          frontImage: driver.licenceImage,
          backImage: driver.licenceImage,
          status: 'verified',
          verifiedBy: req.user?._id,
          verifiedAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    // Upsert vehicle by numberPlate to avoid clobbering unrelated vehicles
    await Vehicle.findOneAndUpdate(
      { numberPlate: driver.vehicleNumber },
      {
        owner: user._id,
        type: driver.vehicleType,
        brand: driver.vehicleModel.split(' ')[0] || 'Unknown',
        model: driver.vehicleModel,
        numberPlate: driver.vehicleNumber,
        color: driver.vehicleColour,
        seats: driver.vehicleType === 'car' ? 4 : 1,
        verified: true,
        status: 'verified',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await AuditLog.create({
      admin: req.user?._id,
      action: 'APPROVE_DRIVER',
      target: driver._id.toString(),
      details: `Approved driver: ${user.name} (${user.email}). Vehicle: ${driver.vehicleNumber}`,
      ipAddress: req.ip,
    });

    await sendDriverApprovalEmail(user.email, user.name);
    await sendNotificationToUser(
      user._id.toString(),
      'Driver Registration Approved!',
      'Your documents were approved. Complete the ₹50 subscription payment to activate your driver account and start offering rides.',
      'verification_approved',
      driver._id
    );

    // Emit real-time driver approval update to user and admin dashboard
    sendToUser(user._id.toString(), 'driver_approval_updated', driver);
    broadcastToAll('admin_driver_updated', driver);

    res.status(200).json({
      status: 'success',
      message: 'Driver profile successfully approved and synchronized.',
      data: {
        driver,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/drivers/:id/reject
 * Reject driver registration with a mandatory reason
 */
export const rejectDriver = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return next(new AppError('A rejection reason is required.', 400));
    }

    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return next(new AppError('Driver application profile not found', 404));
    }

    const user = await User.findById(driver.user);
    if (!user) {
      return next(new AppError('User profile linked to driver not found', 404));
    }

    driver.approvalStatus = 'rejected';
    driver.driverStatus = 'PENDING_APPROVAL';
    driver.rejectionReason = reason;
    driver.paymentStatus = false;
    driver.subscriptionStatus = 'Inactive';
    await driver.save();
    logger.info('Driver Rejected');

    user.verifiedDriver = false;
    if (user.role === 'driver') {
      user.role = 'student';
    }
    await user.save();

    // Only remove synced docs tied to this application — do not wipe unrelated vehicles
    if (driver.licenceNumber) {
      await DrivingLicence.findOneAndDelete({ user: user._id, licenceNumber: driver.licenceNumber });
    }
    await Vehicle.findOneAndDelete({ owner: user._id, numberPlate: driver.vehicleNumber });

    // Audit Log
    await AuditLog.create({
      admin: req.user?._id,
      action: 'REJECT_DRIVER',
      target: driver._id.toString(),
      details: `Rejected driver: ${user.name} (${user.email}). Reason: ${reason}`,
      ipAddress: req.ip,
    });

    // Notify user
    await sendDriverRejectionEmail(user.email, user.name, reason, false);
    await sendNotificationToUser(
      user._id.toString(),
      'Driver Registration Rejected',
      `Your driver application was rejected. Reason: ${reason}`,
      'verification_approved',
      driver._id
    );

    res.status(200).json({
      status: 'success',
      message: 'Driver profile application rejected.',
      data: {
        driver,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/drivers/:id/request-resubmission
 * Request driver to re-upload documents
 */
export const requestResubmission = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return next(new AppError('Remarks detailing the resubmission request are required.', 400));
    }

    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return next(new AppError('Driver application profile not found', 404));
    }

    const user = await User.findById(driver.user);
    if (!user) {
      return next(new AppError('User profile linked to driver not found', 404));
    }

    driver.approvalStatus = 'resubmission';
    driver.driverStatus = 'PENDING_APPROVAL';
    driver.rejectionReason = reason;
    driver.paymentStatus = false;
    driver.subscriptionStatus = 'Inactive';
    await driver.save();
    logger.info('Driver Resubmission Requested');

    user.verifiedDriver = false;
    if (user.role === 'driver') {
      user.role = 'student';
    }
    await user.save();

    // Audit Log
    await AuditLog.create({
      admin: req.user?._id,
      action: 'RESUBMIT_DRIVER_DOCS',
      target: driver._id.toString(),
      details: `Requested document resubmission for driver: ${user.name}. Remarks: ${reason}`,
      ipAddress: req.ip,
    });

    // Notify user
    await sendDriverRejectionEmail(user.email, user.name, reason, true);
    await sendNotificationToUser(
      user._id.toString(),
      'Document Resubmission Requested',
      `Please resubmit documents. Remarks: ${reason}`,
      'verification_approved',
      driver._id
    );

    res.status(200).json({
      status: 'success',
      message: 'Resubmission request successfully dispatched to driver.',
      data: {
        driver,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/students
 * Retrieve student registers with status filtering and search
 */
export const getStudents = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { search, status, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Retrieve only non-admin users
    const query: any = { role: { $ne: 'admin' } };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search as string, $options: 'i' } },
        { email: { $regex: search as string, $options: 'i' } },
        { registrationNumber: { $regex: search as string, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(query);
    const students = await User.find(query)
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: students.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: {
        students,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/students/:id/status
 * Toggle student status between active and suspended (banned)
 */
export const toggleStudentStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body; // active or banned

    if (!['active', 'banned'].includes(status)) {
      return next(new AppError('Status must be active or banned', 400));
    }

    const user = await User.findById(id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (user.role === 'admin') {
      return next(new AppError('Banning administrative accounts is prohibited.', 403));
    }

    const oldStatus = user.status;
    user.status = status;
    await user.save();

    // Audit Log
    await AuditLog.create({
      admin: req.user?._id,
      action: status === 'banned' ? 'SUSPEND_USER' : 'ACTIVATE_USER',
      target: user._id.toString(),
      details: `Changed status of ${user.name} (${user.email}) from ${oldStatus} to ${status}`,
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: 'success',
      message: `User status successfully toggled to: ${status}`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/rides
 * Retrieve list of rides with comprehensive filtering
 */
export const getRides = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, search, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};
    if (status) {
      query.status = status;
    }

    if (search) {
      // Find drivers whose names match search
      const matchingDrivers = await User.find({
        role: 'driver',
        name: { $regex: search as string, $options: 'i' },
      });
      const driverIds = matchingDrivers.map((d) => d._id);

      query.$or = [
        { source: { $regex: search as string, $options: 'i' } },
        { destination: { $regex: search as string, $options: 'i' } },
        { driver: { $in: driverIds } },
      ];
    }

    const total = await Ride.countDocuments(query);
    const rides = await Ride.find(query)
      .populate('driver', 'name email profileImage phone rating')
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: rides.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: {
        rides,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/rides/:id
 * Delete/Cancel ride and alert passengers
 */
export const cancelRideAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const ride = await Ride.findById(id);

    if (!ride) {
      return next(new AppError('Ride record not found', 404));
    }

    // Find and update bookings instead of deleting
    const bookings = await Booking.find({ ride: ride._id, status: { $in: ['pending', 'accepted'] } });
    for (const booking of bookings) {
      const previousStatus = booking.status;
      booking.status = 'cancelled';
      
      if (booking.paymentStatus === 'paid' && booking.razorpayPaymentId) {
        const amountInPaise = booking.seatNumber * ride.price * 100;
        const refundSuccess = await refundPayment(booking.razorpayPaymentId, amountInPaise);
        if (refundSuccess) {
          booking.paymentStatus = 'refunded';
        }
      }
      await booking.save();

      if (previousStatus === 'accepted') {
        await Ride.findByIdAndUpdate(ride._id, { $inc: { availableSeats: booking.seatNumber } });
      }

      await sendNotificationToUser(
        booking.passenger.toString(),
        'Ride Cancelled by Admin',
        `The ride from ${ride.source} to ${ride.destination} has been cancelled by an administrator.`,
        'ride_cancelled',
        ride._id
      );
    }

    // Update ride status to cancelled instead of deleting
    ride.status = 'cancelled';
    await ride.save();

    // Audit Log
    await AuditLog.create({
      admin: req.user?._id,
      action: 'CANCEL_RIDE',
      target: id,
      details: `Cancelled and deleted ride: ${ride.source} -> ${ride.destination} posted by driver ID: ${ride.driver}`,
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: 'success',
      message: 'Ride details successfully cancelled and records removed by administrator.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/reports
 * Fetch reported incidents
 */
export const getReports = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reports = await Report.find()
      .populate('reporter', 'name email role')
      .populate('reportedUser', 'name email role status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: {
        reports,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/settings
 * Fetch configuration parameters
 */
export const getSettings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await Setting.find();
    res.status(200).json({
      status: 'success',
      data: {
        settings,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/settings
 * Update administrative configuration settings
 */
export const updateSettings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { settings } = req.body; // expected array of { key: string, value: any }

    if (!Array.isArray(settings)) {
      return next(new AppError('Settings payload must be an array of objects.', 400));
    }

    for (const item of settings) {
      await Setting.findOneAndUpdate(
        { key: item.key },
        { value: item.value },
        { new: true, runValidators: true }
      );
    }

    // Audit Log
    await AuditLog.create({
      admin: req.user?._id,
      action: 'UPDATE_SETTINGS',
      details: `Modified configurations: ${settings.map(s => s.key).join(', ')}`,
      ipAddress: req.ip,
    });

    const updatedSettings = await Setting.find();

    res.status(200).json({
      status: 'success',
      message: 'System configurations successfully updated.',
      data: {
        settings: updatedSettings,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/approvals
 * Fetch pending approvals
 */
export const getApprovals = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    logger.info("Admin Query Executed");
    // Filter Pending/pending approval status
    const query = { approvalStatus: 'pending' };
    const total = await Driver.countDocuments(query);
    logger.info(`Pending Applications Found: ${total}`);

    const drivers = await Driver.find(query).populate(
      'user',
      'name email profileImage branch year status verifiedStudent verifiedDriver role phone'
    );

    res.status(200).json({
      status: 'success',
      results: drivers.length,
      data: {
        drivers,
      },
    });
  } catch (error) {
    next(error);
  }
};
