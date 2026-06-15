const user = require("../model/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendmail");
const transaction = require("../model/transaction");
exports.register = async (req, res) => {
  try {
    let passdata = req.body;

    // Password
    const password = passdata.password;

    // Password Validation
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,

        message:
          "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
      });
    }

    // Check Existing Email
    const existingUser = await user.findOne({
      email: passdata.email,
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    // Hash Password
    const salt = await bcrypt.genSalt(10);

    const hashPassword = await bcrypt.hash(passdata.password, salt);

    // Generate Account Number
    const AccountNo = Math.floor(1000000000 + Math.random() * 9000000000);

    console.log(AccountNo);

    // Create User
    const data = await user.create({
      name: passdata.name,

      email: passdata.email,

      phone: passdata.phone,

      password: hashPassword,

      account_number: AccountNo,
    });

    // Send Email
    await sendMail(
      passdata.email,

      "Welcome",

      `Hello ${passdata.name},

Your account has been created successfully.

Your Account Number is : ${AccountNo}

Thank you for choosing us!`,
    );

    // Response
    res.status(200).json({
      success: true,

      message: "User created successfully",

      account_number: AccountNo,

      data: data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: "Error creating user",

      error: error.message,
    });
  }
};
exports.getusers = async (req, res) => {
  try {
    const data = await user.find();
    res.status(200).json({
      success: true,
      message: "User data retrieved successfully",
      data: data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving user data",
      error: error.message,
    });
  }
};
exports.updateProfile = async (req, res) => {
  try {
    const updateid = req.params.updateid;

    // If password is being updated, validate and hash it
    if (req.body.password) {
      const password = req.body.password;
      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          status: "fail",
          message:
            "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
        });
      }
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      req.body.password = await bcrypt.hash(password, salt);
    }

    const updatedata = await user
      .findByIdAndUpdate(updateid, req.body, {
        new: true,
        runValidators: true,
      })
      .select("-password");

    if (!updatedata) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedata,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    let passdata = req.body;

    const emailVerify = await user.findOne({
      email: passdata.email

    });
    if (emailVerify?.isDeleted) {
      throw new Error(
        "This account has been deleted."
      );
    }


    if (!emailVerify) throw new Error("Account not found. Please register first.");

    if (
      emailVerify.lockUntil &&
      emailVerify.lockUntil > Date.now()
    ) {
      throw new Error(
        "Account locked. Try again after 5 minutes."
      );
    }

    const passwordVerify = await bcrypt.compare(
      passdata.password,
      emailVerify.password,
    );


    if (!passwordVerify) {

      emailVerify.loginAttempts += 1;

      if (emailVerify.loginAttempts >= 5) {

        emailVerify.lockUntil =
          new Date(Date.now() + 5 * 60 * 1000);

        await emailVerify.save();

        throw new Error(
          "Account locked for 5 minutes due to multiple failed attempts."
        );
      }

      await emailVerify.save();

      throw new Error("Invalid password.");
    }


    emailVerify.loginAttempts = 0;
    emailVerify.lockUntil = null;

    await emailVerify.save();

    const token = jwt.sign({ id: emailVerify._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    console.log("jwt", process.env.JWT_SECRET);

    res.status(200).json({
      success: true,
      message: "User logged in successfully",
      data: {
        id: emailVerify._id,
        name: emailVerify.name,
        email: emailVerify.email,
        phone: emailVerify.phone,
        role: emailVerify.role,
      },

      token,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};
exports.forgotpassword = async (req, res) => {
  try {
    const userdata = await user.findOne({
      phone: req.body.phone,
    });

    if (!userdata) {
      throw new Error("user not found");
    }

    const otp = Math.floor(1000 + Math.random() * 9000);

    userdata.otp = otp;

    userdata.otpExpire = Date.now() + 5 * 60 * 1000;

    await userdata.save();

    await sendMail(
      userdata.email,

      "OTP Verification",

      `Your OTP is ${otp}`,
    );

    console.log("OTP :", otp);

    res.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};
exports.verifyotp = async (req, res) => {
  try {
    const userdata = await user.findOne({
      phone: req.body.phone,
    });

    if (!userdata) {
      throw new Error("user not found");
    }

    if (Date.now() > userdata.otpExpire) {
      throw new Error("OTP expired");
    }

    if (userdata.otp != req.body.otp) {
      throw new Error("Invalid OTP");
    }

    res.json({
      success: true,
      message: "OTP verified",
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};
exports.resetpassword = async (req, res) => {
  try {
    const userdata = await user.findOne({
      phone: req.body.phone,
    });

    if (!userdata) {
      throw new Error("user not found");
    }
    // 🔥 Password length validation
    const password = req.body.password;
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
    if (!passwordRegex.test(password)) {
      throw new Error(
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
      );
    }
    const hashpassword = await bcrypt.hash(req.body.password, 10);

    userdata.password = hashpassword;

    userdata.otp = null;
    userdata.otpExpire = null;

    await userdata.save();

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};
exports.deleteAccount = async (req, res) => {
  try {
    const userid = req.user.id;

    await user.findByIdAndUpdate(
      userid,
      {
        isDeleted: true,
        deletedAt: new Date(),
      }
    );

    res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// ===== ADMIN: Get all active (non-deleted) users =====
exports.getAllUsersAdmin = async (req, res) => {
  try {
    const data = await user.find({ isDeleted: false }).select("-password -otp -otpExpire");
    res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message,
    });
  }
};

// ===== ADMIN: Get all soft-deleted users =====
exports.getDeletedUsers = async (req, res) => {
  try {
    const data = await user.find({ isDeleted: true }).select("-password -otp -otpExpire");
    res.status(200).json({
      success: true,
      message: "Deleted users fetched successfully",
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching deleted users",
      error: error.message,
    });
  }
};

// ===== ADMIN: Get full details of a single user (active or deleted) =====
exports.getUserFullDetails = async (req, res) => {
  try {
    const userId = req.params.id;

    const userData = await user.findById(userId).select("-password -otp -otpExpire");

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Transaction history
    const transactions = await transaction
      .find({ account_Holdername: userId })
      .sort({ createdAt: -1 });

    // Beneficiaries (bank details added by this user)
    const Beneficiary = require("../model/beneficiary");
    const beneficiaries = await Beneficiary.find({ userId: userId });

    // Balance calculation
    const mongoose = require("mongoose");
    const balanceData = await transaction.aggregate([
      { $match: { account_Holdername: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalbalance: {
            $sum: {
              $cond: [
                { $eq: ["$method", "credit"] },
                "$transaction",
                { $multiply: ["$transaction", -1] },
              ],
            },
          },
        },
      },
    ]);
    const currentBalance = balanceData[0]?.totalbalance || 0;

    res.status(200).json({
      success: true,
      message: "User details fetched successfully",
      data: {
        user: userData,
        currentBalance,
        transactions,
        beneficiaries,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching user details",
      error: error.message,
    });
  }
};

