
const Category = require("../model/categorySchema");
const Product = require("../model/productSchema");
const User = require("../model/userSchema");
const Wishlist = require("../model/wishlistSchema");
const Cart = require("../model/cartSchema");
const path = require("path");
const Brand = require("../model/brandsSchema")

module.exports = {
  userHome: async (req, res) => {
    const locals = {
      title: "Home Page",
    };
    try {
      const perPage = 7;
      const page = parseInt(req.query.page) || 1;
      const brands = await Brand.find();
      const newArrivals = await Product.find({ isActive: true })
        .populate({
          path: "category",
          match: { isActive: true },
        })
        .sort({ createdAt: -1 })
        .limit(8)
        .exec();
      let wishlist = await Wishlist.findOne({ userId: req.session.user }).populate('products');
      let cart = await Cart.findOne({ userId: req.session.user }).populate('products._id');
      const cartCount = cart && cart.products ? cart.products.length : 0;


      const count = await Product.countDocuments({ isActive: true, _id: { $nin: newArrivals.map(p => p._id) } });

      const products = await Product.find({ isActive: true, _id: { $nin: newArrivals.map(p => p._id) } })
        .populate({
          path: "category",
          match: { isActive: true },
        })
        .skip(perPage * (page - 1))
        .limit(perPage)
        .exec();

      const nextPage = page + 1;
      const hasNextPage = nextPage <= Math.ceil(count / perPage);

      res.render("index", {
        user: req.session.user,
        locals,
        success: req.flash("success"),
        error: req.flash("error"),
        newArrivals,
        products,
        current: page,
        perPage: perPage,
        pages: Math.ceil(count / perPage),
        nextPage: hasNextPage ? nextPage : null,
        wishlist,
        cartCount: cartCount,
        brands: brands,
      });
    } catch (error) {
      console.log("from userController", error);
    }
  },

  getQuickView: async (req, res) => {
    const locals = {
      title: "Product Details",
    };
    let cart = await Cart.findOne({ userId: req.session.user })
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

  getProductDetails: async (req, res) => {
    const locals = {
      title: "Product Details",
    };
    const product = await Product.findById(req.params.id).populate("category");
    let wishlist = await Wishlist.findOne({ userId: req.session.user }).populate('products');
    let cart = await Cart.findOne({ userId: req.session.user }).populate('products._id');
    const cartCount = cart && cart.products ? cart.products.length : 0;
    try {
      res.render("shop/productDetails", {
        product,
        locals,
        user: req.session.user,
        wishlist: wishlist,
        cartCount: cartCount
      })
    } catch (error) {
      console.log(error)
    }
  },

  getAllProduct: async (req, res) => {
    const { category, Processor, ramSize, hardDriveSize, hardDiskDescription, graphicsChipsetBrand, operatingSystem, sort, search, outOfStock, brand } = req.query;
    req.session.category = req.query.category;

    // Fetch brands and categories
    try {
      const brands = await Brand.find();
      const categories = await Category.find();
      const perPage = 12;
      const page = parseInt(req.query.page) || 1;
      let wishlist = await Wishlist.findOne({ userId: req.session.user }).populate('products');
      let cart = await Cart.findOne({ userId: req.session.user }).populate('products._id');
      const cartCount = cart && cart.products ? cart.products.length : 0;

      let filter = {};

      // Apply filters based on query parameters
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

      if (outOfStock === 'false') {
        filter.inStock = { $gt: 0 };
      }

      if (brand) {
        // Handle brand filtering based on whether it's a single ID or multiple IDs
        const brandIds = Array.isArray(brand) ? brand : [brand];
        filter.brand = { $in: brandIds };
      }

      if (search) {
        const brandNames = await Brand.find({ name: new RegExp(search, 'i') }).select('_id');
        const brandIds = brandNames.map(brand => brand._id);

        const categoryNames = await Category.find({ name: new RegExp(search, 'i'), isActive: true }).select('_id');
        const categoryIds = categoryNames.map(cat => cat._id);

        // Combine search filters
        filter.$or = [
          { brand: { $in: brandIds } },
          { category: { $in: categoryIds } },
          { productName: new RegExp(search, 'i') }
        ];
      }

      // Sorting criteria
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

      const filteredCount = await Product.countDocuments(filter);
      const products = await Product.find(filter)
        .sort(sortCriteria)
        .populate({
          path: 'category',
          match: { isActive: true }
        })
        .populate({
          path: 'brand' // Populate brand field
        })
        .skip(perPage * (page - 1))
        .limit(perPage)
        .exec();


      const activeProducts = products.filter(product => product.category);

      const count = await Product.countDocuments({});
      const nextPage = page + 1;
      const hasNextPage = nextPage <= Math.ceil(filteredCount / perPage);
      const productCount = activeProducts.length;

      res.render("shop/allList", {
        user: req.session.user,
        categories,
        products: activeProducts,
        current: page,
        pages: Math.ceil(filteredCount / perPage),
        count,
        productCount,
        nextPage: hasNextPage ? nextPage : null,
        filteredCount,
        category,
        search,
        wishlist: wishlist,
        cartCount: cartCount,
        brands // Pass the brands to the view
      });
    } catch (err) {
      console.error('Error in getAllProduct controller:', err);
      res.status(500).send("Server Error");
    }
  },

  getSearchSuggestions: async (req, res) => {
    const query = req.query.query;
    const categoryFilter = req.session.category;


    if (!query) {
      return res.json([]);
    }

    try {
      let productSuggestions = [];
      let categorySuggestions = [];
      let brandSuggestions = [];

      // If a category filter is applied, filter product suggestions by that category
      if (categoryFilter) {
        productSuggestions = await Product.find({
          productName: new RegExp(query, 'i'),
          category: categoryFilter // Only include products in the selected category
        }).limit(4).select('productName');
      } else {
        // If no category filter is applied, get suggestions from all products
        productSuggestions = await Product.find({
          productName: new RegExp(query, 'i')
        }).limit(4).select('productName');

        // Get category suggestions based on the query
        categorySuggestions = await Category.find({
          name: new RegExp(query, 'i'),
          isActive: true // Assuming you want only active categories
        }).limit(4).select('name');

        brandSuggestions = await Brand.find({
          name: new RegExp(query, "i"),
        }).limit(4).select('name');
      }



      // Combine and return suggestions
      const suggestions = [
        ...productSuggestions.map(p => p.productName),
        ...categorySuggestions.map(c => c.name),
        ...brandSuggestions.map(b => b.name)
      ];

      res.json(suggestions);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }

};
