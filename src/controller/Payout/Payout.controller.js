import Schedule from '../../model/Schedule.model.js';
import Booking from '../../model/Booking.model.js';
import User from '../../model/User.model.js';
import Company from '../../model/Company.model.js';
import Payout from '../../model/Payout.model.js';
import { sendError } from '../../helper/Error.helper.js';

export const SETTLEMENT_WINDOW_HOURS = 24;


const getDepartureDateTime = (date, timeStr) => {
  const d = new Date(date);
  if (!timeStr || typeof timeStr !== 'string') return d;
  const [hours, minutes] = timeStr.split(':').map(Number);
  d.setHours(hours || 0, minutes || 0, 0, 0);
  return d;
};

/**
 * Scans schedules and processes automatic payouts for completed ones.
 * Transfers booking money 12–24 hours after the departure time.
 */
export const processAutomaticPayouts = async () => {
  try {
    const now = new Date();
    console.log(`[Payout Engine] Running automated payout check at: ${now.toISOString()} (${SETTLEMENT_WINDOW_HOURS}h settlement window)`);

    // Find all active/completed/in-progress schedules
    const schedules = await Schedule.find({ status: { $ne: 'cancelled' } })
      .populate('company')
      .populate('route');

    let processedCount = 0;
    let totalDisbursedAmount = 0;

    for (const schedule of schedules) {
      if (!schedule.departureDate || !schedule.departureTime) continue;

      const departureTime = getDepartureDateTime(schedule.departureDate, schedule.departureTime);
      const scheduledPayoutTime = new Date(departureTime.getTime() + SETTLEMENT_WINDOW_HOURS * 60 * 60 * 1000);

      // Check if current time has reached the scheduled payout time (12-24h window)
      if (now >= scheduledPayoutTime) {
        // Check if a payout record already exists for this schedule
        const existingPayout = await Payout.findOne({ schedule: schedule._id });
        if (existingPayout) continue;

        // Get all paid & confirmed bookings for this schedule
        const bookings = await Booking.find({
          schedule: schedule._id,
          paymentStatus: 'paid',
          bookingStatus: { $ne: 'cancelled' }
        });

        const totalPayoutAmount = bookings.reduce((sum, b) => {
          if (b.bookingStatus === 'refunded') return sum;
          return sum + (b.totalAmount || 0) - (b.refundAmount || 0);
        }, 0);

        // Find the company and company admin recipient info
        const targetCompanyId = schedule.company?._id || schedule.company;
        const company = await Company.findById(targetCompanyId);
        const companyAdmin = await User.findOne({ company: targetCompanyId, role: 'companyadmin' });
        const recipientNumber = companyAdmin?.phoneNumber || company?.phone || "N/A";

        // Create the Payout record
        await Payout.create({
          schedule: schedule._id,
          company: targetCompanyId,
          amount: totalPayoutAmount,
          recipientNumber: String(recipientNumber),
          status: 'transferred',
          scheduledTime: scheduledPayoutTime,
          transferredAt: now
        });

        // Mark the schedule status as 'completed'
        schedule.status = 'completed';
        await schedule.save();

        processedCount++;
        totalDisbursedAmount += totalPayoutAmount;
        console.log(`[Payout Engine] Auto-settled PKR ${totalPayoutAmount} to recipient ${recipientNumber} for Schedule ${schedule._id}`);
      }
    }

    return { processedCount, totalDisbursedAmount };
  } catch (error) {
    console.error("[Payout Engine] Error running automatic payouts:", error);
    return { processedCount: 0, totalDisbursedAmount: 0, error: error.message };
  }
};

/**
 * Route handler to manually trigger the automated payout check sweep.
 */
export const triggerPayoutCheck = async (req, res) => {
  try {
    const result = await processAutomaticPayouts();
    return res.status(200).json({
      success: true,
      message: `Automatic payout sweep completed. Processed ${result.processedCount} schedule settlement(s) totaling PKR ${result.totalDisbursedAmount.toLocaleString()}.`,
      result
    });
  } catch (error) {
    return sendError(res, 500, `Failed to run payout process: ${error.message}`);
  }
};

