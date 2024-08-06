const Category = require("../model/categorySchema");
const Product = require("../model/productSchema");
const User = require("../model/userSchema");
const Wishlist = require("../model/wishlistSchema");
const Cart = require("../model/cartSchema");
const bcrypt = require("bcrypt");
const adminLayout = "./layouts/adminLayouts";
const Coupon = require("../model/couponSchema");

module.exports = {
  /*-- admin side --*/

  /*Coupon add,edit,delet*/

  getCoupon: async (req, res) => {
    let locals = {
      titel: "Coupon",
    };
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
        { name: "Home", url: "/admin" },
        { name: "Coupon", url: "/admin/coupon" },
        { name: `Page ${page}`, url: `/admin/products?page=${page}` },
      ];

      res.render("admin/coupon/coupons", {
        locals,
        layout: adminLayout,
        coupons: coupon,
        current: page,
        perPage: perPage,
        pages: Math.ceil(count / perPage),
        nextPage: hasNextPage ? nextPage : null,
        breadcrumbs,
      });
    } catch (error) {
      console.error("this is the erro you get in get coupen:", error);
      req.flash("error", "you have an unexpected error on coppen");
      res.redirect("/admin");
    }
  },

  getAddCoupon: async (req, res) => {
    let locals = {
      titel: "Add coupon",
    };
    try {
      const breadcrumbs = [
        { name: "Home", url: "/admin" },
        { name: "Coupon", url: "/admin/coupon" },
        { name: `Add Coupon`, url: `/admin/coupon/addCoupon` },
      ];

      res.render("admin/coupon/addCoupon", {
        locals,
        layout: adminLayout,
        breadcrumbs,
      });
    } catch (error) {
      console.error("this is the erro you get in get Add coupen:", error);
      req.flash("error", "you have an unexpected error on add coppen");
      res.redirect("/admin/coupon");
    }
  },

  getEditCoupon: async (req, res) => {
    try {
      const couponId = req.params.id;
      const breadcrumbs = [
        { name: "Home", url: "/admin" },
        { name: "Coupons", url: "/admin/coupon" },
        { name: "Edit Coupon" },
      ];

      const coupon = await Coupon.findById(couponId);
      if (!coupon) {
        req.flash("error", "Coupon not found.");
        return res.redirect("/admin/coupon");
      }

      res.render("admin/coupon/editCoupon", {
        title: "Edit Coupon",
        layout: adminLayout,
        coupon,
        breadcrumbs,
      });
    } catch (error) {
      console.error("Error fetching coupon for edit:", error);
      req.flash(
        "error",
        "An unexpected error occurred while fetching the coupon."
      );
      res.redirect("/admin/coupon");
    }
  },

  addCoupon: async (req, res) => {
    try {
      const {
        coupon_code,
        discount_percentage,
        min_purchase,
        expiration_date,
        description,
      } = req.body;

      if (
        !coupon_code ||
        !discount_percentage ||
        !min_purchase ||
        !expiration_date ||
        !description
      ) {
        req.flash("error", "All fields are required.");
        return res.redirect("/admin/coupon/addCoupon");
      }

      const existingCoupon = await Coupon.findOne({
        code: coupon_code.toUpperCase(),
      });
      if (existingCoupon) {
        req.flash("error", "Coupon code already exists.");
        return res.redirect("/admin/coupon/addCoupon");
      }

      const isActive = new Date(expiration_date) > new Date();

      const newCoupon = new Coupon({
        code: coupon_code.toUpperCase(),
        discountPercentage: parseFloat(discount_percentage),
        minPurchaseAmount: parseFloat(min_purchase),
        expirationDate: new Date(expiration_date),
        description,
        isActive,
      });

      await newCoupon.save();

      req.flash("success", "Coupon added successfully.");
      res.redirect("/admin/coupon");
    } catch (error) {
      console.error("Error adding coupon:", error);
      req.flash(
        "error",
        "An unexpected error occurred while adding the coupon."
      );
      res.redirect("/admin/coupon");
    }
  },

  editCoupon: async (req, res) => {
    try {
      const couponId = req.params.id;
      const {
        coupon_code,
        discount_percentage,
        min_purchase,
        expiration_date,
        description,
      } = req.body;

      if (
        !coupon_code ||
        !discount_percentage ||
        !min_purchase ||
        !expiration_date ||
        !description
      ) {
        req.flash("error", "All fields are required.");
        return res.redirect(`/admin/coupon/edit/${couponId}`);
      }

      const coupon = await Coupon.findById(couponId);
      if (!coupon) {
        req.flash("error", "Coupon not found.");
        return res.redirect("/admin/coupon");
      }

      coupon.code = coupon_code.toUpperCase();
      coupon.discountPercentage = parseFloat(discount_percentage);
      coupon.minPurchaseAmount = parseFloat(min_purchase);
      coupon.expirationDate = new Date(expiration_date);
      coupon.description = description;
      coupon.isActive = new Date(expiration_date) > new Date();

      await coupon.save();

      req.flash("success", "Coupon updated successfully.");
      res.redirect("/admin/coupon");
    } catch (error) {
      console.error("Error updating coupon:", error);
      req.flash(
        "error",
        "An unexpected error occurred while updating the coupon."
      );
      res.redirect("/admin/coupon");
    }
  },

  deleteCoupon: async (req, res) => {
    try {
      const couponId = req.params.id;
      const result = await Coupon.findByIdAndDelete(couponId);

      if (result) {
        res.json({ success: true });
      } else {
        res.json({ success: false, message: "Coupon not found" });
      }
    } catch (error) {
      console.error("Error deleting coupon:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  },

  /*-- user side --*/
  /*get coupons and appy coupons */
  getAllCoupons: async (req, res) => {
    try {
      const coupons = await Coupon.find({
        isActive: true,
        expirationDate: { $gte: new Date() },
      });
      res.json(coupons);
    } catch (error) {
      console.error("Error fetching coupons:", error);
      res.status(500).send("Server error");
    }
  },

  applyCoupon: async (req, res) => {
    try {
      const { couponCode } = req.body;
      const userId = req.session.user._id;

      // Fetch the coupon
      const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
      if (!coupon) {
        return res.status(400).json({ message: "Invalid or expired coupon" });
      }

      // Fetch the user's cart
      const cart = await Cart.findOne({ userId });
      if (!cart) {
        return res.status(400).json({ message: "Cart not found" });
      }

      // Check if total price meets the minimum purchase amount
      if (cart.totalPrice < coupon.minPurchaseAmount) {
        return res
          .status(400)
          .json({
            message: `You need minimum purchase amount : ${coupon.minPurchaseAmount}`,
          });
      }

      // Calculate the discount amount based on percentage
      const discountAmount =
        (cart.totalPrice * coupon.discountPercentage) / 100;
      const newTotalPrice = cart.totalPrice - discountAmount;

      // Update the cart with new total price, coupon details, and applied coupons
      cart.coupon = coupon._id;
      cart.couponDiscount = discountAmount;
      cart.offerAppliedTotalAmount = newTotalPrice;

      await cart.save();

      res.json({
        success: "Coupon applied successfully",
        discountPercentage: coupon.discountPercentage,
        discountAmount,
        newTotalPrice,
        couponCode: coupon.code,
      });
    } catch (error) {
      console.error("Error applying coupon:", error);
      res
        .status(500)
        .json({ message: "Failed to apply coupon", details: error.message });
    }
  },

  removeCoupon: async (req, res) => {
    try {
      const { couponCode } = req.body;
      const userId = req.session.user._id;

      // Fetch the user's cart
      const cart = await Cart.findOne({ userId });
      if (!cart) {
        return res.status(400).json({ message: "Cart not found" });
      }

      // Remove coupon from the cart
      cart.coupon = null;
      cart.couponDiscount = 0;
      cart.offerAppliedTotalAmount = cart.totalPrice;

      await cart.save();

      res.json({ success: "Coupon removed successfully" });
    } catch (error) {
      console.error("Error removing coupon:", error);
      res
        .status(500)
        .json({ message: "Failed to remove coupon", details: error.message });
    }
  },
};
