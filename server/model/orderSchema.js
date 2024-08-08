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
        enum: ['COD', 'Wallet', 'Online Payment'],
        required: true
    },
    status: {
        type: String,
        enum: ['Ordered', 'Shipped', 'Out for delivery', 'Delivered', 'Cancelled'],
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
    }
});

module.exports = mongoose.model('Order', orderSchema);
