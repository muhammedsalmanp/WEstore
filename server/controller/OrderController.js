const Order = require("../model/orderSchema");
const UserAddress = require("../model/userAddressSchema");
const User = require("../model/userSchema");
const Product=require("../model/productSchema")
const adminLayout = "./layouts/adminLayouts";
const Coupon = require("../model/couponSchema")
const crypto = require("crypto");
const razorpayInstance = require("../config/razorPay");

   
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
// Helper function to generate a unique return ID
function generateReturnId(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// Helper function to calculate expected return amount
function calculateReturnAmount(order, productId) {
    // Find the product in the order and calculate the return amount
    const product = order.products.find(p => p._id.toString() === productId);

    if (!product) {
        return 0; // Product not found
    }

    // Calculate the return amount based on product price and quantity
    const returnAmount = product.price * product.quantity;

    return returnAmount;
}

module.exports = {
    //admin side 
   getAllOrders:async(req,res)=>{
    const locals = {
        title: "Order ",
    };
    const perPage = 12
    const page = req.query.page||1
    const orders = await Order.find().populate("products._id") .populate('userId', 'firstName lastName email')
    .skip(perPage*page-perPage)   
    .limit(perPage)
    .exec();
    const count = await  Order.find().countDocuments({});
    const nextPage = parseInt(page)+1;
    const hasNextPage = nextPage <= Math.ceil(count / perPage);

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
        
      });

   },
    
   updateOrderStatus : async (req, res) => {
        const { orderId } = req.params;
        const { status } = req.body;

        try {
            // Validate status
            const validStatuses = ['Ordered', 'Shipped', 'Out for delivery', 'Delivered', 'Cancelled', 'Returned', 'Received', 'Refund Issued', 'Refund Credited'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ success: false, message: 'Invalid status' });
            }

            // Find and update the order status
            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }

            // Check if the status can be updated based on the return condition
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
            await order.save();

            res.json({ success: true, message: 'Order status updated successfully' });
        } catch (error) {
            console.error('Error updating order status:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    getOrderDetils: async (req,res)=>{
       try {
        const locals = {
            title: "Order Detils",
        };

        const breadcrumbs = [
            { name: 'Home', url: '/admin' },
            { name: 'order', url: '/admin/order' },
            { name: `OrderDetils`, url: `/admin/order/<%= order.orderId %>` }
            ]; 
        const { orderId } = req.params
        const order = await Order.findOne({orderId:orderId })
        .populate('shippingAddress') // Populate the shippingAddress field
        .populate('products._id') // Populate product details
        .populate('coupon') // Populate coupon details if needed
        .populate('userId', 'firstName lastName email');

        if (!order) {
            return res.status(404).send('Order not found');
        }
        const shippingAddress = order.shippingAddress ? order.shippingAddress : null;
    
        // Prepare products data
        const products = order.products.map(product => ({
            productName: product._id.productName,
            price: product._id.price,
            productId: product._id._id,
            description: product._id.description,
            quantity: product.quantity,
            primaryImages: product._id.primaryImages // Assuming this field exists
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
        });

       } catch (error) {
        console.error("Error fetching order details:", error);
            res.status(500).send('Server error');
       }
    },

    //user side 
    getOrder:  async (req, res) => {
        try {
            const userId = req.session.user;
            const { orderId } = req.params; // Get orderId from request parameters
            const user = await User.findOne(req.session.user)
            // Find the order by userId and orderId, and populate the shippingAddress and products references
            const order = await Order.findOne({ userId, orderId })
                .populate('shippingAddress') // Populate the shippingAddress field
                .populate('products._id') // Populate product details
                .populate('coupon'); // Populate coupon details if needed
    
            if (!order) {
                return res.status(404).send('Order not found');
            }
    
            const shippingAddress = order.shippingAddress ? order.shippingAddress : null;
    
            // Prepare products data
            const products = order.products.map(product => ({
                productName: product._id.productName,
                price: product._id.price,
                productId: product._id._id,
                description: product._id.description,
                quantity: product.quantity,
                primaryImages: product._id.primaryImages,
                isCanceld:product.isCanceld,
            }));
    
            res.render('shop/orderPage', {
                user: req.session.user,
                userDetils:user,
                order: order,
                shippingAddress: shippingAddress,
                products: products,
                status: order.status,
                coupon: order.coupon, // Include coupon details if needed
                couponDiscount: order.couponDiscount, // Include coupon discount
                offerAppliedTotalAmount: order.offerAppliedTotalAmount // Include offer applied total amount
            });
        } catch (error) {
            console.error("Error fetching order details:", error);
            res.status(500).send('Server error');
        }
    },

    cancelOrder: async (req, res) => {
        const { orderId, productId, reason } = req.body;
    
        try {
            // Fetch the order, populate product and coupon details
            const order = await Order.findOne({ orderId })
                .populate('products._id')
                .populate('coupon'); // Populate coupon details
    
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
            // Fetch the order and populate product and coupon details
            const order = await Order.findOne({ orderId })
                .populate('products._id')
                .populate('coupon');
    
            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }
    
            // Find the canceled product
            const product = order.products.find(p => p._id._id.toString() === productId);
    
            if (!product || !product.isCanceld) {
                return res.status(404).json({ message: 'Product not found or not canceled' });
            }
    
            // Restore the product status
            product.isCanceld = false;
    
            // Update stock
            const updatedProduct = await Product.findById(productId);
            if (updatedProduct) {
                updatedProduct.stock -= product.quantity;
                await updatedProduct.save();
            }
    
            // Recalculate order total amount
            order.totalAmount += product.price * product.quantity;
    
            // Recalculate coupon discount
            let applicableCouponDiscount = 0;
            if (order.coupon && order.totalAmount >= order.coupon.minPurchaseAmount) {
                applicableCouponDiscount = (order.totalAmount * order.coupon.discountPercentage) / 100;
            }
    
            order.offerAppliedTotalAmount = order.totalAmount - applicableCouponDiscount;
    
            // Update order status if necessary
            const allProductsCanceled = order.products.every(p => p.isCanceld);
            if (!allProductsCanceled) {
                order.status = 'Ordered'; // Change to the appropriate status if needed
            }
    
            await order.save();
    
            res.json({
                message: 'Product restored successfully',
                order
            });
        } catch (error) {
            console.error('Error restoring product:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    
    returnProduct: async (req, res) => {
        try {
            const { orderId, productId, reason, boxStatus, damageStatus } = req.body;
    
            // Log the received IDs
            console.log('Received Order ID:', orderId);
            console.log('Received Product ID:', productId);
    
    
            const returnId = generateReturnId(8);
    
            const order = await Order.findOne({ orderId: orderId});
    
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found.' });
            }
    
            order.status = 'Returned';
            order.return = true;
            order.returnID = returnId;
            order.returnReason = reason;
            order.damageStatus = damageStatus;
    
            const expectedReturnAmount = calculateReturnAmount(order, productId);
    
            await order.save();
            console.log(order);
            
            return res.status(200).json({
                success: true,
                message: 'Product return initiated.',
                returnId,
                expectedReturnAmount
            });
        } catch (error) {
            console.error('Error handling product return:', error);
            res.status(500).json({ success: false, message: 'Internal server error.' });
        }
    },



};
