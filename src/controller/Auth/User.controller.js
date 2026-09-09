import User from "../../model/User.model.js";
import { sendError } from "../../helper/Error.helper.js";
import { sendVerificationEmail } from "../../helper/Email.helper.js";
import Company from "../../model/Company.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";


export const RegisterUser = async (req, res) => {
    try {
        const { name, email, password, role, company, phoneNumber, cnic, operatorType, operatorScope } = req.body;

        if (!name || !email || !password || !phoneNumber) {
            return sendError(res, 400, "Please provide all required fields");
        }

        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) return sendError(res, 409, "Email already registered");

        if (["operator"].includes(role)) {
            if (!company) {
                return sendError(res, 400, "Company ID is required for operators");
            }
            const companyExists = await Company.findById(company);
            if (!companyExists) return sendError(res, 404, "Company not found");
        }

        let status = "pending";
        if (role === "superadmin") status = "approved";

        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        const newUser = await User.create({
            name,
            email: email.toLowerCase(),
            password,
            role: role || "user",
            company: company || null,
            phoneNumber,
            cnic: cnic || null,
            status,
            approvedBy: role === "superadmin" ? null : undefined,
            operatorType: role === "operator" ? operatorType : null,
            operatorScope: role === "operator" ? operatorScope : undefined,
            verificationToken,
            verificationTokenExpires,
            isVerified: false,
        });

        sendVerificationEmail(newUser.email, verificationToken, newUser.name).catch(err => {
            console.error("Background verification email dispatch failed:", err.message);
        });

        return res.status(201).json({
            success: true,
            message: "Account created successfully. Please check your email to verify your account.",
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                phoneNumber: newUser.phoneNumber,
                cnic: newUser.cnic,
                role: newUser.role,
                status: newUser.status,
                isVerified: newUser.isVerified,
            },
        });

    } catch (error) {
        console.error("Register Error:", error);
        return sendError(res, 500, "Server error during registration");
    }
};

export const SignInUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return sendError(res, 400, "Please provide email and password");
    }

    try {
        const user = await User.findOne({ email: email.toLowerCase() }).populate('company', 'name');
        if (!user) return sendError(res, 401, "Invalid email or password");

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return sendError(res, 401, "Invalid email or password");

        if (user.role !== "user" && user.status !== "approved") {
            return sendError(res, 403, "Your account is not approved yet");
        }

        // Check email verification (optional - can be enforced based on requirements)
        if (!user.isVerified) {
            // For now, we'll allow login but warn the user
            // Uncomment the line below to enforce email verification
            // return sendError(res, 403, "Please verify your email address before logging in");
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Login successful",
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber,
                cnic: user.cnic,
                role: user.role,
                company: user.company,
                isVerified: user.isVerified,
                // operatorType: user.operatorType,
                // operatorScope: user.operatorScope,
            },
        });
    } catch (error) {
        console.error("Login Error:", error);
        return sendError(res, 500, "Server error during login");
    }
};


export const UpdateUser = async (req, res) => {
    const { name, email, password, phoneNumber, cnic } = req.body;
    const { id } = req.params;

    try {
        const user = await User.findById(id);
        if (!user) {
            return sendError(res, 404, "User not found");
        }

        if (email && email.toLowerCase() !== user.email) {
            const emailExists = await User.findOne({ email: email.toLowerCase() });
            if (emailExists) {
                return sendError(res, 400, "Email already in use by another account");
            }
        }

        const updateFields = {};

        if (name) updateFields.name = name.trim();
        if (email) updateFields.email = email.toLowerCase().trim();
        if (phoneNumber) updateFields.phoneNumber = phoneNumber.trim();
        if (cnic) updateFields.cnic = cnic.trim();
        if (password) {
            const salt = await bcrypt.genSalt(12);
            updateFields.password = await bcrypt.hash(password, salt);
        }

        if (Object.keys(updateFields).length === 0) {
            return sendError(res, 400, "No valid fields provided for update");
        }

        const updatedUser = await User.findByIdAndUpdate(
            id,
            { $set: updateFields },
            { new: true, runValidators: true }
        ).select("-password");

        return res.status(200).json({
            success: true,
            message: "User updated successfully",
            user: updatedUser,
        });
    } catch (error) {
        console.error("Update User Error:", error);
        if (error.name === "ValidationError") {
            return sendError(res, 400, "Validation error");
        }
        return sendError(res, 500, "Server error while updating user");
    }
};



