const Order = require("../model/orderSchema");
const UserAddress = require("../model/userAddressSchema");
const User = require("../model/userSchema");
const Product = require("../model/productSchema")
const adminLayout = "./layouts/adminLayouts";
const Coupon = require("../model/couponSchema")
const crypto = require("crypto");
const razorpayInstance = require("../config/razorPay");
const Wishlist = require("../model/wishlistSchema");
const Cart = require("../model/cartSchema");


const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

function generateReturnId(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function calculateReturnAmount(order, productId) {
    const product = order.products.find(p => p._id.toString() === productId);
    if (!product) {
        return 0;
    }
    const returnAmount = product.price * product.quantity;
    return returnAmount;
}

module.exports = {

    //admin side 

    getAllOrders: async (req, res) => {
        const locals = {
            title: "Order ",
        };
        const perPage = 12
        const page = req.query.page || 1
        const orders = await Order.find().populate("products._id").populate('userId', 'firstName lastName email')
        .sort({createdAt:-1})
            .skip(perPage * page - perPage)
            .limit(perPage)
            .exec();
        const count = await Order.find().countDocuments({});
        const nextPage = parseInt(page) + 1;
        const hasNextPage = nextPage <= Math.ceil(count / perPage);
        let wishlist = await Wishlist.findOne({ userId: req.session.user }).populate('products');
        let cart = await Cart.findOne({ userId: req.session.user }).populate('products._id');
        const cartCount = cart && cart.products ? cart.products.length : 0;
        const breadcrumbs = [
            { name: 'Home', url: '/admin' },
            { name: 'order', url: '/admin/order' },
            { name: `Page ${page}`, url: `/admin/order?page=${page}` }
        ];
        res.render("admin/orders/order", {
            locals,
            layout: adminLayout,
            orders,
            current: page,
            perPage: perPage,
            pages: Math.ceil(count / perPage),
            nextPage: hasNextPage ? nextPage : null,
            breadcrumbs,
            wishlist,
            cartCount: cartCount,
        });

    },

    updateOrderStatus: async (req, res) => {
        const { orderId } = req.params;
        const { status } = req.body;

        try {
            const validStatuses = ['Ordered', 'Shipped', 'Out for delivery', 'Delivered', 'Cancelled', 'Returned', 'Received', 'Refund Issued', 'Refund Credited'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ success: false, message: 'Invalid status' });
            }
            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }
            if (order.return) {
                const returnStatuses = ['Returned', 'Received', 'Refund Issued', 'Refund Credited'];
                if (!returnStatuses.includes(status)) {
                    return res.status(400).json({ success: false, message: 'Invalid status for a return' });
                }
            } else {
                const nonReturnStatuses = ['Ordered', 'Shipped', 'Out for delivery', 'Delivered', 'Cancelled'];
                if (!nonReturnStatuses.includes(status)) {
                    return res.status(400).json({ success: false, message: 'Invalid status for a non-return' });
                }
            }

            order.status = status;
            if (order.status === "Delivered") {
                order.paymentStatus = "Paid"
            }
            await order.save();

            res.json({ success: true, message: 'Order status updated successfully' });
        } catch (error) {
            console.error('Error updating order status:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    getOrderDetils: async (req, res) => {
        try {
            const locals = {
                title: "Order Detils",
            };
            let wishlist = await Wishlist.findOne({ userId: req.session.user }).populate('products');
            let cart = await Cart.findOne({ userId: req.session.user }).populate('products._id');
            const cartCount = cart && cart.products ? cart.products.length : 0;
            const breadcrumbs = [
                { name: 'Home', url: '/admin' },
                { name: 'order', url: '/admin/order' },
                { name: `OrderDetils`, url: `/admin/order/<%= order.orderId %>` }
            ];
            const { orderId } = req.params
            const order = await Order.findOne({ orderId: orderId })
                .populate('shippingAddress')
                .populate('products._id')
                .populate('coupon')
                .populate('userId', 'firstName lastName email');

            if (!order) {
                return res.status(404).send('Order not found');
            }
            const shippingAddress = order.shippingAddress ? order.shippingAddress : null;

            const products = order.products.map(product => ({
                productName: product._id.productName,
                price: product._id.price,
                productId: product._id._id,
                description: product._id.description,
                quantity: product.quantity,
                primaryImages: product._id.primaryImages
            }));
            res.render('admin/orders/viewOrdes', {
                locals,
                order: order,
                shippingAddress: shippingAddress,
                products: products,
                status: order.status,
                coupon: order.coupon,
                couponDiscount: order.couponDiscount,
                offerAppliedTotalAmount: order.offerAppliedTotalAmount,
                layout: adminLayout,
                breadcrumbs,
                wishlist,
                cartCount: cartCount,
            });

        } catch (error) {
            console.error("Error fetching order details:", error);
            res.status(500).send('Server error');
        }
    },

    //user side 

    getOrder: async (req, res) => {
        try {
            const userId = req.session.user;
            const { orderId } = req.params;
            const user = await User.findOne(req.session.user)
            const order = await Order.findOne({ userId, orderId })
                .populate('shippingAddress')
                .populate('products._id')
                .populate('coupon')
                .populate('userId', 'firstName lastName email');

            if (!order) {
                return res.status(404).send('Order not found');
            }

            let wishlist = await Wishlist.findOne({ userId: req.session.user }).populate('products');
            let cart = await Cart.findOne({ userId: req.session.user }).populate('products._id');
            const cartCount = cart && cart.products ? cart.products.length : 0;
            const shippingAddress = order.shippingAddress ? order.shippingAddress : null;
            const products = order.products.map(product => ({
                productName: product._id.productName,
                price: product._id.price,
                productId: product._id._id,
                description: product._id.description,
                quantity: product.quantity,
                primaryImages: product._id.primaryImages,
                isCanceld: product.isCanceld,
            }));

            res.render('shop/orderPage', {
                user: req.session.user,
                userDetils: user,
                order: order,
                shippingAddress: shippingAddress,
                products: products,
                status: order.status,
                coupon: order.coupon,
                couponDiscount: order.couponDiscount,
                offerAppliedTotalAmount: order.offerAppliedTotalAmount,
                wishlist,
                cartCount: cartCount,
            });
        } catch (error) {
            console.error("Error fetching order details:", error);
            res.status(500).send('Server error');
        }
    },

    cancelOrder: async (req, res) => {
        const { orderId, productId, reason } = req.body;

        try {
            const order = await Order.findOne({ orderId })
                .populate('products._id')
                .populate('coupon');

            console.log('Fetched Order:', order);
            console.log('Requested Product ID:', productId);

            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }

            const product = order.products.find(p => p._id._id.toString() === productId);

            console.log('Found Product:', product);

            if (!product) {
                return res.status(404).json({ message: 'Product not found in this order' });
            }


            if (order.status === 'Delivered' || order.status === 'Out for delivery') {
                return res.status(400).json({ message: 'You can only cancel products from delivered orders' });
            }

            product.isCanceld = true;

            const updatedProduct = await Product.findById(productId);
            if (updatedProduct) {
                updatedProduct.stock += product.quantity;
                await updatedProduct.save();
            }

            order.totalAmount -= product.price * product.quantity;

            let applicableCouponDiscount = 0;

            if (order.coupon) {
                if (order.totalAmount >= order.coupon.minPurchaseAmount) {
                    applicableCouponDiscount = (order.totalAmount * order.coupon.discountPercentage) / 100;
                } else {
                    order.couponMessage = 'You can no longer use the coupon because the order total is below the minimum purchase amount required.';
                }
            }

            order.offerAppliedTotalAmount = order.totalAmount - applicableCouponDiscount;

            const allProductsCanceled = order.products.every(p => p.isCanceld);
            if (allProductsCanceled) {
                order.status = 'Cancelled';
            }

            await order.save();

            res.json({
                message: 'Product cancelled successfully',
                order
            });
        } catch (error) {
            console.error('Error cancelling product:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    restoreProduct: async (req, res) => {
        const { orderId, productId } = req.body;
    
        try {
            const originalOrder = await Order.findOne({ orderId })
                .populate('products._id')
                .populate('coupon');
    
            if (!originalOrder) {
                return res.status(404).json({ message: 'Order not found' });
            }
    
            const productIndex = originalOrder.products.findIndex(p => p._id._id.toString() === productId);
            const product = originalOrder.products[productIndex];
    
            if (!product || !product.isCanceld) {
                return res.status(404).json({ message: 'Product not found or not canceled' });
            }
    
            // Restore product and update stock
            product.isCanceld = false;
    
            const updatedProduct = await Product.findById(productId);
            if (updatedProduct) {
                updatedProduct.stock -= product.quantity;
                await updatedProduct.save();
            }
    
            // Generate a new order ID
            const newOrderId = generateReturnId(8);
    
            if (originalOrder.products.length === 1) {
                // Single product order, update the existing order
                originalOrder.totalAmount = product.price * product.quantity;
    
                let applicableCouponDiscount = 0;
                if (originalOrder.coupon && originalOrder.totalAmount >= originalOrder.coupon.minPurchaseAmount) {
                    applicableCouponDiscount = (originalOrder.totalAmount * originalOrder.coupon.discountPercentage) / 100;
                }
    
                originalOrder.offerAppliedTotalAmount = originalOrder.totalAmount - applicableCouponDiscount;
                originalOrder.paymentMethod = "Cash on Delivery";
                originalOrder.paymentStatus = "Pending";
                originalOrder.status = "Ordered";
                originalOrder.paymentId = ""; // Clear any existing payment ID
    
                await originalOrder.save();
    
                res.json({
                    message: 'Product restored successfully in the same order',
                    order: originalOrder
                });
            } else {
                // Multiple product order, create a new order for the restored product
                const restoredTotalAmount = product.price * product.quantity;
    
                let applicableCouponDiscount = 0;
                if (originalOrder.coupon && restoredTotalAmount >= originalOrder.coupon.minPurchaseAmount) {
                    applicableCouponDiscount = (restoredTotalAmount * originalOrder.coupon.discountPercentage) / 100;
                }
    
                const offerAppliedTotalAmount = restoredTotalAmount - applicableCouponDiscount;
    
                const newOrder = new Order({
                    userId: originalOrder.userId,
                    orderId: newOrderId,
                    products: [{
                        _id: product._id,
                        quantity: product.quantity,
                        price: product.price
                    }],
                    totalAmount: restoredTotalAmount,
                    offerAppliedTotalAmount,
                    shippingAddress: originalOrder.shippingAddress,
                    paymentMethod: "COD",
                    paymentStatus: "Pending",
                    status: "Ordered",
                    createdAt: new Date(),
                    expectedDeliveryDate: new Date(new Date().setDate(new Date().getDate() + 4)),
                    coupon: originalOrder.coupon ? originalOrder.coupon._id : null,
                    couponDiscount: applicableCouponDiscount,
                    paymentId: "", // No payment ID for cash on delivery
                });
    
                // Remove the product from the original order
                originalOrder.products.splice(productIndex, 1);
    
                // Recalculate the total amount for the original order
               

                // Update order status if necessary
                if (originalOrder.products.length === 0) {
                    originalOrder.status = "Cancelled"; // All products removed
                }
    
                await originalOrder.save();
                await newOrder.save();
    
                res.json({
                    message: 'Product restored successfully and new order created',
                    originalOrder,
                    newOrder
                });
            }
        } catch (error) {
            console.error('Error restoring product:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    
    
    returnProduct: async (req, res) => {
        try {
            const { orderId, productId, reason, boxStatus, damageStatus } = req.body;
            console.log('Received Order ID:', orderId);
            console.log('Received Product ID:', productId);
    
            // Find the original order
            const order = await Order.findOne({ orderId: orderId });
    
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found.' });
            }
    
            // Find the product in the original order
            const productIndex = order.products.findIndex(product => product._id.toString() === productId.toString());
    
            if (productIndex === -1) {
                return res.status(404).json({ success: false, message: 'Product not found in the order.' });
            }
    
            // Extract the product details
            const product = order.products[productIndex];
    
            // Calculate the new order amount and apply coupon if necessary
            let offerAppliedTotalAmount = product.price * product.quantity;
            let couponDiscount = 0;
    
            if (order.coupon) {
                // Find the coupon
                const coupon = await Coupon.findById(order.coupon);
    
                if (coupon) {
                    // Apply coupon discount to the new order
                    couponDiscount = offerAppliedTotalAmount -= couponDiscount;
                }
            }
    
            if (order.products.length === 1) {
                // If there is only one product in the order, just update the original order
                order.status = 'Returned';
                order.return = true;
                order.returnReason = reason;
                order.damageStatus = damageStatus;
    
                // Save the updated original order
                await order.save();
    
                console.log('Updated Order:', order);
    
                return res.status(200).json({
                    success: true,
                    message: 'Product return initiated.',
                    returnId: order.returnID,
                    expectedReturnAmount: offerAppliedTotalAmount
                });
            } else {
                // If there are multiple products, create a new order for the returned product
    
                // Generate a new return ID
                const returnId = generateReturnId(8);
    
                // Create a new order for the returned product
                const newOrder = new Order({
                    userId: order.userId,
                    products: [product],
                    totalAmount: offerAppliedTotalAmount,
                    shippingAddress: order.shippingAddress,
                    paymentMethod: order.paymentMethod,
                    status: 'Returned', // Set status to 'Returned'
                    expectedDeliveryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // Assuming 4 days from now
                    offerAppliedTotalAmount: offerAppliedTotalAmount, // Set the offer applied amount based on the product
                    orderId: returnId, // Use the new return ID
                    returnReason: reason,
                    boxStatus: boxStatus,
                    damageStatus: damageStatus,
                    coupon: order.coupon, // Preserve the original coupon for record
                    couponDiscount: couponDiscount, // Include the coupon discount in the new order
                    return : true,
                });
    
                // Save the new order
                await newOrder.save();
    
                // Remove the returned product from the original order
                order.products.splice(productIndex, 1);
    
                
            
                order.returnReason = reason;
                order.damageStatus = damageStatus;
                await order.save();
    
                console.log('New Order for Returned Product:', newOrder);
    
                return res.status(200).json({
                    success: true,
                    message: 'Product return initiated and new order created.',
                    newOrder
                });
            }
        } catch (error) {
            console.error('Error handling product return:', error);
            res.status(500).json({ success: false, message: 'Internal server error.' });
        }
    },

    reOrder: async (req, res) => {
        const { orderId, paymentMethod } = req.body
        try {
            const order = await Order.findOne({ orderId: orderId });
            if (!order) {
                return res.json({ success: false, message: "order not found!" });
            }
            order.status = 'Ordered';
            order.paymentMethod = 'COD';
            order.paymentStatus = "Pending"
            await order.save()
            if (order.status !== 'Failed') {
                for (const item of order.products) {
                    if (item._id && item._id._id) {
                        await Product.findByIdAndUpdate(item._id._id, {
                            $inc: { stock: -item.quantity }
                        });
                    }
                }
            }
            res.json({ success: true, message: "oeder plied seccsefuly!" })
        } catch (error) {
            console.error('Error updating payment method:', error);
            res.json({ success: false, message: 'Failed to update payment method' });
        }
    },
};