import mongoose from 'mongoose';
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },

    password: {
        type: String,
        required: true,
        minlength: 6,
    },

    phoneNumber: {
        type: Number,
        trim: true,
        // required: true,
    },

    role: {
        type: String,
        enum: ["superadmin", "companyadmin", "operator", "user"],
        default: "user",
    },

    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        default: null,
    },

    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },

    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },

    isVerified: {
        type: Boolean,
        default: false,
    },

    lastLogin: {
        type: Date,
    },
    refreshToken: {
        type: String,
    }
},
    { timestamps: true }
);


UserSchema.pre("save", async function (next) {

    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
})

UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

UserSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            id: this._id,
            role: this.role,
            company: this.company,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRY || "15m" }
    );
};

UserSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            id: this._id,
        },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRY || "7d" }
    );
};

const User = mongoose.model('User', UserSchema);
export default User;