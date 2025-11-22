import User from "../model/User.model.js";
import { generateToken } from "../model/User.model.js";
import { sendError } from "../helper/Error.helper.js";


export const RegisterUser = async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
        return sendError(res, 400, "Please provide name, email, and password");
    }

    try {
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return sendError(res, 400, "User already exists with this email");
        }

        const newUser = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: password,
            role: role || "user",
        });

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            token,
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
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
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return sendError(res, 401, "Invalid email or password");
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return sendError(res, 401, "Invalid email or password");
        }

        const token = generateToken(user._id, user.role);

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error("Login Error:", error);
        return sendError(res, 500, "Server error during login");
    }
};


export const UpdateUser = async (req, res) => {
    const { name, email, password } = req.body;
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