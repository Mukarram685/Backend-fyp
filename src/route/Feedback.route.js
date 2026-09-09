import express from 'express';
import { submitFeedback, getAllFeedback, updateFeedbackStatus } from '../controller/Feedback/Feedback.controller.js';
import { protect, authorizeRoles } from '../middleware/Auth.midleware.js';
import jwt from 'jsonwebtoken';
import User from '../model/User.model.js';

const FeedbackRouter = express.Router();

// Optional Auth Middleware for feedback submission
const optionalAuth = async (req, res, next) => {
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        try {
            const token = req.headers.authorization.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select("-password");
        } catch (error) {
            // Ignore invalid token on public feedback route
        }
    }
    next();
};

// Public/User submit feedback route (handles both POST / and POST /feedback)
FeedbackRouter.post('/', optionalAuth, submitFeedback);
FeedbackRouter.post('/feedback', optionalAuth, submitFeedback);
FeedbackRouter.post('/submit', optionalAuth, submitFeedback);
FeedbackRouter.post('/feedbacks', optionalAuth, submitFeedback);

// Admin-only routes
FeedbackRouter.get('/', protect, authorizeRoles('superadmin', 'companyadmin'), getAllFeedback);
FeedbackRouter.put('/:id/status', protect, authorizeRoles('superadmin', 'companyadmin'), updateFeedbackStatus);

export default FeedbackRouter;
