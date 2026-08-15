import Schedule from '../../model/Schedule.model.js';
import Route from '../../model/Route.model.js';
import Bus from '../../model/Bus.model.js';
import User from '../../model/User.model.js';
import { sendError } from '../../helper/Error.helper.js';
import { logActivity } from '../../helper/Audit.helper.js';

const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

export const createSchedule = async (req, res) => {
  try {
    const {
      routeId,
      busId,
      operatorId,        // Direct operator assignment
      departureDate,     // "2025-04-15"
      departureTime,     // "14:30"
      arrivalTime,       // "20:00"
      fare
    } = req.body;

    const user = req.user;

    if (!["companyadmin", "superadmin"].includes(user.role)) {
      return sendError(res, 403, "Not authorized");
    }

    const routeQuery = user.role === 'superadmin' ? { _id: routeId } : { _id: routeId, company: user.company };
    const route = await Route.findOne(routeQuery);
    if (!route) return sendError(res, 404, "Route not found or not yours");

    const busQuery = user.role === 'superadmin' ? { _id: busId, status: 'active' } : { _id: busId, company: user.company, status: 'active' };
    const bus = await Bus.findOne(busQuery);
    if (!bus) return sendError(res, 404, "Bus not found or inactive");

    const operatorQuery = user.role === 'superadmin' ? { _id: operatorId, role: 'operator' } : { _id: operatorId, role: 'operator', company: user.company };
    const operator = await User.findOne(operatorQuery);
    if (!operator) return sendError(res, 404, "Operator not found or belongs to another company");

    const busConflict = await Schedule.findOne({
      bus: busId,
      departureDate: new Date(departureDate),
      status: 'active'
    });
    if (busConflict) return sendError(res, 400, "This bus is already scheduled on this date");

    const newStart = timeToMinutes(departureTime);
    const newEnd = timeToMinutes(arrivalTime);

    const operatorSchedules = await Schedule.find({
      operator: operatorId,
      departureDate: new Date(departureDate),
      status: 'active'
    });

    for (const existing of operatorSchedules) {
      const exStart = timeToMinutes(existing.departureTime);
      const exEnd = timeToMinutes(existing.arrivalTime);

      if (newStart < exEnd && newEnd > exStart) {
        return sendError(res, 400, `Operator is already assigned to another trip (${existing.departureTime} - ${existing.arrivalTime}) at this time.`);
      }
    }

    const schedule = await Schedule.create({
      route: routeId,
      bus: busId,
      operator: operatorId,
      departureDate: new Date(departureDate),
      departureTime,
      arrivalTime,
      fare,
      availableSeats: bus.totalSeats,
      company: user.role === 'superadmin' ? bus.company : user.company,
      createdBy: user._id,
    });

    await logActivity(req, 'create_schedule', 'Schedule', schedule._id, `Schedule created for ${departureDate}`);

    await schedule.populate([
      { path: "route", select: "fromCity toCity from to" },
      { path: "bus", select: "busNumber type amenities" },
      { path: "operator", select: "name email" }
    ]);

    res.status(201).json({
      success: true,
      message: "Schedule created successfully",
      schedule
    });

  } catch (error) {
    console.error("CreateSchedule Error:", error);
    sendError(res, 500, "Server error during schedule creation");
  }
};


export const getCompanySchedules = async (req, res) => {
  try {
    const query = req.user.role === 'superadmin' ? {} : { company: req.user.company };
    const schedules = await Schedule.find(query)
      .populate("route", "fromCity toCity from to")
      .populate("bus", "busNumber type totalSeats")
      .populate("operator", "name email")
      .sort({ departureDate: 1, departureTime: 1 });

    res.json({ success: true, count: schedules.length, schedules });
  } catch (error) {
    sendError(res, 500, "Server error");
  }
};

export const searchSchedules = async (req, res) => {
  try {
    const { fromCity, toCity, date, startDate, endDate } = req.query;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let query = {
      status: 'active',
      availableSeats: { $gt: 0 },
    };

    if (fromCity && toCity) {
      const normalize = (value) => value.trim().replace(/\s+/g, " ");
      const routes = await Route.find({
        fromCity: {
          $regex: normalize(fromCity),
          $options: "i",
        },
        toCity: {
          $regex: normalize(toCity),
          $options: "i",
        },
      }).select("_id");

      const routeIds = routes.map((r) => r._id);

      if (routeIds.length === 0) {
        return res.json({
          success: true,
          count: 0,
          fromCity,
          toCity,
          date,
          startDate,
          endDate,
          schedules: [],
        });
      }
      query.route = { $in: routeIds };
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.departureDate = {
        $gte: start,
        $lte: end,
      };
    } else if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.departureDate = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    } else {
      query.departureDate = {
        $gte: today,
      };
    }

    const schedules = await Schedule.find(query)
      .populate("route", "fromCity toCity from to duration")
      .populate("bus", "busNumber type amenities totalSeats seatLayout")
      .populate("company", "name")
      .populate("operator", "name email")
      .sort({ departureDate: 1, departureTime: 1 });

    res.json({
      success: true,
      count: schedules.length,
      fromCity: fromCity || null,
      toCity: toCity || null,
      date: date || null,
      startDate: startDate || null,
      endDate: endDate || null,
      schedules,
    });

  } catch (error) {
    console.error("Search Error:", error);
    sendError(res, 500, "Server error in search");
  }
};