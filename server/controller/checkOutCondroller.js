const deliveryCharges = {
  'Andhra Pradesh': 150,
  'Arunachal Pradesh': 250,
  'Assam': 200,
  'Bihar': 175,
  'Chhattisgarh': 225,
  'Goa': 100,
  'Gujarat': 250,
  'Haryana': 200,
  'Himachal Pradesh': 300,
  'Jharkhand': 175,
  'Karnataka': 100,
  'Kerala': 0,
  'Madhya Pradesh': 250,
  'Maharashtra': 225,
  'Manipur': 275,
  'Meghalaya': 250,
  'Mizoram': 275,
  'Nagaland': 275,
  'Odisha': 200,
  'Punjab': 225,
  'Rajasthan': 275,
  'Sikkim': 300,
  'Tamil Nadu': 100,
  'Telangana': 150,
  'Tripura': 275,
  'Uttar Pradesh': 200,
  'Uttarakhand': 275,
  'West Bengal': 225,
  'Andaman and Nicobar Islands': 350,
  'Chandigarh': 200,
  'Dadra and Nagar Haveli and Daman and Diu': 275,
  'Lakshadweep': 150,
  'Delhi': 200,
  'Puducherry': 100,
  'Jammu and Kashmir': 300,
  'Ladakh': 300
};

const Category = require("../model/categorySchema");
const UserAddress = require("../model/userAddressSchema")
const User = require("../model/userSchema");
const Cart = require("../model/cartSchema");
const Order = require("../model/orderSchema");
const Product = require("../model/productSchema");
const Wishlist = require("../model/wishlistSchema");
const Wallet = require("../model/walletSchema");
const Coupon = require ('../controller/CouponCondroller')
const crypto = require("crypto");
const razorpayInstance = require("../config/razorPay");
const { updateCart } = require("./cartController");

function calculateDeliveryCharge(state) {
  if (state === 'Kerala') {
    return 'Free Delivery';
  }
  if (state === 'Based on your location') {
    return "Based on your location"
  }
  const charge = deliveryCharges[state];
  return charge !== undefined ? `₹${charge}` : 'Delivery charge not available';
}

