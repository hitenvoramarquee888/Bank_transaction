const user = require("../model/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendmail");
const transaction = require("../model/transaction");
const fs = require('fs');
const path = require('path');
exports.register = async (req, res) => {
  try {
    let passdata = req.body;
    if (!passdata.name?.trim()) {
      throw new Error("Name is required");
    }
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
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }
    const existingPhone = await user.findOne({
      phone: passdata.phone,
    });

    if (existingPhone) {
      return res.status(409).json({
        success: false,
        message: "Phone already exists",
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
    if (req.user.id !== updateid) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }
    if (
      req.body.name !== undefined &&
      !req.body.name.trim()
    ) {
      throw new Error(
        "Name cannot be empty"
      );
    }
    if (req.body.phone) {

      const existingPhone =
        await user.findOne({
          phone: req.body.phone,
          _id: { $ne: updateid }
        });

      if (existingPhone) {
        throw new Error(
          "Phone already exists"
        );
      }
    }
    if (req.body.email) {

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (
        !emailRegex.test(
          req.body.email
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format"
        });
      }
    }
    const allowedFields = [
      "name",
      "email",
      "phone",
      "password"
    ];

    const filteredBody = {};

    allowedFields.forEach((field) => {

      if (
        req.body[field] !== undefined
      ) {

        filteredBody[field] =
          req.body[field];

      }

    });

    // If password is being updated, validate and hash it
    if (filteredBody.password) {
      const password = filteredBody.password;
      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          status: "fail",
          message:
            "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
        });
      }
      const samePassword =
        await bcrypt.compare(
          password,
          (
            await user.findById(updateid)
          ).password
        );

      if (samePassword) {
        throw new Error(
          "New password must be different from current password"
        );
      }

      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      filteredBody.password = await bcrypt.hash(password, salt);
    }

    const updatedata = await user
      .findByIdAndUpdate(updateid, filteredBody, {
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
    const identifier = passdata.identifier;

    let emailVerify;

    if (isNaN(identifier)) {

      // Email Login
      emailVerify = await user.findOne({
        email: identifier
      });

    } else {

      // Phone Login
      emailVerify = await user.findOne({
        phone: Number(identifier)
      });

    }

    // if (!emailVerify) throw new Error("Account not found. Please register first.");
    if (!emailVerify) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    if (
      emailVerify.lockUntil &&
      new Date(emailVerify.lockUntil).getTime() > Date.now()
    ) {
      throw new Error("Account locked. Try again after 5 minutes.");
    }

    const passwordVerify = await bcrypt.compare(
      passdata.password,
      emailVerify.password,
    );



    if (!passwordVerify) {
      emailVerify.loginAttempts += 1;

      if (emailVerify.loginAttempts >= 5) {
        emailVerify.lockUntil = new Date(Date.now() + 5 * 60 * 1000);
        await emailVerify.save();

        throw new Error(
          "Account locked for 5 minutes due to multiple failed attempts."
        );
      }

      await emailVerify.save();

      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }
    if (emailVerify?.isDeleted) {
    return res.status(403).json({
    success: false,
    message: "This account has been deleted."
  });
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
    res.status(404).json({
      success: false,
      message: err.message
    });
  }
};
exports.forgotpassword = async (req, res) => {
  try {
    const userdata = await user.findOne({
      phone: req.body.phone,
    });

    if (!userdata) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    userdata.otp = otp;

    userdata.otpExpire = Date.now() + 5 * 60 * 1000;

    userdata.resetOtpVerified = false;

    await userdata.save();

    await sendMail(
      userdata.email,

      "OTP Verification",

      `Your OTP is ${otp}`,
    );

    console.log("OTP :", otp);

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    res.status(500).json({
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
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (!userdata.otp || !userdata.otpExpire) {
      return res.status(404).json({
        success: false,
        message: "OTP not found"
      });
    }

    if (Date.now() > userdata.otpExpire) {
      return res.status(400).json({
        success: false,
        message: "OTP expired"
      });
    }

    if (userdata.otp != req.body.otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    // OTP verified successfully
    userdata.resetOtpVerified = true;

    await userdata.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });

  } catch(error) {
    return res.status(500).json({
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
       return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // OTP verification check
    if (!userdata.resetOtpVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify OTP first"
      });
    }

    // Password validation
    const password = req.body.password;

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character"
      });
    }

    // Check if new password is same as old password
    const samePassword = await bcrypt.compare(
      password,
      userdata.password
    );

    if (samePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from old password"
      });
    }

    // Hash new password
    const hashpassword = await bcrypt.hash(password, 10);

    // Update password
    userdata.password = hashpassword;

    // Clear OTP related data
    userdata.otp = null;
    userdata.otpExpire = null;
    userdata.resetOtpVerified = false;

    await userdata.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });

  } catch (error) {
    return res.json({
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
//--------------upload profile pic----------//
exports.uploadProfilePic = async (req, res) => {
  try {
    const updateid = req.params.updateid;
    if (req.user.id !== updateid) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Delete old picture if exists
    const existing = await user.findById(updateid);
    if (existing?.profilePic) {
      const oldPath = path.join(__dirname, '..', 'public', existing.profilePic);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const picPath = '/profile/' + req.file.filename;
    const updated = await user.findByIdAndUpdate(
      updateid,
      { profilePic: picPath },
      { new: true }
    ).select('-password');

    res.status(200).json({ success: true, message: 'Profile picture updated', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.removeProfilePic = async (req, res) => {
  try {
    const updateid = req.params.updateid;
    if (req.user.id !== updateid) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const existing = await user.findById(updateid);
    if (existing?.profilePic) {
      const oldPath = path.join(__dirname, '..', 'public', existing.profilePic);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const updated = await user.findByIdAndUpdate(
      updateid,
      { profilePic: null },
      { new: true }
    ).select('-password');

    res.status(200).json({ success: true, message: 'Profile picture removed', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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

// ====== ADMIN : restore deleted user ======

exports.restoreUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const userData = await user.findById(userId);

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!userData.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "User is already active",
      });
    }

    userData.isDeleted = false;
    userData.deletedAt = null;

    await userData.save();

    res.status(200).json({
      success: true,
      message: "User restored successfully",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
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

