
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        unique: true,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    products: [
        {
            _id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            quantity: {
                type: Number,
                required: true,
                min: 1
            },
            price: {
                type: Number,
                required: true
            },
            isCanceld: {
                type: Boolean,
                default: false
            }
        }
    ],
    totalAmount: {
        type: Number,
        required: true
    },
    shippingAddress: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserAddress',
        required: true
    },
    paymentMethod: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Ordered', 'Shipped', 'Out for delivery',"processing", 'Delivered', 'Cancelled', 'Returned', 'Received', 'Refund Issued', 'Refund Credited','Failed',],
        default: 'Ordered'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    expectedDeliveryDate: {
        type: Date,
        required: true
    },
    coupon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon'
    },
    couponDiscount: {
        type: Number,
        default: 0
    },
    offerAppliedTotalAmount: {
        type: Number,
        default: 0
    },
    returnReason: {
        type: String
    },
    return: {
        type: Boolean,
        default: false
    },
    returnID: {
        type: String,
        default:'',
    },
    paymentId:{
       type:String,
       default:'',
    },
    paymentStatus: {
        type: String,
        enum: ["Paid", "Pending", "COD", "Failed", "Refunded", "Cancelled"],
        default:"Pending"
      },
    couponMessage: {
        type: String,
    },
});

module.exports = mongoose.model('Order', orderSchema);