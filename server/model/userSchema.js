const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const Schema = mongoose.Schema;

const userSchema = new Schema({
    googleId: {
        type: String,
        unique: true,
        sparse: true,
    },
    facebookId: {
        type: String,
        unique: true,
        sparse: true,
    },
    firstName: {
        type: String,
        required: function() {
            return !this.googleId && !this.facebookId; 
        },
    },
    lastName: {
        type: String,
        required: function() {
            return !this.googleId && !this.facebookId; 
        },
    },
    email: {
        type: String,
        unique: true,
        required: true,
    },
    password: {
        type: String,
        required: function() {
            return !this.googleId && !this.facebookId; 
        },
    },
    isAdmin: {
        type: Boolean,
        default: false,
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    joined_date: {
        type: Date,
        default: Date.now,
        immutable: true,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    wishlist: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "WishList",
    },
    cart: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Cart",
    },
    referralCode: {
        type: String,
        default: null,
      },
      referralCodeGenerated: {
        type: Boolean,
        default: false,
      },
}, {
    timestamps: true,
});


module.exports = mongoose.model('User', userSchema);
