const Wishlist = require("../model/wishlistSchema");
const User = require("../model/userSchema");
const Cart = require("../model/cartSchema");
const Product = require("../model/productSchema");
const Order =require("../model/orderSchema");

const Wallet =require("../model/walletSchema");

const razorpayInstance = require("../config/razorPay");
const { verifyPayment } = require("./checkOutCondroller");
const { create } = require("connect-mongo");

module.exports={

    getwallet: async (req, res) => {
        try {
            const userId = req.session.user;
            const cartCount = await Cart.find({ userId: userId }).countDocuments();
            const wishlistCount = await Wishlist.find({ userId: userId }).countDocuments();
            
            // Fetch the latest wallet document for the user
            let wallet = await Wallet.findOne({ userId: userId })
    
            if (!wallet) {
                // Create a new wallet if none exists
                wallet = await Wallet.create({
                    userId: userId,
                    balance: 0,
                    transactions: []
                });
            }
           
            // Safely access wallet properties
            const transactions = wallet.transactions || [];
            console.log("Wallet Transactions:", transactions);
            console.log("Wallet Balance:", wallet.balance);
    
            res.render("user/wallet", {
                user: req.session.user,
                cartCount: cartCount,
                wishlist: wishlistCount,
                transactions: transactions,
                balance: wallet.balance || 0,
            });
    
        } catch (error) {
            console.log("Error from wallet:", error);
            req.flash("error", "Something went wrong while fetching the wallet.");
            res.render("user/wallet", {
                user: req.session.user,
                cartCount: cartCount,
                wishlist: wishlistCount,
                transactions: [],
                balance: 0,
            });
        }
    },
    

    requesrtoPay :async (req, res) => {
        const { amount } = req.body;
        const userId = req.session.user._id; // Assuming you're using sessions to track users
    
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }
    
        try {
            // Generate a shorter receipt ID
            const shortReceipt = `wlt_${userId.toString().slice(-6)}_${Date.now().toString().slice(-5)}`;
    
            const order = await razorpayInstance.orders.create({
                amount: amount * 100, // Razorpay works with paise, so amount is in paise
                currency: "INR",
                receipt: shortReceipt, // Shortened receipt ID
                payment_capture: 1 // Auto capture
            });
    
            return res.status(200).json({
                success: true,
                key: process.env.RAZOR_PAY_KEY_ID,
                amount: order.amount,
                orderId: order.id
            });
        } catch (error) {
            console.error("Error creating Razorpay order:", error);
            return res.status(500).json({ success: false, message: 'Failed to initiate payment' });
        }
    },

    verifyPayment :  async (req, res) => {
        const { paymentId, amount } = req.body;
        const userId = req.session.user
    
        try {
     
            const payment = await razorpayInstance.payments.fetch(paymentId);
    
            if (payment.status === 'captured') {
               
                let wallet = await Wallet.findOne({ userId });
    
                const depositAmount = Number(amount);
    
                if (!wallet) {

                    wallet = new Wallet({
                        userId,
                        balance: depositAmount,
                        transactions: [
                            {
                                transactionId: paymentId,
                                amount: depositAmount,
                                type: 'deposit',
                                status: 'completed',
                                debit:"credit",
                                description: 'Funds added to wallet via Razorpay'
                            }
                        ]
                    });
    
                    await wallet.save();
                } else {

                    const currentBalance = Number(wallet.balance);
                    wallet.balance = currentBalance + depositAmount;
                    wallet.transactions.push({
                        transactionId: paymentId,
                        amount: depositAmount,
                        type: 'deposit',
                        status: 'completed',
                        debit:"credit",
                        description: 'Funds added to wallet via Razorpay'
                    });
    
                    await wallet.save();
                }
    
                return res.status(200).json({ success: true, message: 'Payment successful and wallet updated' });
            } else {
                return res.status(400).json({ success: false, message: 'Payment verification failed' });
            }
        } catch (error) {
            console.error('Error verifying payment:', error);
            return res.status(500).json({ success: false, message: 'An error occurred while verifying payment' });
        }
    },

    getbalanceL: async (req, res) => {
        try {
            const { amount, orderId } = req.body;
            const userId = req.session.user;
    
            console.log('Request body:', req.body);
    
            let wallet = await Wallet.findOne({ userId });
    
            if (!wallet) {
                return res.status(404).json({ success: false, message: 'Wallet not found.' });
            }
    
            console.log('Wallet balance:', wallet.balance, "Requested amount:", amount);
    
            if (wallet.balance < amount) {
                const shortfall = amount - wallet.balance;
                return res.status(400).json({ success: false, message: 'Insufficient wallet balance.', shortfall });
            }
    
            wallet.balance -= amount;
    
            const transactionId = `TXN-${Date.now()}`;

            wallet.transactions.push({
                transactionId,
                amount,
                type: 'payment',
                status: 'completed',
                debit:"debit",
            });
    
            await wallet.save();
    
            const order = await Order.findOne({ orderId: orderId }); 
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found.' });
            }
            order.paymentMethod= 'Wallet'
            order.status = 'Ordered';
            order.paymentStatus = 'Paid'; 
            order.paymentId = transactionId; 
            await order.save();
    
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
            console.log('Order updated:', order);
            
            res.status(200).json({ success: true, transactionId });
        } catch (error) {
            console.error("Error processing wallet payment:", error);
            res.status(500).json({ success: false, message: 'Unexpected error occurred while processing the wallet payment.' });
        }
    },
    
    addMoney :  async (req, res) => {
        const { paymentId, amount } = req.body;
        const userId = req.session.user
    
        try {
     
            const payment = await razorpayInstance.payments.fetch(paymentId);
    
            if (payment.status === 'captured') {
               
                let wallet = await Wallet.findOne({ userId });
    
                const depositAmount = Number(amount);
    
                if (!wallet) {

                    wallet = new Wallet({
                        userId,
                        balance: depositAmount,
                        transactions: [
                            {
                                transactionId: paymentId,
                                amount: depositAmount,
                                type: 'deposit',
                                status: 'completed',
                                debit:"credit",
                                description: 'Funds added to wallet via Razorpay'
                            }
                        ]
                    });
    
                    await wallet.save();
                } else {

                    const currentBalance = Number(wallet.balance);
                    wallet.balance = currentBalance + depositAmount;
                    wallet.transactions.push({
                        transactionId: paymentId,
                        amount: depositAmount,
                        type: 'deposit',
                        status: 'completed',
                        debit:"credit",
                        description: 'Funds added to wallet via Razorpay'
                    });
    
                    await wallet.save();
                }
    
                return res.status(200).json({ success: true, message: 'Payment successful and wallet updated' });
            } else {
                return res.status(400).json({ success: false, message: 'Payment verification failed' });
            }
        } catch (error) {
            console.error('Error verifying payment:', error);
            return res.status(500).json({ success: false, message: 'An error occurred while verifying payment' });
        }
    },
}