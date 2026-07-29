"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApprovals = exports.updateSettings = exports.getSettings = exports.getReports = exports.cancelRideAdmin = exports.getRides = exports.toggleStudentStatus = exports.getStudents = exports.requestResubmission = exports.rejectDriver = exports.approveDriver = exports.getDriverById = exports.getDrivers = exports.getDashboardStats = exports.adminLogin = void 0;
const User_1 = __importDefault(require("../models/User"));
const Vehicle_1 = __importDefault(require("../models/Vehicle"));
const DrivingLicence_1 = __importDefault(require("../models/DrivingLicence"));
const Ride_1 = __importDefault(require("../models/Ride"));
const Booking_1 = __importDefault(require("../models/Booking"));
const Report_1 = __importDefault(require("../models/Report"));
const Driver_1 = __importDefault(require("../models/Driver"));
const Setting_1 = __importDefault(require("../models/Setting"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const appError_1 = __importDefault(require("../utils/appError"));
const notificationController_1 = require("./notificationController");
const logger_1 = __importDefault(require("../utils/logger"));
const jwt_1 = require("../utils/jwt");
const emailService_1 = require("../services/emailService");
/**
 * POST /api/admin/login
 * Dedicated Administrator Authenticator
 */
const adminLogin = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return next(new appError_1.default('Please provide email and password', 400));
        }
        const user = await User_1.default.findOne({ email }).select('+password');
        if (!user || !(await user.comparePassword(password))) {
            return next(new appError_1.default('Incorrect email or password.', 401));
        }
        if (user.role !== 'admin') {
            return next(new appError_1.default('Access Denied: You are not authorized as an administrator.', 403));
        }
        if (user.status === 'banned') {
            return next(new appError_1.default('Your admin account has been suspended.', 403));
        }
        // Generate JWTs
        const accessToken = (0, jwt_1.createAccessToken)(user);
        const refreshToken = (0, jwt_1.createRefreshToken)(user);
        // Secure HTTP-only refresh cookie
        const cookieOptions = {
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'none',
        };
        res.cookie('jwt', refreshToken, cookieOptions);
        user.password = undefined;
        // Log the successful login in AuditLog
        await AuditLog_1.default.create({
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
    }
    catch (error) {
        next(error);
    }
};
exports.adminLogin = adminLogin;
/**
 * GET /api/admin/dashboard
 * Fetch analytical metrics and statistics for visual graphs
 */
const getDashboardStats = async (req, res, next) => {
    try {
        const totalUsers = await User_1.default.countDocuments();
        const totalStudents = await User_1.default.countDocuments({ role: 'student' });
        const totalDriversCount = await User_1.default.countDocuments({ role: 'driver' });
        const pendingApprovalsCount = await Driver_1.default.countDocuments({ approvalStatus: 'pending' });
        const approvedDriversCount = await Driver_1.default.countDocuments({ approvalStatus: 'approved' });
        // Rides stats
        const completedTrips = await Ride_1.default.countDocuments({ status: 'completed' });
        const cancelledTrips = await Ride_1.default.countDocuments({ status: 'cancelled' });
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayTrips = await Ride_1.default.countDocuments({ createdAt: { $gte: todayStart } });
        // Calculate revenue
        const bookings = await Booking_1.default.find({ status: 'accepted' }).populate('ride').exec();
        let revenue = 0;
        bookings.forEach((booking) => {
            if (booking.ride && booking.ride.status === 'completed') {
                revenue += (booking.seatNumber || 1) * (booking.ride.price || 0);
            }
        });
        // Registrations Grouped by Date (7 Days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const registrationsTrend = await User_1.default.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);
        // Ride Growth Trend (7 Days)
        const rideTrend = await Ride_1.default.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);
        // Approval Status Trends
        const approvalTrends = await Driver_1.default.aggregate([
            {
                $group: {
                    _id: '$approvalStatus',
                    count: { $sum: 1 },
                },
            },
        ]);
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
    }
    catch (error) {
        next(error);
    }
};
exports.getDashboardStats = getDashboardStats;
/**
 * GET /api/admin/drivers
 * Retrieve list of driver profiles with search and status filters
 */