/**
 * Get all completed and pending payouts list with full relational context.
 */
export const getPayoutsList = async (req, res) => {
  try {
    const user = req.user;
    const { companyId, status } = req.query;

    let companyFilter = {};
    if (user.role === 'superadmin') {
      if (companyId) companyFilter = { company: companyId };
    } else if (user.role === 'companyadmin') {
      companyFilter = { company: user.company };
    } else {
      return sendError(res, 403, "Unauthorized to access payout records");
    }

    // 1. Fetch completed payouts
    let payoutQuery = { ...companyFilter };
    if (status && status !== 'all') {
      payoutQuery.status = status;
    }

    const completedPayouts = await Payout.find(payoutQuery)
      .populate({
        path: 'schedule',
        populate: [
          { path: 'route', select: 'from to fromCity toCity fare duration distance' },
          { path: 'bus', select: 'busNumber registrationNumber type totalSeats' }
        ]
      })
      .populate('company', 'name email phone status logo')
      .sort({ transferredAt: -1, createdAt: -1 });

    // 2. Fetch pending / in-escrow schedules waiting for 12-24h settlement window
    const schedules = await Schedule.find({
      ...companyFilter,
      status: { $ne: 'cancelled' }
    })
      .populate('route', 'from to fromCity toCity fare duration distance')
      .populate('bus', 'busNumber registrationNumber type totalSeats')
      .populate('company', 'name email phone status logo')
      .sort({ departureDate: -1, departureTime: -1 });

    const settledScheduleIds = new Set(
      completedPayouts.map(p => p.schedule?._id?.toString()).filter(Boolean)
    );

    const now = new Date();
    const pendingSettlements = [];

    for (const s of schedules) {
      if (settledScheduleIds.has(s._id.toString())) continue;

      const departureTime = getDepartureDateTime(s.departureDate, s.departureTime);
      const scheduledPayoutTime = new Date(departureTime.getTime() + SETTLEMENT_WINDOW_HOURS * 60 * 60 * 1000);

      // Find paid bookings for this schedule
      const bookings = await Booking.find({
        schedule: s._id,
        paymentStatus: 'paid',
        bookingStatus: { $ne: 'cancelled' }
      });

      const totalBookingRevenue = bookings.reduce((sum, b) => {
        if (b.bookingStatus === 'refunded') return sum;
        return sum + (b.totalAmount || 0) - (b.refundAmount || 0);
      }, 0);

      // Determine recipient info
      const companyAdmin = await User.findOne({ company: s.company?._id || s.company, role: 'companyadmin' });
      const recipientNumber = companyAdmin?.phoneNumber || s.company?.phone || "N/A";
      const recipientName = companyAdmin?.name || s.company?.name || "Company Admin";

      const msRemaining = scheduledPayoutTime.getTime() - now.getTime();
      const hoursRemaining = Math.max(0, Math.round(msRemaining / (1000 * 60 * 60) * 10) / 10);
      const isEligibleNow = now >= scheduledPayoutTime;

      pendingSettlements.push({
        scheduleId: s._id,
        schedule: s,
        company: s.company,
        totalBookings: bookings.length,
        totalAmount: totalBookingRevenue,
        recipientNumber,
        recipientName,
        departureTime,
        scheduledPayoutTime,
        hoursRemaining,
        isEligibleNow,
        status: isEligibleNow ? 'ready_for_settlement' : 'in_escrow_holding'
      });
    }

    return res.status(200).json({
      success: true,
      count: completedPayouts.length,
      settlementWindowHours: SETTLEMENT_WINDOW_HOURS,
      completedPayouts,
      pendingSettlements
    });

  } catch (error) {
    return sendError(res, 500, `Failed to load payout list: ${error.message}`);
  }
};

/**
 * Get aggregated payout metrics and telemetry.
 */
