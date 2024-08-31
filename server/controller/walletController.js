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
            
            // Use findOne to get a single wallet document
            const wallet = await Wallet.findOne({ userId: userId }).sort({createdAt:-1});
    
            // Log the wallet object to see its structure
            console.log("From the new Tida:", wallet);
    
            if (!wallet) {
                req.flash("error", "Your wallet is not found!");
                console.log("Your wallet is not found!!");
                return res.redirect("/");
            }
    
            const transactions = wallet.transactions || [];
            console.log("Wallet Transactions:", wallet.transactions);
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
            res.redirect("/");
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
        const userId = req.session.user._id; // Assuming you're using sessions to track users
    
        try {
            // Verify the payment using the paymentId
            const payment = await razorpayInstance.payments.fetch(paymentId);
    
            if (payment.status === 'captured') {
                // Payment is successful, update the wallet balance
                let wallet = await Wallet.findOne({ userId });
    
                const depositAmount = Number(amount);
    
                if (!wallet) {
                    // If wallet doesn't exist, create a new one
                    wallet = new Wallet({
                        userId,
                        balance: depositAmount,
                        transactions: [
                            {
                                transactionId: paymentId,
                                amount: depositAmount,
                                type: 'deposit',
                                status: 'completed',
                                description: 'Funds added to wallet via Razorpay'
                            }
                        ]
                    });
    
                    await wallet.save();
                } else {
                    // If wallet exists, ensure balance and amount are treated as numbers
                    const currentBalance = Number(wallet.balance);
                    wallet.balance = currentBalance + depositAmount;
    
                    // Add the new transaction to the wallet's transactions array
                    wallet.transactions.push({
                        transactionId: paymentId,
                        amount: depositAmount,
                        type: 'deposit',
                        status: 'completed',
                        description: 'Funds added to wallet via Razorpay'
                    });
    
                    await wallet.save();
                }
    
                return res.status(200).json({ success: true, message: 'Payment successful and wallet updated' });
            } else {
                // Payment failed or not captured
                return res.status(400).json({ success: false, message: 'Payment verification failed' });
            }
        } catch (error) {
            console.error('Error verifying payment:', error);
            return res.status(500).json({ success: false, message: 'An error occurred while verifying payment' });
        }
    }
}