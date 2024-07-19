
const Category = require("../model/categorySchema");
const Product = require("../model/productSchema");
const User = require("../model/userSchema");
const Wishlist = require("../model/wishlistSchema");
const Cart =require ("../model/cartSchema");
const path = require("path");

module.exports = {
  userHome: async (req, res) => {
    const locals = {
      title: "Home Page",
    };
    try {
      const perPage = 7;
      const page = parseInt(req.query.page) || 1;
      const products = await Product.find()
          .sort({ createdAt: -1 })
          .populate("category")
          .skip(perPage * (page - 1))
          .limit(perPage)
          .exec();
      const count = await Product.countDocuments({});
      const nextPage = page + 1;
      const hasNextPage = nextPage <= Math.ceil(count / perPage);
      let wishlist = await Wishlist.findOne({ userId: req.session.user}).populate('products');
      let cart= await Cart.findOne({userId:req.session.user}).countDocuments({});
      // console.log(products);
      res.render("index", {
        locals,
        success: req.flash("success"),
        error: req.flash("error"),
        user: req.session.user,
        products,
        wishlist,
        cart,
        current: page,
        perPage: perPage,
        pages: Math.ceil(count / perPage),
        nextPage: hasNextPage ? nextPage : null,
        
      });
    } catch (error) {
      console.log("from userController", error);
    }
  },
  
  getQuickView: async (req, res) => {
    const locals = {
      title: "Product Details",
    };
    let cart= await Cart.findOne({userId:req.session.user})
    const product = await Product.findById(req.params.id).populate("category");
    console.log(product);
    try {
      res.render("shop/quickview", {
        locals,
        product,
        user: req.session.user,
        catr,
      });
    } catch (error) {
      console.log(error);
    }
  },
  getProductDetails: async(req,res)=>{
    const locals = {
      title: "Product Details",
    };
    let wishlist = await Wishlist.findOne({ userId: req.session.user}).populate('products');
    let cart= await Cart.findOne({userId:req.session.user})
    const user = await User.findOne(req.session.user)
    const product = await Product.findById(req.params.id).populate("category");
    try {
      res.render("shop/productDetails",{
        product,
        locals,
        wishlist,
        cart,
        user: user
      })
    } catch (error) {
      console.log(error)
    }
  },
  getAllProduct:async (req,res) =>{
    const user = await User.findOne(req.session.user);
    let wishlist = await Wishlist.findOne({ userId: req.session.user}).populate('products');
    let cart= await Cart.findOne({userId:req.session.user})
    const categories = await Category.find()
    const perPage = 12;
      const page = parseInt(req.query.page) || 1;
      const products = await Product.find()
          .sort({ createdAt: -1 })
          .populate("category")
          .skip(perPage * (page - 1))
          .limit(perPage)
          .exec();
      const count = await Product.countDocuments({});
      const nextPage = page + 1;
      const hasNextPage = nextPage <= Math.ceil(count / perPage);
      const productCount = products.length;

    res.render("shop/allList",{
      user,
      cart,
      wishlist,
      categories,
      products,
      productCount,
      current: page,
      perPage: perPage,
      pages: Math.ceil(count / perPage),
      nextPage: hasNextPage ? nextPage : null,
    })
  },
};
