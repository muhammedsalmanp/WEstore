const Category = require("../model/categorySchema");
const  UserAddress = require("../model/userAddressSchema")
const User = require ("../model/userSchema");
const Cart = require("../model/cartSchema");

module.exports = {

    getCheckOut: async (req, res) => {              
        try {
            const userId = req.session.user._id;
            const userAddressData = await UserAddress.findOne({ userId: userId });
            const addresses = userAddressData ? userAddressData.addresses : [];
            const cart = await Cart.findOne({ userId: userId }).populate('products._id').populate('coupon'); ;
            const appliedCouponCode = cart.coupon ? cart.coupon.code : '';
            res.render("shop/checkOut", {
                user: req.session.user,
                addresses: addresses,
                cart: cart,
                appliedCouponCode
            });
            console.log(cart);
        } catch (error) {
            console.error("Error fetching address:", error);
            res.status(500).send("Internal Server Error");
        }
    }
    
    

    
}