const mongoose = require('mongoose')
const ObjectId = mongoose.Schema.Types.ObjectId;
const transactionschema = new mongoose.Schema({
    account_Holdername: {
        type : ObjectId,
        ref : 'User',
        required: [true, "please enter your name"],
        
    },

    transaction : {
        type : Number,
        required: [true, "please enter your trancaction"],
}, 
    method : {
        type : String,
        enum : ['credit','debit'],
        default : 'credit'
        
},
    senderId: {
  type: ObjectId,
  ref: "User"
},

receiverId: {
  type: ObjectId,
  ref: "User"
},

senderName: {
   type : String,
},
receiverName: {
    type : String,
},

senderAccountNumber: {
    type : Number,
},

receiverAccountNumber: {
    type : Number,
},

    
},{timestamps : true})
module.exports = mongoose.model('transaction', transactionschema)