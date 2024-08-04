
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
      // console.log(products);
      res.render("index", {
        user:req.session.user,
        locals,
        success: req.flash("success"),
        error: req.flash("error"),
        products,
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
    const product = await Product.findById(req.params.id).populate("category");
    try {
      res.render("shop/productDetails",{
        product,
        locals,
        user: req.session.user,
      })
    } catch (error) {
      console.log(error)
    }
  },
getAllProduct: async (req, res) => {
  const { category, Processor, ramSize, hardDriveSize, hardDiskDescription, graphicsChipsetBrand, operatingSystem, sort, search } = req.query;

  const categories = await Category.find();
  const perPage = 12;
  const page = parseInt(req.query.page) || 1;

  let filter = {};

  if (category) {
    filter.category = category;
  }



  if (Processor) {
    filter.Processor = { $in: Array.isArray(Processor) ? Processor : [Processor] };
  }

  if (ramSize) {
    filter.ramSize = { $in: Array.isArray(ramSize) ? ramSize : [ramSize] };
  }

  if (hardDriveSize) {
    filter.hardDriveSize = { $in: Array.isArray(hardDriveSize) ? hardDriveSize : [hardDriveSize] };
  }

  if (hardDiskDescription) {
    filter.hardDiskDescription = { $in: Array.isArray(hardDiskDescription) ? hardDiskDescription : [hardDiskDescription] };
  }

  if (graphicsChipsetBrand) {
    filter.graphicsChipsetBrand = { $in: Array.isArray(graphicsChipsetBrand) ? graphicsChipsetBrand : [graphicsChipsetBrand] };
  }

  if (operatingSystem) {
    filter.operatingSystem = { $in: Array.isArray(operatingSystem) ? operatingSystem : [operatingSystem] };
  }

  if (search) {
    const categoryNames = await Category.find({
      name: new RegExp(search, 'i')
    }).select('_id');

    const categoryIds = categoryNames.map(cat => cat._id);

    filter.$or = [
      { productName: new RegExp(search, 'i') },
      { category: { $in: categoryIds } }
    ];
  }


  let sortCriteria = {};
  if (sort) {
    switch (sort) {
      case 'price-asc':
        sortCriteria.price = 1;
        break;
      case 'price-desc':
        sortCriteria.price = -1;
        break;
      case 'name-asc':
        sortCriteria.productName = 1;
        break;
      case 'name-desc':
        sortCriteria.productName = -1;
        break;
      default:
        sortCriteria.createdAt = -1;
    }
  } else {
    sortCriteria.createdAt = -1;
  }

  try {
    const filteredCount = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .sort(sortCriteria)
      .populate("category")
      .skip(perPage * (page - 1))
      .limit(perPage)
      .exec();

    const count = await Product.countDocuments({});
    const nextPage = page + 1;
    const hasNextPage = nextPage <= Math.ceil(filteredCount / perPage);
    const productCount = products.length;

    res.render("shop/allList", {
      user: req.session.user,
      categories,
      products,
      current: page,
      pages: Math.ceil(filteredCount / perPage),
      count,
      productCount,
      nextPage: hasNextPage ? nextPage : null,
      filteredCount,
      category,
      search // Pass the search term to the view
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
},
getSearchSuggestions : async (req, res) => {
  const query = req.query.query;
  if (!query) {
      return res.json([]);
  }

  try {
      const productSuggestions = await Product.find({
          productName: new RegExp(query, 'i')
      }).limit(4).select('productName');

      const categorySuggestions = await Category.find({
          name: new RegExp(query, 'i')
      }).limit(4).select('name');

      const suggestions = [
          ...productSuggestions.map(p => p.productName),
          ...categorySuggestions.map(c => c.name)
      ];

      res.json(suggestions);
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
  }
},



};
