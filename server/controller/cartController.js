const Wishlist = require("../model/wishlistSchema");
const User = require("../model/userSchema");
const Cart = require("../model/cartSchema");
const Product = require("../model/productSchema");
const Coupon = require ("../model/couponSchema");


module.exports = {
 
    /*cart area adding,removing and listingh */

  getCart: async (req, res) => {
    try {
      let coupon = await Coupon.find()
      let wishlist = await Wishlist.findOne({
        userId: req.session.user,
      }).populate("products");
      let cart = await Cart.findOne({ userId: req.session.user }).populate(
        "products._id"
      );
      if (!cart) {
        cart = { products: [], totalPrice: 0, totalProduct: 0 };
      }
  
      res.render("shop/cart", {
        user: req.session.user,
        cart,
        wishlist,
        coupon,
      });
    } catch (error) {
      console.error("Error fetching cart:", error);
      res.status(500).send("Server Error");
    }
  },
  
  // addToCart :async (req, res) => {
  
  //     try {
  //         const { productId, quantity } = req.body;
  //         if (!productId) {
  //             return res.status(400).json({ success: false, error: "Product ID is required." });
  //         }
  
  //         const product = await Product.findById(productId);
  //         if (!product) {
  //             return res.status(404).json({ success: false, error: "Product not found." });
  //         }
  
  //         if (product.stock <= 0) {
  //             return res.status(400).json({ success: false, error: "Product is out of stock." });
  //         }
  
  //         const userId = req.session.user._id;
  //         let cart = await Cart.findOne({ userId }).populate("products._id");
  //         if (!cart) {
  //             cart = new Cart({ userId, products: [] });
  //         }
  //         let exist = await Cart.findOne({"products._id":productId})
  //         if(exist){
  //             return res.status(400).json({ success: false, error: "Product already in cart."});
  //         }
  //         if (!cart.products) {
  //             cart.products = [];
  //         }
  //         cart.products.push({
  //             _id: product._id,
  //             quantity: parseInt(quantity),
  //             price: product.price
  //         });
  //         cart.totalProduct = cart.products.reduce((total, item) => total + item.quantity, 0);
  //         cart.totalPrice = cart.products.reduce((total, item) => total + item.quantity * item.price, 0);
  
  //         await cart.save();
  
  //         res.json({ success: true });
  //     } catch (error) {
  //         console.error('Error adding to cart:', error);
  //         res.status(500).json({ success: false, error: "An error occurred while adding the product to the cart." });
  //     }
  // },
  
  addToCart: async (req, res) => {
    try {
      const { productId, quantity } = req.body;
  
      if (!productId) {
        return res
          .status(400)
          .json({ success: false, error: "Product ID is required." });
      }
  
      const product = await Product.findById(productId);
      if (!product) {
        return res
          .status(404)
          .json({ success: false, error: "Product not found." });
      }
  
      if (product.stock <= 0) {
        return res
          .status(400)
          .json({ success: false, error: "Product is out of stock." });
      }
  
      const userId = req.session.user;
      let cart = await Cart.findOne({ userId });
  
      if (!cart) {
        cart = new Cart({ userId, products: [] });
      } else {
        const productInCart = cart.products.find(
          (item) => item._id.toString() === productId
        );
        if (productInCart) {
          return res
            .status(400)
            .json({ success: false, error: "Product already in cart." });
        }
      }
  
      cart.products.push({
        _id: product._id,
        quantity: parseInt(quantity),
        price: product.price,
      });
  
      cart.totalProduct = cart.products.reduce(
        (total, item) => total + item.quantity,
        0
      );
      cart.totalPrice = cart.products.reduce(
        (total, item) => total + item.quantity * item.price,
        0
      );
  
      await cart.save();
  
      res.json({ success: true });
    } catch (error) {
      console.error("Error adding to cart:", error);
      res
        .status(500)
        .json({
          success: false,
          error: "An error occurred while adding the product to the cart.",
        });
    }
  },
  
  updateCart: async (req, res) => {
    const { productId, quantity } = req.body;
    try {
      const userId = req.session.user; // Get user ID from session
      const cart = await Cart.findOne({ userId });
  
      if (!cart) {
        return res
          .status(404)
          .json({ success: false, message: "Cart not found" });
      }
  
      const productItem = cart.products.find(
        (item) => item._id.toString() === productId
      );
      if (!productItem) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found in cart" });
      }
  
      productItem.quantity = quantity;
  
      // Recalculate the total price
      cart.totalPrice = cart.products.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
  
      await cart.save();
  
      res.json({
        success: true,
        newSubtotal: productItem.price * quantity,
        totalPrice: cart.totalPrice,
      });
    } catch (error) {
      console.error("Error updating cart:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  },
  
  removeFromCart: async (req, res) => {
    try {
      const { productId } = req.body;
      if (!productId) {
        return res
          .status(400)
          .json({ success: false, error: "Product ID is required." });
      }
  
      const userId = req.session.user._id;
      let cart = await Cart.findOne({ userId });
  
      if (!cart) {
        return res
          .status(404)
          .json({ success: false, error: "Cart not found." });
      }
  
      cart.products = cart.products.filter(
        (item) => item._id.toString() !== productId
      );
  
      cart.totalProduct = cart.products.reduce(
        (total, item) => total + item.quantity,
        0
      );
      cart.totalPrice = cart.products.reduce(
        (total, item) => total + item.quantity * item.price,
        0
      );
  
      await cart.save();
  
      res.json({ success: true, cart });
    } catch (error) {
      console.error("Error removing from cart:", error);
      res
        .status(500)
        .json({
          success: false,
          error: "An error occurred while removing the product from the cart.",
        });
    }
  },
  
  clearCart: async (req, res) => {
    try {
      const userId = req.session.user._id;
      let cart = await Cart.findOne({ userId });
      if (!cart) {
        res.status(400).json({ success: false, error: "user is requied" });
      }
      cart.products = [];
      cart.totalPrice = 0;
      cart.totalProduct = 0;
      await cart.save();
      res.json({ success: true });
    } catch (error) {}
  },
  
}







