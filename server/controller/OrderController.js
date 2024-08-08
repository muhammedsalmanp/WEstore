const Order = require("../model/orderSchema");
const UserAddress = require("../model/userAddressSchema");

module.exports = {
    getOrder:  async (req, res) => {
        try {
            const userId = req.session.user;
            const { orderId } = req.params; // Get orderId from request parameters
    
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
                description: product._id.description,
                quantity: product.quantity,
                primaryImages: product._id.primaryImages // Assuming this field exists
            }));
    
            res.render('shop/orderPage', {
                user: req.session.user,
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
    }
};
