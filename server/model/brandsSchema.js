const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const brandSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    logo: {
        name: {
            type: String, 
            required: true
        },
        path: {
            type: String, 
            required: true
        }
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
}, {
    timestamps: true 
});


const Brand = mongoose.model('Brand', brandSchema);

module.exports = Brand;
