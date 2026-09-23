import Schedule from '../../model/Schedule.model.js';
import Route from '../../model/Route.model.js';
import Bus from '../../model/Bus.model.js';
import User from '../../model/User.model.js';
import { sendError } from '../../helper/Error.helper.js';
import { logActivity } from '../../helper/Audit.helper.js';

const timeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const cleanStr = timeStr.trim();
  const isPM = /pm/i.test(cleanStr);
  const isAM = /am/i.test(cleanStr);
  const parts = cleanStr.replace(/[^\d:]/g, '').split(':');
  let hours = Number(parts[0]) || 0;
  let minutes = Number(parts[1]) || 0;
  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;
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
      if (user.role !== 'operator' || user.operatorType !== 'company_manager') {
        return sendError(res, 403, "Only Company Managers, Company Admins, and Superadmins can create schedules");
      }
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
    if (operator.operatorType === 'company_manager' || operator.operatorType === 'city_manager') {
      return sendError(res, 400, "Cannot assign schedules to Company Managers or City Managers. Please select a Trip Operator.");
    }

    const startOfDay = new Date(departureDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(departureDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const busConflict = await Schedule.findOne({
      bus: busId,
      departureDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['active', 'in-progress', 'scheduled'] }
    });
    if (busConflict) return sendError(res, 400, "This bus is already scheduled on this date");

    const newStart = timeToMinutes(departureTime);
    const newEnd = timeToMinutes(arrivalTime);

    const operatorSchedules = await Schedule.find({
      operator: operatorId,
      departureDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['active', 'in-progress', 'scheduled'] }
    });

    for (const existing of operatorSchedules) {
      if (!existing.departureTime || !existing.arrivalTime) continue;
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

    const populatedSchedule = await Schedule.findById(schedule._id)
      .populate("route", "fromCity toCity from to")
      .populate("bus", "busNumber type amenities")
      .populate("operator", "name email operatorType")
      .populate("company", "name");

    res.status(201).json({
      success: true,
      message: "Schedule created successfully",
      schedule: populatedSchedule
    });

  } catch (error) {
    console.error("CreateSchedule Error:", error);
    if (error.code === 11000) {
      return sendError(res, 400, "This bus is already scheduled on this date");
    }
    sendError(res, 500, error.message || "Server error during schedule creation");
  }
};


