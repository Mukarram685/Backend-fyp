import Schedule from '../../model/Schedule.model.js';
import Booking from '../../model/Booking.model.js';
import User from '../../model/User.model.js';
import Company from '../../model/Company.model.js';
import Payout from '../../model/Payout.model.js';

/**
 * Helper to combine date and time string into a local Date object.
 */
const getDepartureDateTime = (date, timeStr) => {
  const d = new Date(date);
  const [hours, minutes] = timeStr.split(':').map(Number);
  d.setHours(hours, minutes, 0, 0);
  return d;
};

/**
 * Scans schedules and processes automatic payouts for completed ones.
 * Transfers booking money 5 hours after the departure time (e.g. 8 PM -> 1 AM next day).
 */
export const processAutomaticPayouts = async () => {
  try {
    const now = new Date();
    console.log(`[Payout Engine] Running payout check at: ${now.toISOString()}`);

    // Find all active/completed/in-progress schedules
    const schedules = await Schedule.find({ status: { $ne: 'cancelled' } });

    for (const schedule of schedules) {
      // Calculate scheduled payout time: 5 hours after departure
      const departureTime = getDepartureDateTime(schedule.departureDate, schedule.departureTime);
      const scheduledPayoutTime = new Date(departureTime.getTime() + 5 * 60 * 60 * 1000);

      // Only check if current time has reached the scheduled payout time
      if (now >= scheduledPayoutTime) {
        // Check if a payout record already exists for this schedule
        const existingPayout = await Payout.findOne({ schedule: schedule._id });
        if (existingPayout) continue;

        console.log(`[Payout Engine] Processing payout for Schedule ID: ${schedule._id}`);

        // Get all paid & confirmed bookings for this schedule
        const bookings = await Booking.find({
          schedule: schedule._id,
          paymentStatus: 'paid',
          bookingStatus: 'confirmed'
        });

        const totalPayoutAmount = bookings.reduce((sum, b) => sum + b.totalAmount, 0);

        // Find the company and company admin phone number
        const company = await Company.findById(schedule.company);
        const companyAdmin = await User.findOne({ company: schedule.company, role: 'companyadmin' });
        const recipientNumber = companyAdmin?.phoneNumber || company?.phone || "N/A";

        // Create the Payout record
        const payout = await Payout.create({
          schedule: schedule._id,
          company: schedule.company,
          amount: totalPayoutAmount,
          recipientNumber: String(recipientNumber),
          status: 'transferred',
          scheduledTime: scheduledPayoutTime,
          transferredAt: now
        });

        // Mark the schedule status as 'completed'
        schedule.status = 'completed';
        await schedule.save();

        console.log(`[Payout Engine] Success: Transferred Rs ${totalPayoutAmount} to recipient ${recipientNumber} for Schedule ${schedule._id}`);
      }
    }
  } catch (error) {
    console.error("[Payout Engine] Error running automatic payouts:", error);
  }
};

/**
 * Route handler to manually trigger the payout check (useful for testing).
 */
export const triggerPayoutCheck = async (req, res) => {
  try {
    await processAutomaticPayouts();
    return res.status(200).json({
      success: true,
      message: "Automatic payout processing completed."
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to run payout process.",
      error: error.message
    });
  }
};