const getDrivers = async (req, res, next) => {
    try {
        const { approvalStatus, search, page = '1', limit = '10' } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        const query = {};
        if (approvalStatus) {
            query.approvalStatus = approvalStatus;
        }
        if (search) {
            const matchingUsers = await User_1.default.find({
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                ],
            });
            const userIds = matchingUsers.map((u) => u._id);
            query.user = { $in: userIds };
        }
        logger_1.default.info("Admin Query Executed");
        const total = await Driver_1.default.countDocuments(query);
        logger_1.default.info(`Pending Applications Found: ${total}`);
        const drivers = await Driver_1.default.find(query)
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
    }
    catch (error) {
        next(error);
    }
};
exports.getDrivers = getDrivers;
/**
 * GET /api/admin/drivers/:id
 * Retrieve details of a single driver profile
 */
const getDriverById = async (req, res, next) => {
    try {
        const driver = await Driver_1.default.findById(req.params.id).populate('user', 'name email profileImage branch year status verifiedStudent verifiedDriver role phone');
        if (!driver) {
            return next(new appError_1.default('No driver application found with this ID', 404));
        }
        res.status(200).json({
            status: 'success',
            data: {
                driver,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getDriverById = getDriverById;
/**
 * PUT /api/admin/drivers/:id/approve
 * Set driver profile as Approved and enable ride offer options
 */
const approveDriver = async (req, res, next) => {
    try {
        const driver = await Driver_1.default.findById(req.params.id);
        if (!driver) {
            return next(new appError_1.default('Driver application profile not found', 404));
        }
        const user = await User_1.default.findById(driver.user);
        if (!user) {
            return next(new appError_1.default('User profile linked to driver not found', 404));
        }
        // Set statuses
        driver.approvalStatus = 'Approved';
        driver.driverStatus = 'PAYMENT_PENDING';
        driver.rejectionReason = undefined;
        await driver.save();
        logger_1.default.info("Driver Approved");
        user.verifiedDriver = false; // Must pay first before role upgrades
        await user.save();
        // Create or sync details
        await DrivingLicence_1.default.findOneAndUpdate({ user: user._id }, {
            licenceNumber: driver.licenceNumber,
            expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year fallback
            frontImage: driver.licenceImage,
            backImage: driver.licenceImage,
            status: 'verified',
            verifiedBy: req.user?.id,
            verifiedAt: new Date(),
        }, { upsert: true, new: true });
        await Vehicle_1.default.findOneAndUpdate({ owner: user._id }, {
            type: driver.vehicleType,
            brand: driver.vehicleModel.split(' ')[0] || 'Unknown',
            model: driver.vehicleModel,
            numberPlate: driver.vehicleNumber,
            color: driver.vehicleColour,
            seats: driver.vehicleType === 'car' ? 4 : 1,
            rcImage: driver.rcImage,
            verified: true,
            status: 'verified',
        }, { upsert: true, new: true });
        // Audit Log
        await AuditLog_1.default.create({
            admin: req.user?._id,
            action: 'APPROVE_DRIVER',
            target: driver._id.toString(),
            details: `Approved driver: ${user.name} (${user.email}). Vehicle: ${driver.vehicleNumber}`,
            ipAddress: req.ip,
        });
        // Notify user
        await (0, emailService_1.sendDriverApprovalEmail)(user.email, user.name);
        await (0, notificationController_1.sendNotificationToUser)(user._id.toString(), 'Driver Registration Approved!', 'Your driver account has been successfully approved. You are ready to host rides.', 'verification_approved', driver._id);
        res.status(200).json({
            status: 'success',
            message: 'Driver profile successfully approved and synchronized.',
            data: {
                driver,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.approveDriver = approveDriver;
/**
 * PUT /api/admin/drivers/:id/reject
 * Reject driver registration with a mandatory reason
 */
const rejectDriver = async (req, res, next) => {
    try {
        const { reason } = req.body;
        if (!reason) {
            return next(new appError_1.default('A rejection reason is required.', 400));
        }
        const driver = await Driver_1.default.findById(req.params.id);
        if (!driver) {
            return next(new appError_1.default('Driver application profile not found', 404));
        }
        const user = await User_1.default.findById(driver.user);
        if (!user) {
            return next(new appError_1.default('User profile linked to driver not found', 404));
        }
        driver.approvalStatus = 'Rejected';
        driver.driverStatus = 'PENDING_APPROVAL';
        driver.rejectionReason = reason;
        await driver.save();
        logger_1.default.info("Driver Rejected");
        user.verifiedDriver = false;
        // Don't force reset their role to student if they have active trips, but standard behavior:
        if (user.role === 'driver') {
            user.role = 'student';
        }
        await user.save();
        // Clear vehicles & licences
        await DrivingLicence_1.default.findOneAndDelete({ user: user._id });
        await Vehicle_1.default.findOneAndDelete({ owner: user._id });
        // Audit Log
        await AuditLog_1.default.create({
            admin: req.user?._id,
            action: 'REJECT_DRIVER',
            target: driver._id.toString(),
            details: `Rejected driver: ${user.name} (${user.email}). Reason: ${reason}`,
            ipAddress: req.ip,
        });
        // Notify user
        await (0, emailService_1.sendDriverRejectionEmail)(user.email, user.name, reason, false);
        await (0, notificationController_1.sendNotificationToUser)(user._id.toString(), 'Driver Registration Rejected', `Your driver application was rejected. Reason: ${reason}`, 'verification_approved', driver._id);
        res.status(200).json({
            status: 'success',
            message: 'Driver profile application rejected.',
            data: {
                driver,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.rejectDriver = rejectDriver;
/**
 * PUT /api/admin/drivers/:id/request-resubmission
 * Request driver to re-upload documents
 */
const requestResubmission = async (req, res, next) => {
    try {
        const { reason } = req.body;
        if (!reason) {
            return next(new appError_1.default('Remarks detailing the resubmission request are required.', 400));
        }
        const driver = await Driver_1.default.findById(req.params.id);
        if (!driver) {
            return next(new appError_1.default('Driver application profile not found', 404));
        }
        const user = await User_1.default.findById(driver.user);
        if (!user) {
            return next(new appError_1.default('User profile linked to driver not found', 404));
        }
        driver.approvalStatus = 'resubmission';
        driver.rejectionReason = reason;
        await driver.save();
        logger_1.default.info("Driver Resubmission Requested");
        user.verifiedDriver = false;
        if (user.role === 'driver') {
            user.role = 'student';
        }
        await user.save();
        // Audit Log
        await AuditLog_1.default.create({
            admin: req.user?._id,
            action: 'RESUBMIT_DRIVER_DOCS',
            target: driver._id.toString(),
            details: `Requested document resubmission for driver: ${user.name}. Remarks: ${reason}`,
            ipAddress: req.ip,
        });
        // Notify user
        await (0, emailService_1.sendDriverRejectionEmail)(user.email, user.name, reason, true);
        await (0, notificationController_1.sendNotificationToUser)(user._id.toString(), 'Document Resubmission Requested', `Please resubmit documents. Remarks: ${reason}`, 'verification_approved', driver._id);
        res.status(200).json({
            status: 'success',
            message: 'Resubmission request successfully dispatched to driver.',
            data: {
                driver,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.requestResubmission = requestResubmission;
/**
 * GET /api/admin/students
 * Retrieve student registers with status filtering and search
 */
const getStudents = async (req, res, next) => {
    try {
        const { search, status, page = '1', limit = '10' } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        // Retrieve only non-admin users
        const query = { role: { $ne: 'admin' } };
        if (status) {
            query.status = status;
        }
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { registrationNumber: { $regex: search, $options: 'i' } },
            ];
        }
        const total = await User_1.default.countDocuments(query);
        const students = await User_1.default.find(query)
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
    }
    catch (error) {
        next(error);
    }
};
exports.getStudents = getStudents;
/**
 * PATCH /api/admin/students/:id/status
 * Toggle student status between active and suspended (banned)
 */
const toggleStudentStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // active or banned
        if (!['active', 'banned'].includes(status)) {
            return next(new appError_1.default('Status must be active or banned', 400));
        }
        const user = await User_1.default.findById(id);
        if (!user) {
            return next(new appError_1.default('User not found', 404));
        }
        if (user.role === 'admin') {
            return next(new appError_1.default('Banning administrative accounts is prohibited.', 403));
        }
        const oldStatus = user.status;
        user.status = status;
        await user.save();
        // Audit Log
        await AuditLog_1.default.create({
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
    }
    catch (error) {
        next(error);
    }
};
exports.toggleStudentStatus = toggleStudentStatus;
/**
 * GET /api/admin/rides
 * Retrieve list of rides with comprehensive filtering
 */
const getRides = async (req, res, next) => {
    try {
        const { status, search, page = '1', limit = '10' } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        const query = {};
        if (status) {
            query.status = status;
        }
        if (search) {
            // Find drivers whose names match search
            const matchingDrivers = await User_1.default.find({
                role: 'driver',
                name: { $regex: search, $options: 'i' },
            });
            const driverIds = matchingDrivers.map((d) => d._id);
            query.$or = [
                { source: { $regex: search, $options: 'i' } },
                { destination: { $regex: search, $options: 'i' } },
                { driver: { $in: driverIds } },
            ];
        }
        const total = await Ride_1.default.countDocuments(query);
        const rides = await Ride_1.default.find(query)
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
    }
    catch (error) {
        next(error);
    }
};
exports.getRides = getRides;
/**
 * DELETE /api/admin/rides/:id
 * Delete/Cancel ride and alert passengers
 */
const cancelRideAdmin = async (req, res, next) => {
    try {
        const { id } = req.params;
        const ride = await Ride_1.default.findById(id);
        if (!ride) {
            return next(new appError_1.default('Ride record not found', 404));
        }
        // Alert passengers
        const bookings = await Booking_1.default.find({ ride: ride._id, status: 'accepted' });
        for (const booking of bookings) {
            await (0, notificationController_1.sendNotificationToUser)(booking.passenger.toString(), 'Ride Cancelled by Admin', `The ride from ${ride.source} to ${ride.destination} has been cancelled by an administrator.`, 'ride_cancelled', ride._id);
        }
        // Delete bookings
        await Booking_1.default.deleteMany({ ride: ride._id });
        // Remove ride
        await Ride_1.default.findByIdAndDelete(id);
        // Audit Log
        await AuditLog_1.default.create({
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
    }
    catch (error) {
        next(error);
    }
};
exports.cancelRideAdmin = cancelRideAdmin;
/**
 * GET /api/admin/reports
 * Fetch reported incidents
 */
const getReports = async (req, res, next) => {
    try {
        const reports = await Report_1.default.find()
            .populate('reporter', 'name email role')
            .populate('reportedUser', 'name email role status')
            .sort({ createdAt: -1 });
        res.status(200).json({
            status: 'success',
            data: {
                reports,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getReports = getReports;
/**
 * GET /api/admin/settings
 * Fetch configuration parameters
 */
const getSettings = async (req, res, next) => {
    try {
        const settings = await Setting_1.default.find();
        res.status(200).json({
            status: 'success',
            data: {
                settings,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getSettings = getSettings;
/**
 * PUT /api/admin/settings
 * Update administrative configuration settings
 */
const updateSettings = async (req, res, next) => {
    try {
        const { settings } = req.body; // expected array of { key: string, value: any }
        if (!Array.isArray(settings)) {
            return next(new appError_1.default('Settings payload must be an array of objects.', 400));
        }
        for (const item of settings) {
            await Setting_1.default.findOneAndUpdate({ key: item.key }, { value: item.value }, { new: true, runValidators: true });
        }
        // Audit Log
        await AuditLog_1.default.create({
            admin: req.user?._id,
            action: 'UPDATE_SETTINGS',
            details: `Modified configurations: ${settings.map(s => s.key).join(', ')}`,
            ipAddress: req.ip,
        });
        const updatedSettings = await Setting_1.default.find();
        res.status(200).json({
            status: 'success',
            message: 'System configurations successfully updated.',
            data: {
                settings: updatedSettings,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateSettings = updateSettings;
/**
 * GET /api/admin/approvals
 * Fetch pending approvals
 */
const getApprovals = async (req, res, next) => {
    try {
        logger_1.default.info("Admin Query Executed");
        // Filter Pending/pending approval status
        const query = { approvalStatus: { $in: ['Pending', 'pending'] } };
        const total = await Driver_1.default.countDocuments(query);
        logger_1.default.info(`Pending Applications Found: ${total}`);
        const drivers = await Driver_1.default.find(query).populate('user', 'name email profileImage branch year status verifiedStudent verifiedDriver role phone');
        res.status(200).json({
            status: 'success',
            results: drivers.length,
            data: {
                drivers,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getApprovals = getApprovals;