export const getCompanySchedules = async (req, res) => {
  try {
    const user = req.user;
    let query = {};

    if (user.role === 'superadmin') {
      query = {};
    } else if (user.role === 'companyadmin' || (user.role === 'operator' && user.operatorType === 'company_manager')) {
      query = { company: user.company };
    } else if (user.role === 'operator' && user.operatorType === 'city_manager') {
      const assignedCities = user.operatorScope?.cities || [];
      if (assignedCities.length > 0) {
        const routes = await Route.find({
          company: user.company,
          $or: [
            { fromCity: { $in: assignedCities } },
            { toCity: { $in: assignedCities } }
          ]
        }).select('_id');
        const routeIds = routes.map(r => r._id);
        query = { company: user.company, route: { $in: routeIds } };
      } else {
        query = { company: user.company };
      }
    } else {
      // trip_operator
      const buses = await Bus.find({ operator: user._id }).select('_id');
      const busIds = buses.map(b => b._id);
      query = {
        company: user.company,
        $or: [
          { operator: user._id },
          { bus: { $in: busIds } }
        ]
      };
    }

    const schedules = await Schedule.find(query)
      .populate("route", "fromCity toCity from to")
      .populate("bus", "busNumber type totalSeats")
      .populate("operator", "name email operatorType")
      .populate("company", "name");

    const isFinished = (status) => status === 'completed' || status === 'cancelled';

    const sortedSchedules = schedules.sort((a, b) => {
      const aFinished = isFinished(a.status);
      const bFinished = isFinished(b.status);

      // 1. Active/Upcoming trips first, Completed/Cancelled at the bottom
      if (!aFinished && bFinished) return -1;
      if (aFinished && !bFinished) return 1;

      const aDate = new Date(a.departureDate).getTime() + (timeToMinutes(a.departureTime) * 60000);
      const bDate = new Date(b.departureDate).getTime() + (timeToMinutes(b.departureTime) * 60000);

      if (!aFinished && !bFinished) {
        // In-progress trip at the very top
        if (a.status === 'in-progress' && b.status !== 'in-progress') return -1;
        if (b.status === 'in-progress' && a.status !== 'in-progress') return 1;
        // Upcoming trips in ascending order (earliest departure first)
        return aDate - bDate;
      } else {
        // Completed/cancelled trips at bottom in descending order (most recently finished first)
        return bDate - aDate;
      }
    });

    res.json({ success: true, count: sortedSchedules.length, schedules: sortedSchedules });
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
      status: { $in: ['active', 'scheduled'] },
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

export const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { busId, operatorId } = req.body;
    const isSuperAdmin = user.role === 'superadmin';
    const isCompanyAdmin = user.role === 'companyadmin';
    const isCompanyManager = user.role === 'operator' && user.operatorType === 'company_manager';
    const isCityManager = user.role === 'operator' && user.operatorType === 'city_manager';

    if (!isSuperAdmin && !isCompanyAdmin && !isCompanyManager && !isCityManager) {
      return sendError(res, 403, "Not authorized to update schedule");
    }

    const scheduleQuery = isSuperAdmin ? { _id: id } : { _id: id, company: user.company };
    const schedule = await Schedule.findOne(scheduleQuery).populate('route');
    if (!schedule) {
      return sendError(res, 404, "Schedule not found or not belonging to your company");
    }

    if (isCityManager) {
      const assignedCities = user.operatorScope?.cities || [];
      const fromCity = schedule.route?.fromCity;
      const toCity = schedule.route?.toCity;
      if (!assignedCities.includes(fromCity) && !assignedCities.includes(toCity)) {
        return sendError(res, 403, "Access denied: You can only swap operator/bus for trips in your assigned city");
      }
    }

    if (['completed', 'cancelled'].includes(schedule.status)) {
      return sendError(res, 400, `Cannot edit a ${schedule.status} schedule`);
    }

    if (!busId && !operatorId) {
      return sendError(res, 400, "Please provide busId or operatorId to update");
    }

    const startOfDay = new Date(schedule.departureDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(schedule.departureDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const currentBusId = schedule.bus?._id ? String(schedule.bus._id) : String(schedule.bus);
    const currentOperatorId = schedule.operator?._id ? String(schedule.operator._id) : String(schedule.operator);

    // 1. Update Bus if provided and changed
    if (busId && String(busId) !== currentBusId) {
      const busQuery = user.role === 'superadmin' 
        ? { _id: busId } 
        : { _id: busId, company: user.company || schedule.company };
      const newBus = await Bus.findOne(busQuery);
      if (!newBus) return sendError(res, 404, "New bus not found or belongs to another company");
      if (newBus.status === 'inactive') return sendError(res, 400, "Cannot assign an inactive bus");

      const bookedCount = schedule.bookedSeats ? schedule.bookedSeats.length : 0;
      if (newBus.totalSeats < bookedCount) {
        return sendError(res, 400, `Cannot assign bus with ${newBus.totalSeats} seats because ${bookedCount} seats are already booked`);
      }

      if (schedule.bookedSeats && schedule.bookedSeats.length > 0) {
        const numericSeats = schedule.bookedSeats.map(Number).filter(n => !isNaN(n));
        if (numericSeats.length > 0) {
          const maxBookedSeat = Math.max(...numericSeats);
          if (maxBookedSeat > newBus.totalSeats) {
            return sendError(res, 400, `Cannot assign bus because booked seat #${maxBookedSeat} exceeds new bus total capacity (${newBus.totalSeats} seats)`);
          }
        }
      }

      // Check bus conflict for the same departure date
      const busConflict = await Schedule.findOne({
        _id: { $ne: id },
        bus: busId,
        departureDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['active', 'in-progress', 'scheduled'] }
      });
      if (busConflict) {
        return sendError(res, 400, "This bus is already assigned to another schedule on this date");
      }

      schedule.bus = newBus._id;
      schedule.availableSeats = Math.max(0, newBus.totalSeats - bookedCount);
    }

    // 2. Update Operator if provided and changed
    if (operatorId && String(operatorId) !== currentOperatorId) {
      const operatorQuery = user.role === 'superadmin' 
        ? { _id: operatorId } 
        : { _id: operatorId, company: user.company || schedule.company };
      const newOperator = await User.findOne(operatorQuery);
      if (!newOperator) return sendError(res, 404, "Operator not found or belongs to another company");
      if (newOperator.status === 'rejected') return sendError(res, 400, "Cannot assign a rejected operator");
      if (newOperator.operatorType === 'company_manager' || newOperator.operatorType === 'city_manager') {
        return sendError(res, 400, "Cannot assign schedules to Company Managers or City Managers. Please select a Trip Operator.");
      }

      const newStart = timeToMinutes(schedule.departureTime);
      const newEnd = timeToMinutes(schedule.arrivalTime);

      const operatorSchedules = await Schedule.find({
        _id: { $ne: id },
        operator: operatorId,
        departureDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['active', 'in-progress', 'scheduled'] }
      });

      for (const existing of operatorSchedules) {
        if (!existing.departureTime || !existing.arrivalTime) continue;
        const exStart = timeToMinutes(existing.departureTime);
        const exEnd = timeToMinutes(existing.arrivalTime);

        if (newStart < exEnd && newEnd > exStart) {
          return sendError(res, 400, `Operator is already assigned to another trip (${existing.departureTime} - ${existing.arrivalTime}) on this date.`);
        }
      }

      schedule.operator = newOperator._id;
    }

    await schedule.save();

    await logActivity(req, 'update_schedule', 'Schedule', schedule._id, `Updated bus/operator for schedule ${schedule._id}`);

    const updatedSchedule = await Schedule.findById(schedule._id)
      .populate("route", "fromCity toCity from to")
      .populate("bus", "busNumber type totalSeats")
      .populate("operator", "name email");

    res.status(200).json({
      success: true,
      message: "Schedule updated successfully",
      schedule: updatedSchedule
    });

  } catch (error) {
    console.error("UpdateSchedule Error:", error);
    if (error.code === 11000) {
      return sendError(res, 400, "This bus is already assigned to another schedule on this date");
    }
    sendError(res, 500, error.message || "Server error during schedule update");
  }
};