"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRideRequest = exports.getActiveRideRequests = exports.createRideRequest = exports.updateRideStatus = exports.getRideDetails = exports.searchRides = exports.offerRide = void 0;
const Ride_1 = __importDefault(require("../models/Ride"));
const Vehicle_1 = __importDefault(require("../models/Vehicle"));
const User_1 = __importDefault(require("../models/User"));
const RideRequest_1 = __importDefault(require("../models/RideRequest"));
const appError_1 = __importDefault(require("../utils/appError"));
const Booking_1 = __importDefault(require("../models/Booking"));
const notificationController_1 = require("./notificationController");
const paymentController_1 = require("./paymentController");
const offerRide = async (req, res, next) => {
    try {
        const { vehicleId, source, destination, pickupLocation, dropLocation, departureDate, departureTime, price, availableSeats, description, recurring, routePoints, } = req.body;
        if (!req.user)
            return next(new appError_1.default('Unauthorized', 401));
        // Verify driver has a verified vehicle matching vehicleId
        const vehicle = await Vehicle_1.default.findById(vehicleId);
        if (!vehicle) {
            return next(new appError_1.default('Vehicle not found', 404));
        }
        if (vehicle.owner.toString() !== req.user.id) {
            return next(new appError_1.default('You do not own this vehicle', 403));
        }
        if (vehicle.status !== 'verified') {
            return next(new appError_1.default('Your vehicle must be approved by an admin before you can offer a ride.', 403));
        }
        const seats = Number(availableSeats);
        if (!Number.isFinite(seats) || seats < 1) {
            return next(new appError_1.default('Available seats must be at least 1', 400));
        }
        if (seats > vehicle.seats) {
            return next(new appError_1.default(`Available seats cannot exceed vehicle capacity (${vehicle.seats})`, 400));
        }
        // Reject past departure times
        const departure = new Date(departureDate);
        if (Number.isNaN(departure.getTime())) {
            return next(new appError_1.default('Invalid departure date', 400));
        }
        const [hh, mm] = String(departureTime).split(':').map(Number);
        departure.setHours(hh || 0, mm || 0, 0, 0);
        if (departure.getTime() < Date.now()) {
            return next(new appError_1.default('Departure time must be in the future', 400));
        }
        const ride = await Ride_1.default.create({
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
    }
    catch (error) {
        next(error);
    }
};
exports.offerRide = offerRide;
const searchRides = async (req, res, next) => {
    try {
        const { source, destination, date, vehicleType, seats, minPrice, maxPrice, sort, page = 1, limit = 10, } = req.query;
        if (!req.user)
            return next(new appError_1.default('Unauthorized', 401));
        // 1) Find users who blocked me or whom I blocked to exclude them
        const blockerList = req.user.blockedUsers || [];
        const usersWhoBlockedMe = await User_1.default.find({ blockedUsers: req.user.id }).select('_id');
        const excludeUserIds = [...blockerList, ...usersWhoBlockedMe.map((u) => u._id)];
        // 2) Build filters
        const filter = {
            driver: { $nin: excludeUserIds },
            status: 'scheduled',
        };
        if (source) {
            filter.source = { $regex: source, $options: 'i' };
        }
        if (destination) {
            filter.destination = { $regex: destination, $options: 'i' };
        }
        if (date) {
            // Find matches on the same day
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            filter.departureDate = { $gte: startOfDay, $lte: endOfDay };
        }
        if (seats) {
            filter.availableSeats = { $gte: parseInt(seats, 10) };
        }
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice)
                filter.price.$gte = parseFloat(minPrice);
            if (maxPrice)
                filter.price.$lte = parseFloat(maxPrice);
        }
        // 3) Filter by vehicle type (join query on Vehicle)
        if (vehicleType) {
            const vehiclesOfType = await Vehicle_1.default.find({ type: vehicleType }).select('_id');
            filter.vehicle = { $in: vehiclesOfType.map((v) => v._id) };
        }
        // 4) Execute sorting
        let sortOptions = { departureDate: 1, departureTime: 1 }; // Default: earliest
        if (sort === 'lowest_price') {
            sortOptions = { price: 1 };
        }
        else if (sort === 'earliest_time') {
            sortOptions = { departureDate: 1, departureTime: 1 };
        }
        else if (sort === 'highest_driver_rating') {
            // Sorted on driver rating inside populate, or sort manual. 
            // For mongoose, sort by driver rating requires an aggregation pipeline, but we can do a default sort
            // and sort client-side, or sort here. We will default to rating sort by fetching user records
            const highRatedDrivers = await User_1.default.find({ role: 'driver' }).sort({ rating: -1 }).select('_id');
            sortOptions = { driver: highRatedDrivers.map((d) => d._id) }; // placeholder
        }
        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        let rides;
        if (sort === 'highest_driver_rating') {
            // Use aggregation pipeline to sort globally by driver rating before skip & limit
            const pipeline = [
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
                // Sort by driver rating
                { $sort: { 'driverInfo.rating': -1, departureDate: 1 } },
                // Pagination
                { $skip: skip },
                { $limit: parseInt(limit, 10) },
                // Project to map fields like populate
                {
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
                },
            ];
            rides = await Ride_1.default.aggregate(pipeline);
        }
        else {
            rides = await Ride_1.default.find(filter)
                .populate('driver', 'name email profileImage rating verifiedDriver trustScore')
                .populate('vehicle', 'brand model type numberPlate color')
                .sort(sortOptions)
                .skip(skip)
                .limit(parseInt(limit, 10));
        }
        const total = await Ride_1.default.countDocuments(filter);
        res.status(200).json({
            status: 'success',
            results: rides.length,
            total,
            data: {
                rides,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.searchRides = searchRides;
const getRideDetails = async (req, res, next) => {
    try {
        const ride = await Ride_1.default.findById(req.params.id)
            .populate('driver', 'name email phone profileImage rating verifiedDriver trustScore branch year registrationNumber')
            .populate('vehicle', 'brand model type color numberPlate seats');
        if (!ride) {
            return next(new appError_1.default('No ride found with that ID', 404));
        }
        res.status(200).json({
            status: 'success',
            data: {
                ride,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getRideDetails = getRideDetails;
const updateRideStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const allowedStatuses = ['ongoing', 'completed', 'cancelled'];
        if (!allowedStatuses.includes(status)) {
            return next(new appError_1.default('Status must be ongoing, completed, or cancelled', 400));
        }
        const ride = await Ride_1.default.findById(id);
        if (!ride) {
            return next(new appError_1.default('Ride not found', 404));
        }
        if (ride.driver.toString() !== req.user?.id && req.user?.role !== 'admin') {
            return next(new appError_1.default('You are not authorized to update this ride status', 403));
        }
        const transitions = {
            scheduled: ['ongoing', 'cancelled'],
            ongoing: ['completed', 'cancelled'],
            completed: [],
            cancelled: [],
        };
        if (!transitions[ride.status]?.includes(status)) {
            return next(new appError_1.default(`Cannot change ride status from "${ride.status}" to "${status}"`, 400));
        }
        const bookings = await Booking_1.default.find({
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
                    const refundSuccess = await (0, paymentController_1.refundPayment)(booking.razorpayPaymentId, amountInPaise);
                    if (refundSuccess) {
                        booking.paymentStatus = 'refunded';
                    }
                }
                booking.status = 'cancelled';
                await booking.save();
                if (previousBookingStatus === 'accepted') {
                    await Ride_1.default.findByIdAndUpdate(ride._id, {
                        $inc: { availableSeats: booking.seatNumber },
                    });
                }
                await (0, notificationController_1.sendNotificationToUser)(booking.passenger.toString(), 'Ride Cancelled by Driver', `Your ride from ${ride.source} to ${ride.destination} has been cancelled by the driver.`, 'ride_cancelled', ride._id);
            }
            else if (status === 'completed') {
                if (previousBookingStatus === 'accepted') {
                    booking.status = 'completed';
                    await booking.save();
                    await (0, notificationController_1.sendNotificationToUser)(booking.passenger.toString(), 'Ride Completed', `Your ride from ${ride.source} to ${ride.destination} was completed.`, 'ride_accepted', ride._id);
                }
                else {
                    booking.status = 'expired';
                    await booking.save();
                }
            }
            else {
                // ongoing
                if (previousBookingStatus === 'accepted') {
                    await (0, notificationController_1.sendNotificationToUser)(booking.passenger.toString(), 'Ride Started', `Your ride from ${ride.source} to ${ride.destination} is now ongoing.`, 'ride_accepted', ride._id);
                }
            }
        }
        if (status === 'completed') {
            await User_1.default.findByIdAndUpdate(ride.driver, { $inc: { totalTrips: 1 } });
            const completedPassengerIds = bookings
                .filter((b) => b.status === 'completed')
                .map((b) => b.passenger);
            for (const passengerId of completedPassengerIds) {
                await User_1.default.findByIdAndUpdate(passengerId, { $inc: { totalTrips: 1 } });
            }
        }
        res.status(200).json({
            status: 'success',
            data: {
                ride,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateRideStatus = updateRideStatus;
// Ride Requests endpoints
const createRideRequest = async (req, res, next) => {
    try {
        const { source, destination, pickupLocation, dropLocation, departureDate, departureTime, seatsNeeded, description, } = req.body;
        if (!req.user)
            return next(new appError_1.default('Unauthorized', 401));
        const rideReq = await RideRequest_1.default.create({
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
    }
    catch (error) {
        next(error);
    }
};
exports.createRideRequest = createRideRequest;
const getActiveRideRequests = async (req, res, next) => {
    try {
        const requests = await RideRequest_1.default.find({ status: 'active' })
            .populate('user', 'name email profileImage rating trustScore')
            .sort({ departureDate: 1 });
        res.status(200).json({
            status: 'success',
            results: requests.length,
            data: {
                rideRequests: requests,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getActiveRideRequests = getActiveRideRequests;
const deleteRideRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const request = await RideRequest_1.default.findById(id);
        if (!request) {
            return next(new appError_1.default('Ride request not found', 404));
        }
        if (request.user.toString() !== req.user?.id && req.user?.role !== 'admin') {
            return next(new appError_1.default('Unauthorized', 403));
        }
        request.status = 'cancelled';
        await request.save();
        res.status(200).json({
            status: 'success',
            message: 'Ride request cancelled successfully',
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteRideRequest = deleteRideRequest;
