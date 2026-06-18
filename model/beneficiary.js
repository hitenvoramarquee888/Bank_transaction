const mongoose = require("mongoose");

const beneficiarySchema = new mongoose.Schema(
{
    userId: {
    type: mongoose.Schema.Types.ObjectId,

    ref: "User",
    },

    beneficiaryName: {
    type: String,
    required:true,
    trim:true
    },

    account_number: {
    type: Number,
    required : true
    },
},{ timestamps: true });
module.exports = mongoose.model("Beneficiary", beneficiarySchema);
