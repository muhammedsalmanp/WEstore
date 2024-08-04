const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  discountPercentage: {
    type: Number,
    required: true
  },
  minPurchaseAmount: {
    type: Number,
    required: true
  },
  expirationDate: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
    timestamps: true 
});


module.exports = mongoose.model('Coupon', couponSchema);
