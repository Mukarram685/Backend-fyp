import Booking from '../model/Booking.model.js';
import Schedule from '../model/Schedule.model.js';
import { sendError } from '../helper/Error.helper.js';
import RouteModel from '../model/Route.model.js';

export const bookSeats = async (req, res) => {
  try {
    const { scheduleId, seats } = req.body; // seats = array of objects
    const booker = req.user; // The person who is paying

    if (!scheduleId || !seats || !Array.isArray(seats) || seats.length === 0) {
      return sendError(res, 400, "scheduleId and seats array are required");
    }

    if (seats.length > 10) {
      return sendError(res, 400, "Maximum 10 seats allowed per booking");
    }

    const schedule = await Schedule.findById(scheduleId)
      .populate('route bus company');

    if (!schedule) return sendError(res, 404, "Schedule not found");
    if (schedule.status !== 'active') return sendError(res, 400, "This trip is no longer available");
    if (schedule.availableSeats < seats.length) return sendError(res, 400, "Not enough seats available");

    const requestedSeatNumbers = seats.map(s => s.seatNumber);

    const alreadyBooked = schedule.bookedSeats.some(seat => requestedSeatNumbers.includes(seat));
    if (alreadyBooked) {
      return sendError(res, 400, "One or more selected seats are already booked");
    }

    for (let seat of seats) {
      if (!seat.seatNumber || !seat.passengerName || !seat.passengerCNIC || !seat.passengerPhone || !seat.gender) {
        return sendError(res, 400, "All fields required for each passenger");
      }
      if (!['Male', 'Female'].includes(seat.gender)) {
        return sendError(res, 400, "Gender must be Male or Female");
      }
      if (!/^\d{5}-\d{7}-\d$/.test(seat.passengerCNIC)) {
        return sendError(res, 400, `Invalid CNIC format: ${seat.passengerCNIC}`);
      }
    }

    const booking = await Booking.create({
      schedule: scheduleId,
      passenger: booker._id, // The person who logged in & paid
      seats: seats, // Full passenger details for each seat
      totalAmount: schedule.fare * seats.length,
      company: schedule.company._id,
      paymentStatus: 'paid', // Change later if using payment gateway
    });

    schedule.bookedSeats.push(...requestedSeatNumbers);
    schedule.availableSeats -= seats.length;
    await schedule.save();

    await booking.populate([
      { path: 'schedule', populate: [
        { path: 'route', select: 'fromCity toCity from to duration' },
        { path: 'bus', select: 'busNumber type totalSeats amenities' },
        { path: 'company', select: 'name' }
      ]},
      { path: 'passenger', select: 'name email phone' }
    ]);

    const ticketDetails = {
      pnr: booking.pnr,
      bookingId: booking._id,
      bookerName: booker.name,
      bookerPhone: booker.phone || booker.email,
      fromCity: schedule.route.fromCity,
      toCity: schedule.route.toCity,
      fromTerminal: schedule.route.from,
      toTerminal: schedule.route.to,
      travelDate: schedule.departureDate.toISOString().split('T')[0],
      departureTime: schedule.departureTime,
      arrivalTime: schedule.arrivalTime,
      busNumber: schedule.bus.busNumber,
      busType: schedule.bus.type,
      companyName: schedule.company.name,
      totalFare: booking.totalAmount,
      totalSeats: seats.length,
      passengers: seats.map(s => ({
        seatNumber: s.seatNumber,
        name: s.passengerName,
        cnic: s.passengerCNIC,
        phone: s.passengerPhone,
        gender: s.gender
      }))
    };

    res.status(201).json({
      success: true,
      message: "Booking confirmed successfully!",
      ticket: ticketDetails
    });

  } catch (error) {
    console.error("Booking Error:", error);
    sendError(res, 500, "Booking failed. Please try again.");
  }
};


export const myBookings = async (req, res) => {
  const bookings = await Booking.find({ passenger: req.user._id })
    .populate('schedule', 'departureDate departureTime')
    .populate('schedule.route', 'fromCity toCity from to')
    .populate('schedule.bus', 'busNumber')
    .sort({ createdAt: -1 });

  res.json({ success: true, count: bookings.length, bookings });
};


// 1. Get all bookings for a specific schedule (trip) - Operator / CompanyAdmin
export const getScheduleBookings = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const user = req.user;

    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) return sendError(res, 404, "Schedule not found");

    // Security: Only allow if user belongs to same company
    if (user.role === 'operator' || user.role === 'companyadmin') {
      if (schedule.company.toString() !== user.company.toString()) {
        return sendError(res, 403, "Not authorized to view this trip");
      }
    }

    const bookings = await Booking.find({ schedule: scheduleId })
      .populate('passenger', 'name email phone')
      .populate('schedule', 'departureDate departureTime')
      .populate('schedule.route', 'fromCity toCity')
      .populate('schedule.bus', 'busNumber')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      scheduleId,
      totalBookings: bookings.length,
      totalRevenue: bookings.reduce((sum, b) => sum + b.totalAmount, 0),
      bookings
    });

  } catch (error) {
    console.error(error);
    sendError(res, 500, "Failed to fetch bookings");
  }
};


export const getRouteBookings = async (req, res) => {
  try {
    const { routeId } = req.params;
    const user = req.user;

    const route = await RouteModel.findById(routeId);
    if (!route) return sendError(res, 404, "Route not found");

    if (['companyadmin', 'operator'].includes(user.role)) {
      if (route.company.toString() !== user.company.toString()) {
        return sendError(res, 403, "This route doesn't belong to your company");
      }
    }

    const schedules = await Schedule.find({ route: routeId }).select('_id');
    const scheduleIds = schedules.map(s => s._id);

    if (scheduleIds.length === 0) {
      return res.json({
        success: true,
        route: `${route.fromCity} → ${route.toCity}`,
        totalBookings: 0,
        totalRevenue: 0,
        bookings: []
      });
    }

    const bookings = await Booking.find({ schedule: { $in: scheduleIds } })
      .populate('passenger', 'name email phone')
      .populate({
        path: 'schedule',
        select: 'departureDate departureTime fare',
        populate: [
          { path: 'route', select: 'fromCity toCity from to' },
          { path: 'bus', select: 'busNumber type' }
        ]
      })
      .sort({ 'schedule.departureDate': -1 });

    const totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalAmount, 0);

    res.json({
      success: true,
      route: `${route.fromCity} → ${route.toCity}`,
      totalBookings: bookings.length,
      totalRevenue,
      bookings
    });

  } catch (error) {
    console.error("getRouteBookings Error:", error);
    sendError(res, 500, "Failed to fetch route bookings");
  }
};


export const getCompanyBookings = async (req, res) => {
  try {
    const user = req.user;

    let query = {};
    if (user.role === 'companyadmin') {
      query = { company: user.company };
    }

    console.log("Company Bookings Query:", query);

    
    const bookings = await Booking.find(query)
      .populate('passenger', 'name email')
      .populate('schedule', 'departureDate departureTime')
      .populate('schedule.route', 'fromCity toCity')
      .populate('schedule.bus', 'busNumber')
      .populate('company', 'name')
      .sort({ createdAt: -1 });

    const totalRevenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);

    res.json({
      success: true,
      role: user.role,
      totalBookings: bookings.length,
      totalRevenue,
      dateRange: {
        from: bookings[bookings.length - 1]?.createdAt || new Date(),
        to: bookings[0]?.createdAt || new Date()
      },
      bookings
    });

  } catch (error) {
    console.error(error);
    sendError(res, 500, "Failed to fetch company bookings");
  }
};