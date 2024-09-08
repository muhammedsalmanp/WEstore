const adminLayout = "./layouts/adminLayouts";
const Category = require("../model/categorySchema");
const Product = require("../model/productSchema");
const Brand = require('../model/brandsSchema');
const { find } = require("../model/orderSchema");



module.exports = {

    getProducts: async (req, res) => {
        const locals = {
          title: "Products",
        };
        try {
          let perPage = 12;
          let page = req.query.page || 1;
          const product = await Product.find()
            .populate("category")
            .populate("brand") 
            .sort({ createdAt: -1 })
            .skip(perPage * page - perPage)
            .limit(perPage)
            .exec();
          const count = await Product.find().countDocuments({});
          const nextPage = parseInt(page) + 1;
          const hasNextPage = nextPage <= Math.ceil(count / perPage);
    
          const breadcrumbs = [
            { name: 'Home', url: '/admin' },
            { name: 'Offer', url: '/admin/offer/product' },
            { name: 'Product Offer', url: '/admin/offer/product' },
            { name: `Page ${page}`, url: `'/admin/offer/product?page=${page}` }
          ];
    
          // Check if product objects contain populated brand fields
          console.log("Product details:", product.map(p => ({
            id: p._id,
            name: p.productName,
            brand: p.brand ? p.brand.name : 'No Brand'
          })));
    
          res.render("admin/offers/offerOnProducts", {
            locals,
            layout: adminLayout,
            product,
            current: page,
            perPage: perPage,
            pages: Math.ceil(count / perPage),
            nextPage: hasNextPage ? nextPage : null,
            breadcrumbs,
          });
        } catch (error) {
          console.error(error);
        }
    },
    
    getCategory: async (req, res) => {

      const locals = {
        title: "Category",
      };
      const perPage = 12
      const page = req.query.page || 1
      const categories = await Category.find()
        .skip(perPage * page - perPage)
        .limit(perPage)
        .exec();
      const count = await Category.find().countDocuments({});
      const nextPage = parseInt(page) + 1;
      const hasNextPage = nextPage <= Math.ceil(count / perPage);
  
      const breadcrumbs = [
        { name: 'Home', url: '/admin' },
        { name: 'Offer', url: '/admin/offer/product' },
        { name: 'Category', url: '/admin/offer/Category' },
        { name: `Page ${page}`, url: `/admin/offer/Category?page=${page}` }
      ];
      console.log(categories);
      res.render("admin/offers/offerOnCategories", {
        locals,
        layout: adminLayout,
        categories,
        current: page,
        perPage: perPage,
        pages: Math.ceil(count / perPage),
        nextPage: hasNextPage ? nextPage : null,
        breadcrumbs,
      });
    },

    addOfferToProducts: async (req, res) => {
      try {
        const { productId, offerDiscount } = req.body;
        const product = await Product.findOne({ _id: productId });
    
        if (!offerDiscount || offerDiscount < 0 || offerDiscount > 100) {
          return res.status(400).json({ success: false, message: 'Invalid offer discount value' });
        }
        if (!product) {
          return res.status(404).json({ success: false, message: 'Product not found' });
        }
    
        product.offerDiscountPersantage = offerDiscount;
        product.oldPrice = product.price;
    
        product.offerDiscountPrice = Math.round(product.oldPrice * (offerDiscount / 100));
        
        product.price = Math.round(product.oldPrice - product.offerDiscountPrice);
    
        product.onOffer = true;
        await product.save();
    
        req.flash("success", "Offer applied successfully!");
        return res.json({ success: true, message: 'Product offer updated successfully' });
    
      } catch (error) {
        console.error(error);
        req.flash("error", "Offer applying failed!");
        return res.status(500).json({ success: false, message: 'Server error' });
      }
    },

    addOfferToCategory: async (req, res) => {
      try {
        const { categoryId, offerDiscount, offerType, description } = req.body;
    
        if (!categoryId) {
          req.flash("error", "Category ID is required");
          return res.redirect("/admin/offer/Category");
        }
    
        if (!offerDiscount || offerDiscount < 0 || offerDiscount > 100) {
          req.flash("error", "Invalid offer percentage");
          return res.redirect("/admin/offer/Category");
        }
    
        let category = await Category.findById(categoryId);
    
        if (!category) {
          req.flash("error", "Category not found");
          return res.redirect("/admin/offer/Category");
        }
    
        category.offerDiscountPersantage = offerDiscount;
        category.onOffer = true;
        category.offerType = offerType;
        category.description = description;
    
        await category.save();
    
        req.flash("success", "Offer saved successfully");
        res.redirect("/admin/offer/Category");
      } catch (error) {
        console.error(error);
        req.flash("error", "Server error");
        return res.redirect("/admin/offer/Category");
      }
    },

    activationOrDeactiovatingCategory :async (req, res) => {
      const { categoryId, status } = req.body;
  
      try {
        
        let category = await Category.findById(categoryId);
  
          if (!category) {
              return res.status(404).json({ success: false, message: 'category not found' });
          }
  
          if (status === "true") {
              if (!category.offerDiscountPersantage) {
                  req.flash("error", "Add a new offer percentage to the category");
                  return res.status(400).json({ success: false, message: 'Add a new offer percentage to the category' });
              } else {
                  category.onOffer = true;
                  await category.save();
                  req.flash("success", "Offer reactivated!");
                  return res.status(200).json({ success: true, message: 'Offer reactivated!' });
              }
          } else {
              category.onOffer = false;
              await category.save();
              req.flash("success", "Offer deactivated!");
              return res.status(200).json({ success: true, message: 'Offer deactivated!' });
          }
      } catch (error) {
          console.error('Error:', error);
          req.flash("error", "Server error");
          return res.status(500).json({ success: false, message: 'Server error' });
      }
    },

    activationOrDeactiovatingProduct :async (req, res) => {
      const { productId, status } = req.body;
  
      try {
          const product = await Product.findById(productId);
  
          if (!product) {
              return res.status(404).json({ success: false, message: 'Product not found' });
          }
  
          if (status === "true") {
              if (!product.offerDiscountPersantage) {
                  req.flash("error", "Add a new offer percentage to the product");
                  return res.status(400).json({ success: false, message: 'Add a new offer percentage to the product' });
              } else {
                  product.onOffer = true;
                  product.price = Math.round(product.oldPrice - product.offerDiscountPrice);
                  await product.save();
                  req.flash("success", "Offer reactivated!");
                  return res.status(200).json({ success: true, message: 'Offer reactivated!' });
              }
          } else {
              product.price = product.oldPrice;
              product.onOffer = false;
              await product.save();
              req.flash("success", "Offer deactivated!");
              return res.status(200).json({ success: true, message: 'Offer deactivated!' });
          }
      } catch (error) {
          console.error('Error:', error);
          req.flash("error", "Server error");
          return res.status(500).json({ success: false, message: 'Server error' });
      }
    },
}