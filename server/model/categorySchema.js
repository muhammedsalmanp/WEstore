const mongoose = require('mongoose');
const { path } = require('../../app');

const Schema = mongoose.Schema;

const catogorySchema = new Schema({

    name: {
        type: String,
        required : true,
        unique: true,
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true,
    },
    offerDiscountPersantage: {
        type: Number,
        min: 0,
        default: 0
    },
    onOffer: {
        type: Boolean,
        default: false,
    },
    offerType: {
        type: String,
        enum: ['Summer', 'Winter', 'Holiday', 'Clearance', 'Black Friday','General'],
        default: 'General'
    },
    description:{
        type: String,
    }
},
{
    timestamps: true
});

module.exports = mongoose.model('Category', catogorySchema)