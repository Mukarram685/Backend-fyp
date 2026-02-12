import Schedule from '../model/Schedule.model.js';
import Route from '../model/Route.model.js';
import Bus from '../model/Bus.model.js';
import { sendError } from '../helper/Error.helper.js';

export const createSchedule = async (req, res) => {
  try {
    const {
      routeId,
      busId,
      departureDate,     // "2025-04-15"
      departureTime,     // "14:30"
      arrivalTime,       // "20:00"
      fare
    } = req.body;

    const user = req.user;

    if (!["operator", "companyadmin"].includes(user.role)) {
      return sendError(res, 403, "Not authorized");
    }

    const route = await Route.findOne({ _id: routeId, company: user.company });
    console.log(route);
    if (!route) return sendError(res, 404, "Route not found or not yours");

    const bus = await Bus.findOne({
      _id: busId,
      company: user.company,
      status: 'active',
    });
    if (!bus) return sendError(res, 404, "Bus not found or inactive");

    const existing = await Schedule.findOne({
      bus: busId,
      departureDate: new Date(departureDate),
    });
    if (existing)
      return sendError(res, 400, "This bus is already scheduled on this date");

    const schedule = await Schedule.create({
      route: routeId,
      bus: busId,
      departureDate: new Date(departureDate),
      departureTime,
      arrivalTime,
      fare,
      availableSeats: bus.totalSeats,
      company: user.company,
      createdBy: user._id,
    });

    await schedule.populate([
      { path: "route", select: "fromCity toCity from to" },
      { path: "bus", select: "busNumber type amenities" },
    ]);

    res.status(201).json({
      success: true,
      message: "Schedule created successfully",
      schedule
    });

  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 400, "Bus already scheduled on this date");
    }
    sendError(res, 500, "Server error");
  }
};


export const getCompanySchedules = async (req, res) => {
  try {
    const companyId = req.user.company;
    const schedules = await Schedule.find({ company: companyId })
      .populate("route", "fromCity toCity from to")
      .populate("bus", "busNumber type totalSeats")
      .sort({ departureDate: 1, departureTime: 1 });

    res.json({ success: true, count: schedules.length, schedules });
  } catch (error) {
    sendError(res, 500, "Server error");
  }
};

export const searchSchedules = async (req, res) => {
  try {
    const { fromCity, toCity, date } = req.query;

    if (!fromCity || !toCity || !date) {
      return sendError(res, 400, "fromCity, toCity, and date are required");
    }

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
        schedules: [],
      });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const schedules = await Schedule.find({
      route: { $in: routeIds },
      departureDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      status: 'active',
      availableSeats: { $gt: 0 },
    })
      .populate("route", "fromCity toCity from to duration")
      .populate("bus", "busNumber type amenities totalSeats seatLayout")
      .populate("company", "name")
      .sort({ departureTime: 1 });

    res.json({
      success: true,
      count: schedules.length,
      fromCity,
      toCity,
      date,
      schedules,
    });

  } catch (error) {
    console.error("Search Error:", error);
    sendError(res, 500, "Server error in search");
  }
};