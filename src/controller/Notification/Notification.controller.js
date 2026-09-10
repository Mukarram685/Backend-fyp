import Notification from '../../model/Notification.model.js';
import Booking from '../../model/Booking.model.js';
import { sendError } from '../../helper/Error.helper.js';

// Helper to format relative time
function formatRelativeTime(date) {
    if (!date) return 'Recently';
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} mins ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export const getMyNotifications = async (req, res) => {
    try {
        const userId = req.user._id;

        // Fetch existing notifications for this user
        let notifications = await Notification.find({ user: userId })
            .sort({ createdAt: -1 })
            .lean();

        // If no notifications exist yet in DB, check if user has bookings and auto-populate initial notifications
        if (notifications.length === 0) {
            const userBookings = await Booking.find({ passenger: userId })
                .populate({
                    path: 'schedule',
                    populate: [
                        { path: 'route', select: 'fromCity toCity duration' },
                        { path: 'bus', select: 'name type' },
                        { path: 'company', select: 'name' }
                    ]
                })
                .sort({ createdAt: -1 })
                .limit(10)
                .lean();

            if (userBookings.length > 0) {
                const initialDocs = userBookings.map((b) => {
                    const fromCity = b.schedule?.route?.fromCity || 'Departure City';
                    const toCity = b.schedule?.route?.toCity || 'Destination City';
                    const busName = b.schedule?.company?.name || b.schedule?.bus?.name || 'Express Bus';
                    const isCancelled = b.bookingStatus === 'cancelled';
                    const pnr = b.pnr || (b._id ? `BNG-${b._id.toString().slice(-6).toUpperCase()}` : 'BNG-100');

                    return {
                        user: userId,
                        booking: b._id,
                        type: isCancelled ? 'reminder' : 'booking',
                        title: isCancelled ? 'Booking Cancelled' : 'Booking Confirmed! 🚌',
                        message: isCancelled
                            ? `Your reservation for ${fromCity} to ${toCity} (#${pnr}) was cancelled.`
                            : `Your trip from ${fromCity} to ${toCity} (${busName}) is confirmed. Ticket #${pnr}.`,
                        read: false,
                        createdAt: b.createdAt || new Date(),
                    };
                });

                if (initialDocs.length > 0) {
                    await Notification.insertMany(initialDocs);
                    notifications = await Notification.find({ user: userId })
                        .sort({ createdAt: -1 })
                        .lean();
                }
            }
        }

        // Format timestamp string for frontend
        const formattedNotifications = notifications.map(n => ({
            id: n._id.toString(),
            _id: n._id.toString(),
            title: n.title,
            message: n.message,
            type: n.type || 'booking',
            read: Boolean(n.read),
            timestamp: formatRelativeTime(n.createdAt),
            createdAt: n.createdAt,
            bookingId: n.booking ? n.booking.toString() : undefined,
            data: n.data || {},
        }));

        return res.status(200).json({
            success: true,
            count: formattedNotifications.length,
            notifications: formattedNotifications,
        });
    } catch (error) {
        console.error("GetMyNotifications Error:", error);
        return sendError(res, 500, "Server error while fetching notifications");
    }
};

export const markNotificationAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const notification = await Notification.findOneAndUpdate(
            { _id: id, user: userId },
            { read: true },
            { new: true }
        );

        if (!notification) {
            return sendError(res, 404, "Notification not found");
        }

        return res.status(200).json({
            success: true,
            message: "Notification marked as read",
            notification,
        });
    } catch (error) {
        console.error("MarkNotificationAsRead Error:", error);
        return sendError(res, 500, "Server error updating notification");
    }
};

export const markAllNotificationsAsRead = async (req, res) => {
    try {
        const userId = req.user._id;

        await Notification.updateMany(
            { user: userId, read: false },
            { read: true }
        );

        return res.status(200).json({
            success: true,
            message: "All notifications marked as read",
        });
    } catch (error) {
        console.error("MarkAllNotificationsAsRead Error:", error);
        return sendError(res, 500, "Server error updating notifications");
    }
};

export const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const notification = await Notification.findOneAndDelete({ _id: id, user: userId });

        if (!notification) {
            return sendError(res, 404, "Notification not found");
        }

        return res.status(200).json({
            success: true,
            message: "Notification deleted successfully",
        });
    } catch (error) {
        console.error("DeleteNotification Error:", error);
        return sendError(res, 500, "Server error deleting notification");
    }
};

export const clearAllNotifications = async (req, res) => {
    try {
        const userId = req.user._id;

        await Notification.deleteMany({ user: userId });

        return res.status(200).json({
            success: true,
            message: "All notifications cleared successfully",
        });
    } catch (error) {
        console.error("ClearAllNotifications Error:", error);
        return sendError(res, 500, "Server error clearing notifications");
    }
};
