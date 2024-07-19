const User = require("../model/userSchema");
const Product= require('../model/productSchema');
const Wishlist = require('../model/wishlistSchema');
const Cart = require ("../model/cartSchema")
const bcrypt = require("bcrypt")


const mongoose = require('mongoose')



module.exports ={
    /*wishlist area add,remove and list */
    addToWishlist: async (req, res) => {
        const userId = req.session.user;
        const productId = req.body.productId;

        try {
            if(!userId){
                req.flash("error","you need to login or register");
                res.json({error:true})
            }
            let wishlist = await Wishlist.findOne({ userId});

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
        if(!userId){
            req.flash("error","you need to login !!!!")
           return res.redirect("/login");
        }

        try {
            let wishlist = await Wishlist.findOne({ userId: userId });

            if (wishlist && wishlist.products.includes(productId)) {
                wishlist.products = wishlist.products.filter(id => id.toString() !== productId);
                await wishlist.save();
            }

            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.json({ success: false });
        }
    },
    getWishlist: async (req, res) => {
        const locals = {
            title: 'Wishlist'
        };

        let cart= await Cart.findOne({userId:req.session.user})
        let user = await User.findOne(req.session.user);
        let wishlist = await Wishlist.findOne({ userId: user._id }).populate('products');
        if(!user){
            req.flash("error","you need to login or register");
            res.json({error:true})
        }
        let products;
        if (!wishlist) {
            products = [];
        } else {
            products = wishlist.products;
        }

        res.render('user/wishlist', {
            locals,
            products,
            user: req.session.user,
            wishlist:user.wishlist,
            cart,
        });
    },
    /*cart area adding,removing and listingh */
    getCart:async (req, res) => {
        try {
            let wishlist = await Wishlist.findOne({ userId: req.session.user }).populate('products');
            let cart = await Cart.findOne({ userId: req.session.user }).populate('products._id');
    
            res.render("shop/cart", {
                user: req.session.user,
                cart,
                wishlist,
            });
        } catch (error) {
            console.error('Error fetching cart:', error);
            res.status(500).send('Server Error');
        }
    },
    addToCart :async (req, res) => {
        try {
            const { productId, quantity } = req.body;
            if (!productId) {
                return res.status(400).json({ success: false, error: "Product ID is required." });
            }
    
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ success: false, error: "Product not found." });
            }
    
            if (product.stock <= 0) {
                return res.status(400).json({ success: false, error: "Product is out of stock." });
            }
    
            const userId = req.session.user._id;
            let cart = await Cart.findOne({ userId }).populate("products._id");
            if (!cart) {
                cart = new Cart({ userId, products: [] });
            }
            let exist = await Cart.findOne({"products._id":productId})
            if(exist){
                return res.status(400).json({ success: false, error: "Product alredy in your cart" });    
            }
            if (!cart.products) {
                cart.products = [];
            }
            cart.products.push({
                _id: product._id,
                quantity: parseInt(quantity),
                price: product.price
            });   
            cart.totalProduct = cart.products.reduce((total, item) => total + item.quantity, 0);
            cart.totalPrice = cart.products.reduce((total, item) => total + item.quantity * item.price, 0);
    
            await cart.save();
    
            res.json({ success: true });
        } catch (error) {
            console.error('Error adding to cart:', error);
            res.status(500).json({ success: false, error: "An error occurred while adding the product to the cart." });
        }
    },
    updateCart: async (req, res) => {
        const { productId, quantity } = req.body;
        try {
          // Find the cart and update the product quantity
          const cart = await Cart.findOne({ /* your query to find the cart */ });
          if (cart) {
            const product = cart.products.find(item => item._id.toString() === productId);
            if (product) {
              product.quantity = quantity;
              await cart.save();
              res.json({ success: true, newSubtotal: product.price * quantity, totalPrice: cart.totalPrice });
            } else {
              res.status(404).json({ success: false, message: 'Product not found in cart' });
            }
          } else {
            res.status(404).json({ success: false, message: 'Cart not found' });
          }
        } catch (error) {
          res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
      },
    removeFromCart : async (req, res) => {
        try {
            const { productId } = req.body;
            if (!productId) {
                return res.status(400).json({ success: false, error: "Product ID is required." });
            }
    
            const userId = req.session.user._id;
            let cart = await Cart.findOne({ userId });
    
            if (!cart) {
                return res.status(404).json({ success: false, error: "Cart not found." });
            }
    
            cart.products = cart.products.filter(item => item._id.toString() !== productId);
    
            cart.totalProduct = cart.products.reduce((total, item) => total + item.quantity, 0);
            cart.totalPrice = cart.products.reduce((total, item) => total + item.quantity * item.price, 0);
    
            await cart.save();
    
            res.json({ success: true, cart });
        } catch (error) {
            console.error('Error removing from cart:', error);
            res.status(500).json({ success: false, error: "An error occurred while removing the product from the cart." });
        }
    },
    clearCart:async (req,res)=>{
    try {
        const userId = req.session.user._id;
        let cart = await Cart.findOne({ userId });
        if(!cart){
            res.status(400).json({success:false,error:"user is requied"})
        }
        cart.products=[]
        cart.totalPrice=0
        cart.totalProduct=0
        await cart.save();
        console.log("removed111111111111111111111111111111111111111111111111111111111111111111111");
        res.json({ success: true });
    } catch (error) {
        
    }
    },

    /*user account details*/
    getAccountDetails : async (req,res)=>{
        const user = await User.findOne(req.session.user);
        let wishlist = await Wishlist.findOne({ userId: req.session.user}).populate('products');
        let cart= await Cart.findOne({userId:req.session.user})
        if(!user){
            req.flash("error","you need to login !!!!")
            return res.redirect("/login")
        }

        res.render("user/profile",{
            user:user,
            wishlist,
            cart,
        })
    },
    changePassword: async (req, res) => {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        try {
            // Check if the new passwords match
            if (newPassword !== confirmPassword) {
                return res.status(400).json({ success: false, message: 'New passwords do not match' });
            }
            const userId = req.session.user;
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Current password is incorrect' });
            }
            if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
                return res.status(400).json({
                    success: false,
                    message: 'New password must be at least 8 characters long and contain at least one uppercase letter and one digit'
                });
            }
            const hashedNewPassword = await bcrypt.hash(newPassword, 12);
            user.password = hashedNewPassword;
            await user.save();
            return res.status(200).json({ success: true, message: 'Password successfully changed' });

        } catch (error) {
            console.error('Error changing password:', error);
            return res.status(500).json({ success: false, message: 'An error occurred while changing the password' });
        }
    },

}