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
            return !this.googleId && !this.facebookId; // Required if not a Google or Facebook user
        },
    },
    lastName: {
        type: String,
        required: function() {
            return !this.googleId && !this.facebookId; // Required if not a Google or Facebook user
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
            return !this.googleId && !this.facebookId; // Required if not a Google or Facebook user
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
    }
}, {
    timestamps: true,
});

userSchema.pre('save', async function (next) {
    if (this.isModified('password') && this.password) {
        const saltRounds = 10;
        this.password = await bcrypt.hash(this.password, saltRounds);
    }
    next();
});

module.exports = mongoose.model('User', userSchema);
