const Category = require("../model/categorySchema");
const UserAddress = require("../model/userAddressSchema")
const User = require("../model/userSchema");
const Cart = require("../model/cartSchema");
const Order = require("../model/orderSchema");
const Product = require("../model/productSchema");
const Wishlist = require("../model/wishlistSchema");

const crypto = require("crypto");
const razorpayInstance = require("../config/razorPay");




function generateShortId(length = 8) {
  return crypto.randomBytes(length).toString('hex').slice(0, length).toUpperCase();
}
module.exports = {

  getCheckOut: async (req, res) => {
    try {
      const userId = req.session.user;
      const userAddressData = await UserAddress.findOne({ userId: userId });
      const addresses = userAddressData ? userAddressData.addresses : [];
      const cart = await Cart.findOne({ userId: userId }).populate('products._id').populate('coupon');;
      const appliedCouponCode = cart && cart.coupon ? cart.coupon.code : null;
      let wishlist = await Wishlist.findOne({ userId: req.session.user }).populate('products');
      const cartCount = cart && cart.products ? cart.products.length : 0;
      res.render("shop/checkOut", {
        user: req.session.user,
        addresses: addresses,
        cart: cart,
        appliedCouponCode,
        wishlist,
        cartCount: cartCount,
      });
      console.log("it from get checkout cart ", cart);
    } catch (error) {
      console.error("Error fetching address:", error);
      res.status(500).send("Internal Server Error");
    }
  },

  placeOrder: async (req, res) => {
    try {
      const { paymentoptions, address } = req.body;

      if (!paymentoptions) {
        return res.status(400).json({ success: false, message: "Please select a payment method" });
      }
      if (!address) {
        return res.status(400).json({ success: false, message: "Please select an address" });
      }

      const userId = req.session.user;
      const user = await User.findById(userId);
      const userCart = await Cart.findOne({ userId }).populate('products._id');

      if (!user || !userCart) {
        return res.status(404).json({ success: false, message: "User or cart not found" });
      }

      let totalAmount = userCart.totalPrice;
      const couponDiscount = userCart.couponDiscount;
      const offerAppliedTotalAmount = userCart.offerAppliedTotalAmount;

      const products = userCart.products.map(item => {
        if (item._id && item._id._id) {
          return {
            _id: item._id._id, // ObjectId of the product
            quantity: item.quantity,
            price: item.price
          };
        } else {
          console.warn('Product ID not found for item:', item);
          return null;
        }
      }).filter(product => product !== null);

      let shippingAddress = await UserAddress.findOne(
        { 'addresses._id': address },
        { 'addresses.$': 1 }
      );

      if (!shippingAddress) {
        return res.status(404).json({ success: false, message: "Shipping address not found" });
      }

      // Generate unique 8-character order ID
      const orderId = generateShortId();

      const order = new Order({
        orderId: orderId,
        userId: userId,
        products: products,
        totalAmount: totalAmount,
        shippingAddress: shippingAddress._id,
        paymentMethod: paymentoptions,
        status: 'Ordered',
        expectedDeliveryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        coupon: userCart.coupon, // Add coupon reference
        couponDiscount: couponDiscount, // Add coupon discount
        offerAppliedTotalAmount: offerAppliedTotalAmount, // Add total amount after coupon
      });
      if(order.paymentMethod==="Razor Pay"){
        order.status="Failed"
      }
      // Save the order
      await order.save()
      if(order.paymentMethod==="COD"){
        for (const item of userCart.products) {
          if (item._id && item._id._id) {
            await Product.findByIdAndUpdate(item._id._id, {
              $inc: { stock: -item.quantity }
            });
          }
        }
      }
         
      if(order.paymentMethod!=="Razor Pay"){
        await Cart.findOneAndDelete({ userId });
      }

      console.log("Order:", order);
      return res.status(201).json({ success: true, message: 'Order placed successfully', orderId: orderId });

    } catch (error) {
      console.error("Error placing order:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to place order",
        error: error.message,
      });
    }
  },

  verifyPayment: async (req, res) => {
    try {
      const { paymentId, orderId } = req.body;
      if (!orderId) {
        return res.json({ success: false, message: 'Order ID not found' });
      }
      if (!paymentId) {
        return res.json({ success: false, message: 'Payment ID not found' });
      }
  
      const order = await Order.findOne({ orderId });
      if (!order) {
        return res.json({ success: false, message: 'Invalid Order ID' });
      }
     const cart = await Cart.findOne({userId:order.userId})
      order.paymentStatus = 'Pending';
  
      try {
        const payments = await razorpayInstance.payments.fetch(paymentId);

         console.log("payments : ",payments);
         
         
        if (payments && payments.status === 'authorized') {
          order.paymentStatus = 'Paid';
          order.paymentId = paymentId;
          order.status = 'Ordered';
        } else {
          order.paymentStatus = 'Failed';
          order.status = 'Failed';
        }
      } catch (fetchError) {
        console.error("Error fetching payment details:", fetchError.response ? fetchError.response.data : fetchError.message);
        order.paymentStatus = 'Failed';
        order.status = 'Failed';
      }
      if (order.status !== 'Failed') {
        for (const item of order.products) {
          if (item._id && item._id._id) {
            await Product.findByIdAndUpdate(item._id._id, {
              $inc: { stock: -item.quantity }
            });
          }
        }
      }
     
      await order.save();
      console.log(order);

      if(order.paymentMethod==="Razor Pay"){
        await Cart.findOneAndDelete({ userId:order.userId });
      }
      res.json({ success: true, orderId, paymentId });
    } catch (error) {
      console.error("Error verifying payment:", error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
  

};


