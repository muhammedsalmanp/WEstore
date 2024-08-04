const Wishlist = require("../model/wishlistSchema");
const User = require("../model/userSchema");
const Cart = require("../model/cartSchema");
const Product = require("../model/productSchema");
const Coupon = require ("../model/couponSchema");


module.exports = {

 createOrder : async (req, res) => {
    try {
        const { selectedAddress, paymentOption } = req.body; // Extract selected address and payment option
        const userId = req.session.user; // Assume user ID is stored in session
        const cart = await Cart.findOne({ userId }).populate('products.productId'); // Fetch cart and populate product details

        if (!cart) {
            return res.status(400).json({ error: 'Cart not found' });
        }

        const address = await UserAddress.findById(selectedAddress);

        if (!address) {
            return res.status(400).json({ error: 'Address not found' });
        }

        const totalAmount = cart.totalPrice; // Use cart total price
        const expectedDeliveryDate = new Date();
        expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + 4); // Set delivery date to 4 days from now

        const newOrder = new Order({
            userId,
            products: cart.products.map(product => ({
                productId: product.productId._id,
                quantity: product.quantity,
                price: product.price
            })),
            totalAmount,
            shippingAddress: selectedAddress,
            paymentMethod: paymentOption,
            expectedDeliveryDate
        });

        await newOrder.save();

        // Clear the cart after successful order creation
        await Cart.findOneAndUpdate({ userId }, { $set: { products: [], totalPrice: 0 ,totalProduct:0} });

        res.status(201).json({ message: 'Order placed successfully', order: newOrder });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
 },

};
