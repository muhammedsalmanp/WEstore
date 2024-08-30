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
    }
}, {
    timestamps: true 
});


const Brand = mongoose.model('Brand', brandSchema);

module.exports = Brand;
