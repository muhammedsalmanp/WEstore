const Wishlist = require("../model/wishlistSchema");
const User = require("../model/userSchema");
const Cart = require("../model/cartSchema");
const Product = require("../model/productSchema");
const Coupon = require("../model/couponSchema");


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
      const cartCount = cart && cart.products ? cart.products.length : 0;
      res.render("shop/cart", {
        user: req.session.user,
        cart,
        wishlist,
        coupon,
        wishlist: wishlist,
        cartCount: cartCount
      });
    } catch (error) {
      console.error("Error fetching cart:", error);
      res.status(500).send("Server Error");
    }
  },

  addToCart: async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.session.user;

        if (!productId) {
            return res.status(400).json({ success: false, error: "Product ID is required." });
        }

        // Find the product and populate its category
        const product = await Product.findById(productId).populate('category');
        if (!product) {
            return res.status(404).json({ success: false, error: "Product not found." });
        }

        if (product.stock <= 0) {
            return res.status(400).json({ success: false, error: "Product is out of stock." });
        }

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({ userId, products: [] });
        } else {
            const productInCart = cart.products.find(
                (item) => item._id.toString() === productId
            );
            if (productInCart) {
                return res.status(400).json({ success: false, error: "Product already in cart." });
            }
        }

        // Get the category of the product and check if it has an offer
        const category = product.category;
        let productPrice = product.price;
        let categoryDiscountAmount =0 ;
        if (category && category.onOffer) {
            var categoryOffer = category.offerDiscountPersantage || 0;
            productPrice = Math.round(product.price * (1 - categoryOffer / 100))
           categoryDiscountAmount=Math.round(product.price * (categoryOffer / 100))
        }

        // Add the product with the calculated price to the cart
        cart.products.push({
            _id: product._id,
            quantity: parseInt(quantity),
            productprice:product.price,
            totalprice:product.price,
            price: productPrice,
            categoryDiscount:categoryOffer,
            categoryDiscountAmount:Math.round(categoryDiscountAmount),
            offertype:category.offerType,

        });

        cart.totalProduct = cart.products.reduce(
            (total, item) => total + item.quantity,
            0
        );
        cart.totalPrice = cart.products.reduce(
            (total, item) => total + item.quantity * item.price,
            0
        );

        cart.couponDiscount = 0;
        cart.coupon = null;
        cart.shipingCharg = "Free Delivery";
        const taxRate = 18; 
        const taxAmount = (cart.totalPrice * (taxRate / 100)).toFixed(2);
        cart.taxRate = taxRate;
        cart.taxAmount = Math.round(taxAmount);
        cart.offerAppliedTotalAmount = Math.round(cart.totalPrice + cart.taxAmount);
        
        await cart.save();
        console.log(cart);
        res.json({ success: true });
    } catch (error) {
        console.error("Error adding to cart:", error);
        res.status(500).json({ success: false, error: "An error occurred while adding the product to the cart." });
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
      productItem.categoryDiscountAmount= Math.round(productItem.productprice-(productItem.quantity*productItem.price));
      cart.totalPrice = cart.products.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      cart.couponDiscount = 0;
      cart.coupon = null;
      cart.shipingCharg= "Free Delivery"
       const taxRate = 18; 
       const taxAmount = (cart.totalPrice * (taxRate / 100)).toFixed(2);
       cart.taxRate = taxRate;
       cart.taxAmount = Math.round(taxAmount);
       cart.offerAppliedTotalAmount = Math.round(cart.totalPrice + cart.taxAmount);
      await cart.save();
      console.log(cart);
      
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

      cart.couponDiscount = 0;
      cart.coupon = null;
      cart.shipingCharg= "Free Delivery"

       const taxRate = 18; 
       const taxAmount = (cart.totalPrice * (taxRate / 100)).toFixed(2);
       cart.taxRate = taxRate;
       cart.taxAmount = Math.round(taxAmount);
       cart.offerAppliedTotalAmount = Math.round(cart.totalPrice + cart.taxAmount);
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
      cart.couponDiscount = 0;
      cart.coupon = null;
      cart.shipingCharg= "Free Delivery"
       const taxRate = 18;
       const taxAmount = (cart.totalPrice * (taxRate / 100)).toFixed(2);
       cart.taxRate = taxRate;
       cart.taxAmount = Math.round(taxAmount);

       cart.offerAppliedTotalAmount = Math.round(cart.totalPrice + cart.taxAmount);
      await cart.save();
      res.json({ success: true });
    } catch (error) { }
  },

  getCheckOutC: async (req, res) => {
    try {
      const userId = req.session.user;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const cart = await Cart.findOne({ userId: userId }).populate('products._id');

      if (!cart || cart.products.length === 0) {
        return res.redirect('/cart?error=empty');
      }

      let outOfStockRemoved = false;
      let quantityAdjusted = false;
      let stockExceeded = false;
      let exceededProducts = [];
      let newTotalPrice = 0;
      let newTotalProduct = 0;

      // Filter out out-of-stock products and adjust quantities
      cart.products = cart.products.filter(product => {
        const item = product._id;
        if (item.stock === 0) {
          outOfStockRemoved = true;
          return false;
        } else if (product.quantity > item.stock) {
          stockExceeded = true;
          exceededProducts.push({
            name: item.name,
            requestedQuantity: product.quantity,
            availableQuantity: item.stock
          });
          product.quantity = item.stock;
          quantityAdjusted = true;
        }

        // Update totals for remaining products
        newTotalPrice += product.quantity * product.price;
        newTotalProduct += product.quantity;

        return true;
      });

      // Update cart totals
      cart.totalPrice = newTotalPrice;
      cart.totalProduct = newTotalProduct;
      cart.offerAppliedTotalAmount = cart.totalPrice - cart.couponDiscount;
      const taxRate = 18; 
       const taxAmount = (cart.totalPrice * (taxRate / 100)).toFixed(2);
       cart.taxRate = taxRate;
       cart.taxAmount = Math.round(taxAmount);
       cart.offerAppliedTotalAmount = Math.round(cart.offerAppliedTotalAmount + cart.taxAmount);

      await cart.save();

      if (outOfStockRemoved && quantityAdjusted) {
        return res.redirect('/cart?message=out_of_stock_quantity_adjusted');
      } else if (outOfStockRemoved) {
        return res.redirect('/cart?message=out_of_stock');
      } else if (quantityAdjusted) {
        return res.redirect(`/cart?message=quantity_adjusted&exceeded=${JSON.stringify(exceededProducts)}`);
      } else {
        return res.redirect('/checkOut');
      }
    } catch (error) {
      console.error("Error fetching address or cart details:", error);
      return res.redirect('/cart?error=server');
    }
  }

}