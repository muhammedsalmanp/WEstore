// const mongoose = require('mongoose');

// const reviewSchema = new mongoose.Schema({
//     rating: {
//      type:Number,
     
//     },
//     comment: {
//         type:String,
     
//     },
//     image:{
//         type:String,
//     },
//     date: {
//      type: Date, 
//      default: Date.now 
//     },
//     product: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Product',                     
//     },
// });

// module.exports= mongoose.model('Review', reviewSchema);

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    rating: {
        type: Number,
        required: true
    },
    comment: {
        type: String,
        required: true
    },
    image: {
        type: String
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    username: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Review', reviewSchema);
