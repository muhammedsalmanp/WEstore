const User = require("../model/userSchema");
const Product= require('../model/productSchema');
const Wishlist = require('../model/wishlistSchema');


const mongoose = require('mongoose')



module.exports ={
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

        let user = await User.findOne(req.session.user);
        let wishlist = await Wishlist.findOne({ userId: user._id }).populate('products');

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
        });
    },
}