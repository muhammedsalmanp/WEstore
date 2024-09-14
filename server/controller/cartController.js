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

const Wishlist = require("../model/wishlistSchema");
const User = require("../model/userSchema");
const Cart = require("../model/cartSchema");
const Product = require("../model/productSchema");
const Coupon = require("../model/couponSchema");
const UserAddress = require("../model/userAddressSchema");
const Wallet = require("../model/walletSchema");

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
            productPrice = product.price * (1 - categoryOffer / 100)
           categoryDiscountAmount=product.price * (categoryOffer / 100)
        }

        // Add the product with the calculated price to the cart
        cart.products.push({
            _id: product._id,
            quantity: parseInt(quantity),
            productprice:product.price,
            totalprice:product.price,
            price: productPrice,
            categoryDiscount:categoryOffer,
            categoryDiscountAmount:categoryDiscountAmount,
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
        cart.offerAppliedTotalAmount =cart.totalPrice;
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
      cart.offerAppliedTotalAmount = cart.totalPrice;
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
      cart.offerAppliedTotalAmount = cart.totalPrice;
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
      cart.offerAppliedTotalAmount =cart.totalPrice;
      await cart.save();
      res.json({ success: true });
    } catch (error) { }
  },

  getCheckOutC: async (req, res) => {
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
       
    
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
  
      if (!cart || cart.products.length === 0) {
        return res.redirect('/cart?error=empty');
      }

      const userAddress = await UserAddress.findOne({ userId: userId });
      const defaultAddress = userAddress ? userAddress.addresses.find(addr => addr.isDefault) : null;
  

      const deliveryCharge = defaultAddress ? calculateDeliveryCharge(defaultAddress.state) : 'Delivery charge not available';
      const shippingChargeAmount = deliveryCharge !== 'Free Delivery' ? parseInt(deliveryCharge.replace('₹', ''), 10) : 0;
    


      let outOfStockRemoved = false;
      let quantityAdjusted = false;
      let stockExceeded = false;
      let exceededProducts = [];
      let newTotalPrice = 0;
      let newTotalProduct = 0;
  
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

        newTotalPrice += product.quantity * product.price;
        newTotalProduct += product.quantity;
  
        return true;
      });
  
      // Update cart totals
      cart.totalPrice = newTotalPrice;
      cart.totalProduct = newTotalProduct;
      cart.offerAppliedTotalAmount = cart.totalPrice - cart.couponDiscount;
      cart.offerAppliedTotalAmount = cart.offerAppliedTotalAmount;
      const taxRate = 18; 
      const taxAmount = cart.totalPrice * (taxRate / 100);
      cart.taxRate = taxRate;
      cart.taxAmount = Math.abs(taxAmount);
      cart.offerAppliedTotalAmount = cart.totalPrice + cart.taxAmount;
      cart.shipingCharg=deliveryCharge;
      cart.offerAppliedTotalAmount =  shippingChargeAmount + cart.offerAppliedTotalAmount;
      await cart.save();
     console.log("shiping and tax are arredto cart :" ,cart);
     
      // Pass the information to the response
      if (outOfStockRemoved && quantityAdjusted) {
        return res.redirect('/cart?message=out_of_stock_quantity_adjusted');
      } else if (outOfStockRemoved) {
        return res.redirect('/cart?message=out_of_stock');
      } else if (quantityAdjusted) {
        return res.redirect(`/cart?message=quantity_adjusted&exceeded=${JSON.stringify(exceededProducts)}`);
      } else {
        res.render("shop/checkOut", {
          user: req.session.user,
          addresses: addresses,
          cart: cart,
          appliedCouponCode,
          wishlist,
          cartCount: cartCount,
          wallet,
          deliveryCharge:cart.shipingCharg
      });
      }
    } catch (error) {
      console.error("Error fetching address or cart details:", error);
      return res.redirect('/cart?error=server');
    }
  }

}