export const ApproveUser = async (req, res) => {
    try {
        const { id } = req.params;
        const approver = req.user;

        const user = await User.findById(id);
        if (!user) return sendError(res, 404, "User not found");


        if (approver.role === "superadmin") {
            user.status = "approved";
            user.approvedBy = approver._id;
            await user.save();
            return res.status(200).json({ success: true, message: "User approved by SuperAdmin" });
        }

        if (approver.role === "companyadmin") {
            if (String(user.company) !== String(approver.company)) {
                return sendError(res, 403, "You cannot approve users from other companies");
            }

            user.status = "approved";
            user.approvedBy = approver._id;
            await user.save();

            return res.status(200).json({
                success: true,
                message: "User approved by CompanyAdmin",
            });
        }

        return sendError(res, 403, "You have no permission to approve users");

    } catch (error) {
        console.error("Approval Error:", error);
        return sendError(res, 500, "Server error during approval");
    }
};

export const RefreshToken = async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return sendError(res, 400, "Refresh Token is required");
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        const user = await User.findById(decoded.id);
        if (!user) return sendError(res, 404, "User not found");

        if (user.refreshToken !== refreshToken) {
            return sendError(res, 401, "Invalid Refresh Token");
        }

        const newAccessToken = user.generateAccessToken();
        const newRefreshToken = user.generateRefreshToken();

        user.refreshToken = newRefreshToken;
        await user.save();

        return res.status(200).json({
            success: true,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        });

    } catch (error) {
        console.error("Refresh Token Error:", error);
        if (error.name === "TokenExpiredError") {
            return sendError(res, 403, "Refresh token expired");
        }
        return sendError(res, 403, "Invalid Refresh Token");
    }
};

export const LogoutUser = async (req, res) => {
    try {
        const userId = req.user ? req.user.id : null;
        if (!userId) {
            return sendError(res, 401, "Unauthorized");
        }

        const user = await User.findById(userId);
        if (user) {
            user.refreshToken = null;
            await user.save();
        }

        return res.status(200).json({
            success: true,
            message: "Logged out successfully",
        });
    } catch (error) {
        console.error("Logout Error:", error);
        return sendError(res, 500, "Server error during logout");
    }
};

export const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return sendError(res, 400, "Verification token is required");
        }

        const user = await User.findOne({
            verificationToken: token,
            verificationTokenExpires: { $gt: new Date() }
        });

        if (!user) {
            return sendError(res, 400, "Invalid or expired verification token");
        }

        user.isVerified = true;
        user.verificationToken = null;
        user.verificationTokenExpires = null;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Email verified successfully",
        });
    } catch (error) {
        console.error("Verify Email Error:", error);
        return sendError(res, 500, "Server error while verifying email");
    }
};

export const resendVerificationEmail = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return sendError(res, 400, "Email is required");
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return sendError(res, 404, "User not found");
        }

        if (user.isVerified) {
            return sendError(res, 400, "Email is already verified");
        }

        // Generate new verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        user.verificationToken = verificationToken;
        user.verificationTokenExpires = verificationTokenExpires;
        await user.save();

        // Send verification email
        await sendVerificationEmail(user.email, verificationToken, user.name);

        return res.status(200).json({
            success: true,
            message: "Verification email sent successfully",
        });
    } catch (error) {
        console.error("Resend Verification Email Error:", error);
        return sendError(res, 500, "Server error while resending verification email");
    }
};