function generateShortId(length = 8) {
  return crypto.randomBytes(length).toString('hex').slice(0, length).toUpperCase();
}
module.exports = {

  getCheckOut: async (req, res) => {
    try {
        const userId = req.session.user;
        const userAddressData = await UserAddress.findOne({ userId: userId });
        const addresses = userAddressData ? userAddressData.addresses : [];
        const cart = await Cart.findOne({ userId: userId }).populate('products._id').populate('coupon');
        const appliedCouponCode = cart && cart.coupon ? cart.coupon.code : null;
        let wishlist = await Wishlist.findOne({ userId: req.session.user }).populate('products');
        const cartCount = cart && cart.products ? cart.products.length : 0;
        console.log(cart);
        let wallet = await Wallet.findOne({ userId: userId });
        if (!wallet) {
            wallet = await Wallet.create({
                userId: userId,
                balance: 0,
                transactions: []
            });
        }     
          

        res.render("shop/checkOut", {
            user: req.session.user,
            addresses: addresses,
            cart: cart,
            appliedCouponCode,
            wishlist,
            cartCount: cartCount,
            wallet,
        });
    } catch (error) {
        console.error("Error fetching address:", error);
        res.status(500).send("Internal Server Error");
    }
  },

  getShippingCharges: async (req, res) => {
    try {
      const { addressId } = req.query;
      const userId = req.session.user;

      if (!addressId || !userId) {
        return res.status(400).json({ message: 'Address ID and User ID are required' });
      }

      // Fetch address details
      const address = await UserAddress.findOne({ 'addresses._id': addressId }, { 'addresses.$': 1 });
      if (!address || !address.addresses.length) {
        return res.status(404).json({ message: 'Address not found' });
      }

      const selectedAddress = address.addresses[0];
      const state = selectedAddress.state;
      const newDeliveryCharge = calculateDeliveryCharge(state);

      const cart = await Cart.findOne({ userId: userId });
      if (cart) {
        const oldDeliveryCharge = cart.shipingCharg || 'Free Delivery';
        const oldChargeAmount = oldDeliveryCharge !== 'Free Delivery' ? parseInt(oldDeliveryCharge.replace('₹', ''), 10) : 0;
        const newChargeAmount = newDeliveryCharge !== 'Free Delivery' ? parseInt(newDeliveryCharge.replace('₹', ''), 10) : 0;
        console.log("befor chage the addres ",cart);
        cart.offerAppliedTotalAmount = Math.max(0, cart.offerAppliedTotalAmount - oldChargeAmount + newChargeAmount);
        cart.shipingCharg = newDeliveryCharge;
        if(cart.coupon){
          cart.couponDiscount = 0;
          cart.coupon = null;
        }

        await cart.save();
         console.log("after chage the addres",cart);
         
        res.json({
          success: true,
          newDeliveryCharge,
          newTotal: cart.offerAppliedTotalAmount,
        });
      } else {
        res.status(404).json({ message: 'Cart not found' });
      }
    } catch (error) {
      console.error('Error updating cart and shipping charges:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  getInitialDeliveryCharge: async (req, res) => {
    try {
      const userId = req.session.user;
      if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required' });
      }
      const cart = await Cart.findOne({ userId: userId });
      if (!cart) {
        return res.status(404).json({ success: false, message: 'Cart not found' });
      }

      let shippingCharge = cart.shipingCharg
      let totalAmount = cart.offerAppliedTotalAmount;
      let appliedCoupon=null
      if(cart.coupon){
        appliedCoupon = cart.couponDiscount;
        totalAmount = cart.offerAppliedTotalAmount-cart.couponDiscount;
      }
    
      

  
      res.json({
        success: true,
        initialCharge: shippingCharge,
        newTotal: totalAmount,
        coupon: appliedCoupon
          ? {
              code: appliedCoupon.code,
              discount: appliedCoupon.discountPercentage,
            }
          : null,
      });
    } catch (error) {
      console.error('Error fetching initial delivery charge:', error);
      res.status(500).json({ success: false, message: 'Server error' });
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
      const shipingCharg = userCart.shipingCharg;

      const products = userCart.products.map(item => {
        if (item._id && item._id._id) {
          return {
            _id: item._id._id,
            quantity:item.quantity,
            price:item.price,
            productprice:item.productprice,
            totalprice:item.totalprice,
            categoryDiscount:item.categoryDiscount,
            categoryDiscountAmount:item.categoryDiscountAmount,
            offertype:item.offertype, 
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
        coupon: userCart.coupon,
        couponDiscount: couponDiscount, 
        offerAppliedTotalAmount: offerAppliedTotalAmount, 
        shipingCharg:shipingCharg,
        taxRate:userCart.taxRate,
      taxAmount:userCart.taxAmount,
    });
      if (order.paymentMethod === "Razor Pay") {
        order.status = "Failed"
      }
      // Save the order
      await order.save()
      if (order.paymentMethod === "COD") {
        for (const item of userCart.products) {
          if (item._id && item._id._id) {
            await Product.findByIdAndUpdate(item._id._id, {
              $inc: { stock: -item.quantity }
            });
          }
        }
      }
      if (order.paymentMethod === "COD") {
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
      const { paymentId, orderId, amount } = req.body;
      if (!orderId) {
        return res.json({ success: false, message: 'Order ID not found' });
      }
      const userId = req.session.user

      const order = await Order.findOne({ orderId });
      if (!order) {
        return res.json({ success: false, message: 'Invalid Order ID' });
      }

      if (order.paymentMethod === "Razor Pay") {
        // Razorpay verification
        try {
          const payments = await razorpayInstance.payments.fetch(paymentId);
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
      } else if (order.paymentMethod === "Wallet") {
        // Wallet payment verification
        const wallet = await Wallet.findOne({ userId: order.userId });
        if (!wallet) {
          return res.json({ success: false, message: 'Wallet not found' });
        }

        // Ensure the wallet has enough balance
        if (wallet.balance >= amount) {
          // Deduct the amount from the wallet
          wallet.balance -= amount;
          wallet.transactions.push({
            transactionId: paymentId,
            amount: amount,
            type: 'payment',
            status: 'completed',
            description: `Payment for Order ${orderId}`
          });

          order.paymentStatus = 'Paid';
          order.status = 'Ordered';

          await wallet.save(); // Save the updated wallet details
        } else {
          order.paymentStatus = 'Failed';
          order.status = 'Failed';
        }
      } else {
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
      await Cart.findOneAndDelete({ userId });

      await order.save();
      console.log(order);
      let orderStatus = order.status;
      if (order.paymentMethod === "Razor Pay" || order.paymentMethod === "Wallet") {
        await Cart.findOneAndDelete({ userId: order.userId });
      }

      res.json({ success: true, orderId, paymentId, orderStatus });
    } catch (error) {
      console.error("Error verifying payment:", error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  },

};






