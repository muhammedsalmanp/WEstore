const Category = require("../model/categorySchema");
const Product = require("../model/productSchema");
const User = require("../model/userSchema");
const Wishlist = require("../model/wishlistSchema");
const Cart =require ("../model/cartSchema");;
const bcrypt = require("bcrypt");
const adminLayout = "./layouts/adminLayouts";
const Coupon = require ("../model/couponSchema");


module.exports = {
    getCoupon : async (req,res)=>{
        let locals = {
            titel:"Coupon"
        }
        try {
            
            let perPage = 7;
            let page = req.query.page || 1;
            const coupon = await Coupon.find()
            .sort({ createdAt: -1 })
            .skip(perPage * page - perPage)
            .limit(perPage)
            .exec();
            const count = await Coupon.find().countDocuments({});
            const nextPage = parseInt(page) + 1;
            const hasNextPage = nextPage <= Math.ceil(count / perPage);


            const breadcrumbs = [
                { name: 'Home', url: '/admin' },
                { name: 'Coupon', url: '/admin/coupon' },
                { name: `Page ${page}`, url: `/admin/products?page=${page}` }
            ];

           res.render("admin/coupon/coupons",{
            locals,
            layout: adminLayout,
            coupons:coupon,
            current: page,
            perPage: perPage,
            pages: Math.ceil(count / perPage),
            nextPage: hasNextPage ? nextPage : null,
            breadcrumbs,
           }) 
        } catch (error) {
            console.error("this is the erro you get in get coupen:",error);
            req.flash("error","you have an unexpected error on coppen");
            res.redirect("/admin")
        }
    },
    getAddCoupon: async (req,res)=>{
      let locals = {
        titel:"Add coupon"
      }
      try {
        
        const breadcrumbs = [
            { name: 'Home', url: '/admin' },
            { name: 'Coupon', url: '/admin/coupon' },
            { name: `Add Coupon`, url: `/admin/coupon/addCoupon` }
        ];

        res.render("admin/coupon/addCoupon",{
            locals,
            layout: adminLayout,
            breadcrumbs,
         } 
        )
      } catch (error) {
        console.error("this is the erro you get in get Add coupen:",error);
            req.flash("error","you have an unexpected error on add coppen");
            res.redirect("/admin/coupon")
      }
    },

    addCoupon: async (req, res) => {
        try {
            const { coupon_code, discount_amount, expiration_date } = req.body;
    
            if (!coupon_code || !discount_amount || !expiration_date) {
                req.flash("error", "You need to fill in all fields");
                return res.redirect("/admin/coupon/addCoupon");
            }
    
            const existingCoupon = await Coupon.findOne({ code: coupon_code });
            if (existingCoupon) {
                req.flash("error", "Coupon code already exists");
                return res.redirect("/admin/coupon/addCoupon");
            }
    
            const newCoupon = new Coupon({
                code: coupon_code,
                discountAmount: parseFloat(discount_amount),
                expirationDate: new Date(expiration_date),
                isActive: true
            });
    
            await newCoupon.save();
            req.flash("success", "Coupon added successfully");
            res.redirect("/admin/coupon");

        } catch (error) {
            console.error("Error in addCoupon:", error);
            req.flash("error", "Unexpected error occurred while adding coupon");
            res.redirect("/admin/coupon");
        }
    },
    getEditCoupon : async (req, res) => {
        try {
            const couponId = req.params.id;
             const breadcrumbs= [
                { name: 'Home', url: '/admin' },
                { name: 'Coupons', url: '/admin/coupon' },
                { name: 'Edit Coupon' },
            ];
    
            const coupon = await Coupon.findById(couponId);
            if (!coupon) {
                req.flash('error', 'Coupon not found.');
                return res.redirect('/admin/coupon');
            }
            
            res.render('admin/coupon/editCoupon', { 
                title: 'Edit Coupon',
                layout: adminLayout,
                coupon,
                breadcrumbs
                
            });
        } catch (error) {
            console.error("Error fetching coupon for edit:", error);
            req.flash('error', 'An unexpected error occurred while fetching the coupon.');
            res.redirect('/admin/coupon');
        }
    },
    editCoupon : async (req, res) => {

        try {
            const couponId = req.params.id;
            const { coupon_code, discount_amount, expiration_date } = req.body;

            if (!coupon_code || !discount_amount || !expiration_date) {
                req.flash('error', 'All fields are required.');
                return res.redirect(`/admin/coupon/edit/${couponId}`);
            }
    
            const coupon = await Coupon.findById(couponId);
            if (!coupon) {
                req.flash('error', 'Coupon not found.');
                return res.redirect('/admin/coupon');
            }

            coupon.code = coupon_code;
            coupon.discountAmount = discount_amount;
            coupon.expirationDate = new Date(expiration_date);

            await coupon.save();

            req.flash('success', 'Coupon updated successfully.');
            res.redirect('/admin/coupon');
        } catch (error) {
            console.error("Error updating coupon:", error);
            req.flash('error', 'An unexpected error occurred while updating the coupon.');
            res.redirect('/admin/coupon');
        }
    },
    deleteCoupon : async (req, res) => {
        try {
            const couponId = req.params.id;
            const result = await Coupon.findByIdAndDelete(couponId);
    
            if (result) {
                res.json({ success: true });
            } else {
                res.json({ success: false, message: 'Coupon not found' });
            }
        } catch (error) {
            console.error('Error deleting coupon:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },
    
}           