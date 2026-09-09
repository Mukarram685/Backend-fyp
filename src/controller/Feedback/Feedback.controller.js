import Feedback from '../../model/Feedback.model.js';
import { sendError } from '../../helper/Error.helper.js';
import { sendFeedbackNotificationEmail } from '../../helper/Email.helper.js';

/**
 * Submit User Feedback
 * Route: POST /api/v1/feedback
 */
export const submitFeedback = async (req, res) => {
    try {
        const { email, description, feedback, name, rating } = req.body;
        const feedbackContent = (description || feedback || '').trim();

        if (!email || !email.trim()) {
            return sendError(res, 400, "Please provide your email address");
        }

        if (!feedbackContent) {
            return sendError(res, 400, "Please provide your feedback or description");
        }

        const normalizedEmail = email.toLowerCase().trim();

        const newFeedback = await Feedback.create({
            email: normalizedEmail,
            name: name ? name.trim() : (req.user ? req.user.name : ''),
            description: feedbackContent,
            rating: rating ? Number(rating) : 5,
            user: req.user ? req.user._id || req.user.id : null,
        });

        // Dispatch notification and user confirmation email
        sendFeedbackNotificationEmail({
            email: normalizedEmail,
            name: newFeedback.name,
            description: feedbackContent,
            rating: newFeedback.rating,
        }).catch(err => {
            console.error("Background feedback email dispatch failed:", err.message);
        });

        return res.status(201).json({
            success: true,
            message: "Thank you for your feedback! We appreciate your input and will review it promptly.",
            data: newFeedback,
        });
    } catch (error) {
        console.error("Submit Feedback Error:", error);
        return sendError(res, 500, "Server error while submitting feedback");
    }
};

/**
 * Get all feedback entries (Superadmin / Support)
 * Route: GET /api/v1/feedback
 */
export const getAllFeedback = async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const filter = {};
        if (status) filter.status = status;

        const skip = (Number(page) - 1) * Number(limit);
        const [feedbacks, total] = await Promise.all([
            Feedback.find(filter)
                .populate('user', 'name email phoneNumber')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Feedback.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            feedbacks,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / Number(limit)),
                limit: Number(limit)
            }
        });
    } catch (error) {
        console.error("Get Feedback Error:", error);
        return sendError(res, 500, "Server error while fetching feedback");
    }
};

/**
 * Update feedback status (Superadmin / Support)
 * Route: PUT /api/v1/feedback/:id/status
 */
export const updateFeedbackStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['unread', 'read', 'in_progress', 'resolved'].includes(status)) {
            return sendError(res, 400, "Invalid status value");
        }

        const updated = await Feedback.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!updated) {
            return sendError(res, 404, "Feedback record not found");
        }

        return res.status(200).json({
            success: true,
            message: "Feedback status updated successfully",
            data: updated
        });
    } catch (error) {
        console.error("Update Feedback Status Error:", error);
        return sendError(res, 500, "Server error while updating feedback status");
    }
};
