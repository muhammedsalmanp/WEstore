const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const walletSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    balance: {
        type: Number,
        required: true,
        default: 0.0
    },
    transactions: [
        {
            transactionId: {
                type: String,
                required: true,
            },
            amount: {
                type: Number,
                required: true
            },
            type: {
                type: String,
                enum: ['deposit', 'withdrawal', 'payment',"refund"],
                required: true
            },
            status: {
                type: String,
                enum: ['completed', 'pending', 'failed'],
                default: 'completed'
            },
         debit:{
            type:String,
            enum:['debit','credit'],
         },
            date: {
                type: Date,
                default: Date.now
            },
            description: {
                type: String
            }
        }
    ]
});

module.exports = mongoose.model('Wallet', walletSchema);
