const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        minlength: 3,
        maxlength: 50

    },
    email: {
        type: String,
        required: [true, "Please provide an email"],
        unique: [true, "Email already exists"],
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Please provide a valid email"]
    },
    phone: {
        type: Number,
        required: [true, "Please provide a phone number"],

    },
    password: {
        type: String,
        required: [true, "Please provide a password"],
    },
    account_number: {

        type: Number,
        unique: true

    },
    profilePic: {
        type: String,
        default: null
    },
    otp: {
        type: Number,
    },
    otpExpire: {
        type: Date
    },
    resetOtpVerified: {
        type: Boolean,
        default: false
    },
    loginAttempts: {
        type: Number,
        default: 0
    },

    lockUntil: {
        type: Date,
        default: null
    },
    isDeleted: {
        type: Boolean,
        default: false
    },

    deletedAt: {
        type: Date,
        default: null
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },
}, { timestamps: true })
module.exports = mongoose.model("User", userSchema)