export const getPayoutStats = async (req, res) => {
  try {
    const user = req.user;
    const { companyId } = req.query;

    let companyFilter = {};
    if (user.role === 'superadmin') {
      if (companyId) companyFilter = { company: companyId };
    } else if (user.role === 'companyadmin') {
      companyFilter = { company: user.company };
    }

    // Completed payouts stats
    const completedPayouts = await Payout.find({ ...companyFilter, status: 'transferred' });
    const totalDisbursed = completedPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Pending schedules stats
    const settledScheduleIds = new Set(
      completedPayouts.map(p => p.schedule?.toString()).filter(Boolean)
    );

    const unpaidSchedules = await Schedule.find({
      ...companyFilter,
      _id: { $nin: Array.from(settledScheduleIds) },
      status: { $ne: 'cancelled' }
    });

    let pendingEscrowAmount = 0;
    for (const s of unpaidSchedules) {
      const bookings = await Booking.find({
        schedule: s._id,
        paymentStatus: 'paid',
        bookingStatus: { $ne: 'cancelled' }
      });
      const rev = bookings.reduce((sum, b) => {
        if (b.bookingStatus === 'refunded') return sum;
        return sum + (b.totalAmount || 0) - (b.refundAmount || 0);
      }, 0);
      pendingEscrowAmount += rev;
    }

    return res.status(200).json({
      success: true,
      stats: {
        totalDisbursed,
        completedCount: completedPayouts.length,
        pendingEscrowAmount,
        pendingCount: unpaidSchedules.length,
        settlementWindowHours: SETTLEMENT_WINDOW_HOURS
      }
    });

  } catch (error) {
    return sendError(res, 500, `Failed to load payout stats: ${error.message}`);
  }
};

/**
 * Superadmin instant manual payout override for a specific schedule.
 */
export const processManualSchedulePayout = async (req, res) => {
  try {
    const { scheduleId } = req.params;

    const schedule = await Schedule.findById(scheduleId).populate('company');
    if (!schedule) return sendError(res, 404, "Target schedule not found");

    const existingPayout = await Payout.findOne({ schedule: schedule._id });
    if (existingPayout) {
      return sendError(res, 400, "Payout has already been settled and disbursed for this schedule");
    }

    // Get all paid & confirmed bookings for this schedule
    const bookings = await Booking.find({
      schedule: schedule._id,
      paymentStatus: 'paid',
      bookingStatus: { $ne: 'cancelled' }
    });

    const totalPayoutAmount = bookings.reduce((sum, b) => {
      if (b.bookingStatus === 'refunded') return sum;
      return sum + (b.totalAmount || 0) - (b.refundAmount || 0);
    }, 0);

    const targetCompanyId = schedule.company?._id || schedule.company;
    const company = await Company.findById(targetCompanyId);
    const companyAdmin = await User.findOne({ company: targetCompanyId, role: 'companyadmin' });
    const recipientNumber = companyAdmin?.phoneNumber || company?.phone || "N/A";

    const now = new Date();
    const departureTime = getDepartureDateTime(schedule.departureDate, schedule.departureTime);
    const scheduledPayoutTime = new Date(departureTime.getTime() + SETTLEMENT_WINDOW_HOURS * 60 * 60 * 1000);

    const payout = await Payout.create({
      schedule: schedule._id,
      company: targetCompanyId,
      amount: totalPayoutAmount,
      recipientNumber: String(recipientNumber),
      status: 'transferred',
      scheduledTime: scheduledPayoutTime,
      transferredAt: now
    });

    schedule.status = 'completed';
    await schedule.save();

    return res.status(200).json({
      success: true,
      message: `Successfully released manual payout of PKR ${totalPayoutAmount.toLocaleString()} to ${company?.name || 'Company'} (${recipientNumber}).`,
      payout
    });

  } catch (error) {
    return sendError(res, 500, `Failed to process manual payout: ${error.message}`);
  }
};
