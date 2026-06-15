const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    name: {
        type: String,

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
        unique: [true, "Phone number already exists"],

    },
    password: {
        type: String,
        required: [true, "Please provide a password"],
    },
    account_number: {

        type: Number,
        unique: true

    },
    otp: {
        type: Number,
    },
    otpExpire: {
        type: Date
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
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },
}, { timestamps: true })
module.exports = mongoose.model("User", userSchema)