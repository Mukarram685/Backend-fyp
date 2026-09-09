import express from 'express';
import { ApproveUser, RegisterUser, SignInUser, UpdateUser, RefreshToken, LogoutUser, verifyEmail, resendVerificationEmail } from '../controller/Auth/User.controller.js';
import { forgotPassword, verifyOTP, resetPassword } from '../controller/Auth/ForgotPassword.controller.js';
import { submitFeedback } from '../controller/Feedback/Feedback.controller.js';
import { protect, authorizeRoles } from "../middleware/Auth.midleware.js";

const UserRouter = express.Router();

UserRouter.post('/register', RegisterUser);
UserRouter.post('/login', SignInUser);
UserRouter.post('/refresh-token', RefreshToken);
UserRouter.post('/logout', protect, LogoutUser);

// Email Verification Endpoints
UserRouter.get('/verify-email', verifyEmail);
UserRouter.post('/resend-verification', resendVerificationEmail);

// Password Reset Flow Endpoints
UserRouter.post('/forgot-password', forgotPassword);
UserRouter.post('/verify-otp', verifyOTP);
UserRouter.post('/reset-password', resetPassword);

// Feedback Submission Endpoints
UserRouter.post('/feedback', submitFeedback);
UserRouter.post('/feedbacks', submitFeedback);

UserRouter.put('/update/:id', UpdateUser);
UserRouter.put(
  "/approve/:id",
  protect,
  authorizeRoles("superadmin", "companyadmin"),
  ApproveUser
);

export default UserRouter;


