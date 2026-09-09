import User from '../../model/User.model.js';
import { sendError } from '../../helper/Error.helper.js';
import { sendOtpEmail } from '../../helper/Email.helper.js';

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return sendError(res, 400, "Please provide your email address");
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return sendError(res, 404, "No account found with this email address");
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        user.resetPasswordOTP = otp;
        user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();

        await sendOtpEmail(user.email, otp, user.name);

        return res.status(200).json({
            success: true,
            message: "A 6-digit verification code has been sent to your email address",
            email: user.email,
        });
    } catch (error) {
        console.error("ForgotPassword Error:", error);
        return sendError(res, 500, "Server error while processing forgot password request");
    }
};

export const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return sendError(res, 400, "Please provide email and verification code");
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return sendError(res, 404, "User not found");
        }

        if (
            !user.resetPasswordOTP ||
            user.resetPasswordOTP !== otp.toString().trim() ||
            !user.resetPasswordExpires ||
            user.resetPasswordExpires < new Date()
        ) {
            return sendError(res, 400, "Invalid or expired verification code. Please request a new one.");
        }

        return res.status(200).json({
            success: true,
            message: "Verification code verified successfully",
        });
    } catch (error) {
        console.error("VerifyOTP Error:", error);
        return sendError(res, 500, "Server error while verifying OTP");
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !newPassword) {
            return sendError(res, 400, "Please provide email and new password");
        }

        if (newPassword.length < 6) {
            return sendError(res, 400, "Password must be at least 6 characters long");
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return sendError(res, 404, "User not found");
        }

        // Check OTP if provided (for backward compatibility with single-step flow)
        if (otp) {
            if (
                !user.resetPasswordOTP ||
                user.resetPasswordOTP !== otp.toString().trim() ||
                !user.resetPasswordExpires ||
                user.resetPasswordExpires < new Date()
            ) {
                return sendError(res, 400, "Invalid or expired verification code. Please request a new one.");
            }
        } else {
            // If no OTP provided, check if there's a valid OTP in the database (for multi-step flow)
            if (
                !user.resetPasswordOTP ||
                !user.resetPasswordExpires ||
                user.resetPasswordExpires < new Date()
            ) {
                return sendError(res, 400, "Session expired. Please request a new verification code.");
            }
        }

        // Set new password (Mongoose pre-save hook will hash it)
        user.password = newPassword;
        user.resetPasswordOTP = null;
        user.resetPasswordExpires = null;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Your password has been reset successfully. You can now log in with your new password.",
        });
    } catch (error) {
        console.error("ResetPassword Error:", error);
        return sendError(res, 500, "Server error while resetting password");
    }
};
