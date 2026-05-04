import Schedule from '../../model/Schedule.model.js';
import Bus from '../../model/Bus.model.js';
import Booking from '../../model/Booking.model.js';
import { sendError } from '../../helper/Error.helper.js';
import { logActivity } from '../../helper/Audit.helper.js';

export const getMyTrips = async (req, res) => {
  try {
    const operatorId = req.user._id;

    let trips = await Schedule.find({ operator: operatorId })
      .populate('route', 'fromCity toCity from to')
      .populate('bus', 'busNumber type registrationNumber')
      .sort({ departureDate: 1, departureTime: 1 });

    if (trips.length === 0) {
      const buses = await Bus.find({ operator: operatorId }).select('_id');
      const busIds = buses.map(bus => bus._id);
      
      if (busIds.length > 0) {
        trips = await Schedule.find({ bus: { $in: busIds } })
          .populate('route', 'fromCity toCity from to')
          .populate('bus', 'busNumber type registrationNumber')
          .sort({ departureDate: 1, departureTime: 1 });
      }
    }

    res.status(200).json({
      success: true,
      count: trips.length,
      trips
    });
  } catch (error) {
    console.error('GetMyTrips Error:', error);
    sendError(res, 500, 'Server error while fetching trips');
  }
};

export const getTripPassengers = async (req, res) => {
  try {
    const { id: scheduleId } = req.params;
    const operatorId = req.user._id;

    const schedule = await Schedule.findById(scheduleId).populate('bus');
    if (!schedule) {
      return sendError(res, 404, 'Trip not found');
    }

    const isAssignedDirectly = schedule.operator && schedule.operator.toString() === operatorId.toString();
    const isAssignedViaBus = schedule.bus.operator.toString() === operatorId.toString();

    if (!isAssignedDirectly && !isAssignedViaBus) {
      return sendError(res, 403, 'Not authorized to view passengers for this trip');
    }

    console.log(`Fetching passengers for schedule: ${scheduleId}`);

    const bookings = await Booking.find({ 
      schedule: scheduleId, 
      bookingStatus: { $ne: 'cancelled' } 
    }).populate('passenger', 'name email phoneNumber');

    console.log(`Found ${bookings.length} bookings for schedule ${scheduleId}`);

    const passengerList = bookings.flatMap(booking => {
      return (booking.seats || []).map(seat => ({
        seatNumber: seat.seatNumber,
        passengerName: seat.passengerName,
        passengerPhone: seat.passengerPhone,
        passengerCNIC: seat.passengerCNIC,
        gender: seat.gender,
        pnr: booking.pnr,
        bookedBy: booking.passenger ? booking.passenger.name : 'Guest'
      }));
    });

    res.status(200).json({
      success: true,
      count: passengerList.length,
      passengers: passengerList.sort((a, b) => a.seatNumber - b.seatNumber)
    });
  } catch (error) {
    console.error('GetTripPassengers Error:', error);
    sendError(res, 500, 'Server error while fetching passenger list');
  }
};

export const completeTrip = async (req, res) => {
  try {
    const { id: scheduleId } = req.params;
    const operatorId = req.user._id;

    const schedule = await Schedule.findById(scheduleId).populate('bus');
    if (!schedule) {
      return sendError(res, 404, 'Trip not found');
    }

    const isAssignedDirectly = schedule.operator && schedule.operator.toString() === operatorId.toString();
    const isAssignedViaBus = schedule.bus.operator.toString() === operatorId.toString();

    if (!isAssignedDirectly && !isAssignedViaBus) {
      return sendError(res, 403, 'Not authorized to update this trip');
    }

    if (schedule.status === 'completed') {
      return sendError(res, 400, 'Trip is already marked as completed');
    }

    schedule.status = 'completed';
    await schedule.save();

    await logActivity(req, 'complete_trip', 'Schedule', scheduleId, `Operator ${req.user.name} marked trip as completed`);

    res.status(200).json({
      success: true,
      message: 'Trip marked as completed successfully',
      trip: schedule
    });
  } catch (error) {
    console.error('CompleteTrip Error:', error);
    sendError(res, 500, 'Server error while updating trip status');
  }
};

export const startTrip = async (req, res) => {
  try {
    const { id: scheduleId } = req.params;
    const operatorId = req.user._id;

    const schedule = await Schedule.findById(scheduleId).populate('bus');
    if (!schedule) {
      return sendError(res, 404, 'Trip not found');
    }

    const isAssignedDirectly = schedule.operator && schedule.operator.toString() === operatorId.toString();
    const isAssignedViaBus = schedule.bus.operator.toString() === operatorId.toString();

    if (!isAssignedDirectly && !isAssignedViaBus) {
      return sendError(res, 403, 'Not authorized to update this trip');
    }

    if (schedule.status !== 'active') {
      return sendError(res, 400, `Trip cannot be started because it is already ${schedule.status}`);
    }

    schedule.status = 'in-progress';
    await schedule.save();

    await logActivity(req, 'start_trip', 'Schedule', scheduleId, `Operator ${req.user.name} started the trip`);

    res.status(200).json({
      success: true,
      message: 'Trip started successfully',
      trip: schedule
    });
  } catch (error) {
    console.error('StartTrip Error:', error);
    sendError(res, 500, 'Server error while starting trip');
  }
};
