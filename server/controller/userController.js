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

        if (!userId) {
            // User is not logged in
            return res.json({ success: false, message: "You need to log in to perform this action." });
        }

        try {
            let wishlist = await Wishlist.findOne({ userId: userId });

            // Check if wishlist exists and has valid products
            if (wishlist && Array.isArray(wishlist.products)) {
                // Ensure productId is a valid string
                if (typeof productId !== 'string') {
                    return res.json({ success: false, message: "Invalid product ID." });
                }

                // Remove the product from the wishlist
                wishlist.products = wishlist.products.filter(id => id && id.toString() !== productId);

                await wishlist.save();

                // Respond with success
                res.json({ success: true, message: "Product removed from wishlist successfully." });
            } else {
                // Product not found in the wishlist or invalid wishlist
                res.json({ success: false, message: "Product not found in your wishlist." });
            }
        } catch (error) {
            console.error('Error removing from wishlist:', error);
            // Respond with error
            res.json({ success: false, message: "An error occurred while removing the product from your wishlist." });
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
            if (!cart) {
               cart = { products: [], totalPrice: 0,totalProduct:0};
              }
          
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
          let cart = await Cart.findOne({ userId });
      
          if (!cart) {
            cart = new Cart({ userId, products: [] });
          } else {
            const productInCart = cart.products.find(item => item._id.toString() === productId);
            if (productInCart) {
              return res.status(400).json({ success: false, error: "Product already in cart." });
            }
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
      
    updateCart :async (req, res) => {
        const { productId, quantity } = req.body;
        try {
            const userId = req.session.user // Get user ID from session
            const cart = await Cart.findOne({ userId });
    
            if (!cart) {
                return res.status(404).json({ success: false, message: 'Cart not found' });
            }
    
            const productItem = cart.products.find(item => item._id.toString() === productId);
            if (!productItem) {
                return res.status(404).json({ success: false, message: 'Product not found in cart' });
            }
    
            productItem.quantity = quantity;
    
            // Recalculate the total price
            cart.totalPrice = cart.products.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
            await cart.save();
    
            res.json({ success: true, newSubtotal: productItem.price * quantity, totalPrice: cart.totalPrice });
        } catch (error) {
            console.error('Error updating cart:', error);
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
    updateUser: async (req, res) => {
        try {
            const { firstName, lastName, currentPassword, newPassword, confirmPassword } = req.body;
            const user = await User.findOne(req.session.user)
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }else if (!firstName || !lastName || !currentPassword || !newPassword || !confirmPassword) {
                return res.status(400).json({ success: false, message: 'All fields are required' });
            }else if (newPassword !== confirmPassword) {
                return res.status(400).json({ success: false, message: 'New passwords do not match' });
            } 
            const isMatch = await bcrypt.compare(newPassword, user.password);   
            if (!isMatch) {
                return res.status(400).json({ success: false, message: 'Current password is incorrect' });
            }
    
            // Update user details
            user.firstName = firstName;
            user.lastName = lastName;
            user.password = newPassword;
    
            // Save the updated user
            await user.save();
    
            return res.status(200).json({ success: true, message: 'Password and details updated successfully' });
        } catch (error) {
            console.error('Error updating user:', error);
            return res.status(500).json({ success: false, message: 'An error occurred while updating the user' });
        }
    },
}    
