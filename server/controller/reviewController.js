const Review = require('../model/reviewSchema');
const User = require('../model/userSchema');
const Product = require('../model/productSchema');

module.exports = {
    submitReview: async (req, res) => {
        try {
            const { rating, comment, productId, userId } = req.body;
            const image = req.file ? req.file.path : null;

            // Fetch user to get the username
            const user = await User.findById(userId);
            if (!user) {
                return res.status(400).json({ error: 'User not found' });
            }

            // Ensure the product exists
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(400).json({ error: 'Product not found' });
            }

            const newReview = new Review({
                rating,
                comment,
                image,
                user: userId,
                product: productId,
                username: `${user.firstName} ${user.lastName}`
            });

            await newReview.save();
            res.status(200).json({ message: 'Review submitted successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },

    getAllReviews: async (req, res) => {
        try {
            const reviews = await Review.find().populate('user', 'username');
            res.status(200).json(reviews);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};
