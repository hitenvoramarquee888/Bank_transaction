const transaction = require("../model/transaction");
const { Parser } = require("json2csv");
const sendMail = require("../utils/sendmail");
const user = require("../model/user");
const Beneficiary = require("../model/beneficiary");
const mongoose = require("mongoose");

exports.alldata = async (req, res) => {
  try {
    const userid = req.user.id;
    console.log(userid)

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const result = await transaction.aggregate([
      // 🔥 Only current user transactions
      {
        $match: {
          account_Holdername: new mongoose.Types.ObjectId(userid),
        },
      },

      // 🔥 Sort latest first
      {
        $sort: { createdAt: -1 },
      },

      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: "users", // change if your collection name different
                localField: "account_Holdername",
                foreignField: "_id",
                as: "account_Holdername",
              },
            },
          ],

          totalCount: [{ $count: "count" }],

          balance: [
            {
              $group: {
                _id: null,
                totalCredit: {
                  $sum: {
                    $cond: [{ $eq: ["$method", "credit"] }, "$transaction", 0],
                  },
                },
                totalDebit: {
                  $sum: {
                    $cond: [{ $eq: ["$method", "debit"] }, "$transaction", 0],
                  },
                },
              },
            },
            {
              $project: {
                _id: null,
                balance: { $subtract: ["$totalCredit", "$totalDebit"] },
              },
            },
          ],
        },
      },
    ]);

    const totalBalance = result[0].balance[0]?.balance || 0;
    const totaltransactions = result[0].totalCount[0]?.count || 0;
    res.status(200).json({
      success: true,
      message: "data fetched successfully",

      currentBalance: totalBalance,

      pagination: {
        page,
        limit,
        totaltransactions,
        totalPages: Math.ceil(totaltransactions / limit),
      },

      result: result[0].data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching data",
      error: error.message,
    });
  }
};
exports.transaction = async (req, res) => {
  try {
    let passdata = req.body;
    const userid = req.user.id;
    console.log("======>", userid)


    const alltransactions = await transaction.find({
      account_Holdername: userid
    });
    // const amount = Number(req.body.transaction);

    //         if (amount >50000) {
    //         throw new Error("Maximum transaction limit is ₹50,000");
    //         }

    const balanceData = await transaction.aggregate([
      {
        $match: {
          account_Holdername: new mongoose.Types.ObjectId(userid),
        },
      },

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
    const totalBalance =
      balanceData.length > 0 ? balanceData[0].totalbalance : 0;

    const userdata = await user.findById(userid);


    if (!userdata) {
      throw new Error("User not found");
    }



    passdata.account_Holdername = userid;
    const data = await transaction.create(passdata);

    const currentBalance =
      data.method === "credit"
        ? totalBalance + data.transaction
        : totalBalance - data.transaction;

    await sendMail(
      userdata.email,

      "Transaction Alert",

      `Dear ${userdata.name},
    Your transaction has been processed successfully.
    Account Number : ${userdata.account_number.toString().slice(-4).padStart(10, "*")}
    Transaction Type : ${data.method}
    Amount : ₹${data.transaction}
    Available Balance : ₹${currentBalance}
    Date & Time : ${data.createdAt.toLocaleString()}
    If you did not authorize this transaction, please contact customer support immediately.

    Regards,
    Bank Support Team`,
    );

    res.status(200).json({
      success: true,
      message: "transaction successful",
      currentBalance,
      data: data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating transaction",
      error: error.message,
    });
  }
};
exports.history = async (req, res) => {
  try {
    const userid = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const result = await transaction.aggregate([
      {
        $match: {
          account_Holdername: new mongoose.Types.ObjectId(userid),
        },
      },
      {
        $facet: {
          transactions: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                transaction: 1,
                method: 1,
                senderName: 1,
                receiverName: 1,
                senderAccountNumber: 1,
                receiverAccountNumber: 1,
                transferType: 1,
                createdAt: 1,
              },
            },
          ],

          totalCount: [
            { $count: "count" }
          ],

        },
      },
    ]);

    const data =
      result[0].transactions || [];

    const totalTransactions =
      result[0].totalCount[0]?.count || 0;

    const balanceData =
      await transaction.aggregate([
        {
          $match: {
            account_Holdername:
              new mongoose.Types.ObjectId(userid),
          },
        },

        {
          $group: {

            _id: null,

            totalBalance: {
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

    const totalBalance =
      balanceData[0]?.totalBalance || 0;

    res.status(200).json({
      success: true,
      currentBalance: totalBalance,
      pagination: {
        currentPage: page,
        limit,
        totalTransactions,
        totalPages: Math.ceil(
          totalTransactions / limit
        ),
      },
      transactions: data,

    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};
exports.downloadStatement = async (req, res) => {
  try {
    const userid = req.user.id;

    const data = await transaction
      .find({
        account_Holdername: userid,
      })
      .populate("account_Holdername")
      .sort({ createdAt: -1 });

    if (data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No transactions found",
      });
    }

    const statement = data.map((item) => ({
      Name: item.account_Holdername.name,
      Amount: item.transaction,
      Type: item.method,
      Date: item.createdAt.toLocaleString(),
    }));

    const parser = new Parser();
    const csv = parser.parse(statement);

    res.header("Content-Type", "text/csv");
    res.attachment("statement.csv");

    return res.send(csv);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
exports.transfer = async (req, res) => {
  try {
    const senderId = req.user.id;
    // Sender details
    const sender = await user.findById(senderId);

    if (!sender) {
      throw new Error("Sender not found");
    }

    const { beneficiaryId, receiverAccountNo, amount } = req.body;

    let receiver;

    if (beneficiaryId) {
      const beneficiary = await Beneficiary.findById(beneficiaryId);

      if (!beneficiary) {
        throw new Error("Beneficiary not found");
      }

      receiver = await user.findOne({
        account_number: beneficiary.account_number,
      });
    } else if (receiverAccountNo) {
      receiver = await user.findOne({
        account_number: receiverAccountNo,
      });
    }

    if (!receiver) {
      throw new Error("Receiver not found");
    }

    // Same account check
    if (sender.account_number === receiver.account_number) {
      throw new Error("Cannot transfer to same account");
    }

    // Sender balance
    const balanceData = await transaction.aggregate([
      {
        $match: {
          account_Holdername: new mongoose.Types.ObjectId(senderId),
        },
      },

      {
        $group: {
          _id: null,

          totalBalance: {
            $sum: {
              $cond: [
                {
                  $eq: ["$method", "credit"],
                },

                "$transaction",

                {
                  $multiply: ["$transaction", -1],
                },
              ],
            },
          },
        },
      },
    ]);

    let totalBalance = balanceData[0]?.totalBalance || 0;

    // Balance validation
    if (amount > totalBalance) {
      throw new Error("Insufficient balance");
    }

    // Sender debit
    const transferType = "Transfer";

    // Sender Entry
    await transaction.create({

      account_Holdername: sender._id,

      senderId: sender._id,
      receiverId: receiver._id,

      senderName: sender.name,
      receiverName: receiver.name,

      senderAccountNumber:
        sender.account_number,

      receiverAccountNumber:
        receiver.account_number,

      transferType,

      transaction: amount,

      method: "debit",

    });

    // Receiver Entry
    await transaction.create({

      account_Holdername: receiver._id,

      senderId: sender._id,
      receiverId: receiver._id,

      senderName: sender.name,
      receiverName: receiver.name,

      senderAccountNumber:
        sender.account_number,

      receiverAccountNumber:
        receiver.account_number,

      transferType,

      transaction: amount,

      method: "credit",

    });

    // Update balance
    totalBalance -= amount;

    // Sender email
    await sendMail(
      sender.email,

      "Money Transfer Alert",

      `Dear ${sender.name},

Your transfer has been completed successfully.

Debited Amount : ₹${amount}

Transferred To :
${receiver.name}

Account :
${receiver.account_number.toString().slice(-4).padStart(10, "*")}

Available Balance :
₹${totalBalance}

Date :
${new Date().toLocaleString()}

Regards,
Bank Support Team`,
    );

    // Receiver email
    await sendMail(
      receiver.email,

      "Money Received Alert",

      `Dear ${receiver.name},

You have received money successfully.

Credited Amount :
₹${amount}

Received From :
${sender.name}

Account :
${sender.account_number.toString().slice(-4).padStart(10, "*")}

Date :
${new Date().toLocaleString()}

Regards,
Bank Support Team`,
    );

    res.status(200).json({
      success: true,

      message: "Transfer successful",

      currentBalance: totalBalance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      error: error.message,
    });
  }
};
exports.addBeneficiary = async (req, res) => {
  try {
    const data = await Beneficiary.create({
      userId: req.user.id,

      beneficiaryName: req.body.name,

      account_number: req.body.accountNo,
    });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
    });
  }
};

exports.recentTransactions = async (req, res) => {
  try {
    const userid = req.user.id;
    const recent = await transaction.find({ account_Holdername: userid }).sort({ createdAt: -1 }).limit(5);
    res.status(200).json({ success: true, transactions: recent });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
exports.downloadStatementAdmin = async (req, res) => {
  try {
    const userId = req.params.id;

    const userExists = await user.findById(userId);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const data = await transaction
      .find({ account_Holdername: userId })
      .populate("account_Holdername")
      .sort({ createdAt: -1 });

    if (data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No transactions found for this user",
      });
    }

    const statement = data.map((item) => ({
      Name: item.account_Holdername?.name || userExists.name,
      AccountNumber: userExists.account_number,
      Amount: item.transaction,
      Type: item.method,
      Date: item.createdAt.toLocaleString(),
    }));

    const parser = new Parser();
    const csv = parser.parse(statement);

    res.header("Content-Type", "text/csv");
    res.attachment(`statement_${userExists.account_number}.csv`);

    return res.send(csv);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
