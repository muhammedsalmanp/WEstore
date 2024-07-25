const Category = require("../model/categorySchema");
const  UserAddress = require("../model/userAddressSchema")
const User = require ("../model/userSchema");

module.exports = {


getCheckOut: async (req, res) => {
    try {
        // Convert session user ID to ObjectId
        const userId = await User.findOne(req.session.user);
         // Find the address using the ObjectId
        const address = await UserAddress.findOne({ userId: userId });
        res.render("shop/checkOut", {
            user: req.session.user,
            address: address
        });
    } catch (error) {
        console.error("Error fetching address:", error);
        res.status(500).send("Internal Server Error");
    }
}

    
}