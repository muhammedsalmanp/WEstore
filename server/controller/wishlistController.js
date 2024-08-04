const Wishlist = require("../model/wishlistSchema");
const User = require("../model/userSchema");
const Cart = require("../model/cartSchema");
const Product = require("../model/productSchema");

module.exports ={

    /*wishlist area add,remove and list */

  getWishlist: async (req, res) => {
    const locals = {
        title: "Wishlist",
    };

    let cart = await Cart.findOne({ userId: req.session.user });
    let user = await User.findOne(req.session.user);
    let wishlist = await Wishlist.findOne({
        userId: req.session.user,
    }).populate("products");
    if (!user) {
        req.flash("error", "you need to login or register");
        res.json({ error: true });
    }
    let products;
    if (!wishlist) {
        products = [];
    } else {
        products = wishlist.products;
    }

    res.render("user/wishlist", {
        locals,
        products,
        user: req.session.user,
        wishlist: wishlist,
        cart,
    });
  },

  addToWishlist: async (req, res) => {
    const userId = req.session.user;
    const productId = req.body.productId;

    try {
      if (!userId) {
        req.flash("error", "you need to login or register");
        res.json({ error: true });
      }
      let wishlist = await Wishlist.findOne({ userId });

      if (!wishlist) {
        wishlist = new Wishlist({ userId: userId, products: [] });
      }

      if (!wishlist.products.includes(productId)) {
        wishlist.products.push(productId);
        await wishlist.save();
      }

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.json({ success: false });
    }
  },

  removeFromWishlist: async (req, res) => {
    const userId = req.session.user;
    const productId = req.body.productId;

    if (!userId) {
      // User is not logged in
      return res.json({
        success: false,
        message: "You need to log in to perform this action.",
      });
    }

    try {
      let wishlist = await Wishlist.findOne({ userId: userId });

      // Check if wishlist exists and has valid products
      if (wishlist && Array.isArray(wishlist.products)) {
        // Ensure productId is a valid string
        if (typeof productId !== "string") {
          return res.json({ success: false, message: "Invalid product ID." });
        }

        // Remove the product from the wishlist
        wishlist.products = wishlist.products.filter(
          (id) => id && id.toString() !== productId
        );

        await wishlist.save();

        // Respond with success
        res.json({
          success: true,
          message: "Product removed from wishlist successfully.",
        });
      } else {
        // Product not found in the wishlist or invalid wishlist
        res.json({
          success: false,
          message: "Product not found in your wishlist.",
        });
      }
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      // Respond with error
      res.json({
        success: false,
        message:
          "An error occurred while removing the product from your wishlist.",
      });
    }
  },
}
