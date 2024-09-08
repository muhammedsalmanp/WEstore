const sharp = require("sharp");
const adminLayout = "./layouts/adminLayouts";
const Category = require("../model/categorySchema");
const Product = require("../model/productSchema");
const Brand = require('../model/brandsSchema');
const path = require("path");
const fs = require("fs");


module.exports = {

  /*Product Edit, add ,delete,list or unlist*/

  getProducts: async (req, res) => {
    const locals = {
      title: "Products",
    };
    try {
      let perPage = 12;
      let page = req.query.page || 1;
      const product = await Product.find()
        .populate("category")
        .populate("brand") // This ensures we get the full Brand document
        .sort({ createdAt: -1 })
        .skip(perPage * page - perPage)
        .limit(perPage)
        .exec();
      const count = await Product.find().countDocuments({});
      const nextPage = parseInt(page) + 1;
      const hasNextPage = nextPage <= Math.ceil(count / perPage);

      const breadcrumbs = [
        { name: 'Home', url: '/admin' },
        { name: 'Products', url: '/admin/products' },
        { name: `Page ${page}`, url: `/admin/products?page=${page}` }
      ];

      // Check if product objects contain populated brand fields
      console.log("Product details:", product.map(p => ({
        id: p._id,
        name: p.productName,
        brand: p.brand ? p.brand.name : 'No Brand'
      })));

      res.render("admin/products/products", {
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

  getAddProducts: async (req, res) => {
    const locals = {
      title: "Products",
    };

    const categories = await Category.find({ isActive: true });
    const brands = await Brand.find();
    const breadcrumbs = [
      { name: 'Home', url: '/admin' },
      { name: 'Products', url: '/admin/products' },
      { name: "Add Product", url: "/add-product" }
    ];
    console.log(categories);

    res.render("admin/products/addProducts", {
      locals,
      layout: adminLayout,
      categories,
      brands,
      breadcrumbs,
    });
  },

  addProducts: async (req, res) => {
    try {
      const existingProduct = await Product.findOne({
        productName: req.body.productName.toLowerCase(),
      });

      if (existingProduct) {
        req.flash("error", "Product already exists.");
        return res.redirect("/admin/add-product");
      }

      if (!req.files || !req.files.length) {
        req.flash("error", "Images are required.");
        return res.redirect("/admin/add-product");
      }

      // Initialize arrays for primary and secondary images
      let primaryImage = {};
      let secondaryImages = [];

      req.files.forEach((file) => {
        // Assuming the primary image field is named 'primaryImage'
        if (file.fieldname === 'primaryImage') {
          primaryImage = {
            name: file.filename,
            path: file.path,
          };
        } else {
          secondaryImages.push({
            name: file.filename,
            path: file.path,
          });
        }
      });

      // Process images (e.g., resize using sharp)
      await Promise.all(secondaryImages.map(async (image) => {
        await sharp(image.path)
          .resize(500, 500)
          .toFile(
            path.join(__dirname, "../../public/uploads/products-images/crp/") + image.name
          );
      }));

      if (primaryImage.path) {
        await sharp(primaryImage.path)
          .resize(500, 500)
          .toFile(
            path.join(__dirname, "../../public/uploads/products-images/crp/") + primaryImage.name
          );
      }

      // Create new product
      const product = new Product({
        productName: req.body.productName.toLowerCase(),
        category: req.body.categoryName,
        brand: req.body.brandName,
        description: req.body.productDespt,
        stock: req.body.productStock,
        price: req.body.price,
        oldPrice: req.body.price,
        Colour: req.body.colour,
        displaySize: req.body.displaySize,
        resolution: req.body.resolution,
        Processor: req.body.processor,
        ramSize: req.body.ramSize,
        hardDriveSize: req.body.hardDriveSize,
        hardDiskDescription: req.body.hardDiskDescription,
        graphicsChipsetBrand: req.body.graphicsChipsetBrand,
        operatingSystem: req.body.operatingSystem,
        audioDetails: req.body.audioDetails,
        numberofUSB: req.body.numberofUSB,
        countryofOrigin: req.body.countryofOrigin,
        itemWeight: req.body.itemWeight,
        primaryImages: primaryImage,
        secondaryImages: secondaryImages,
      });

      await product.save();
      req.flash("success", "Product added successfully");
      res.redirect("/admin/products");
    } catch (error) {
      console.error(error);
      req.flash("error", "Failed to add product.");
      res.redirect("/admin/add-product");
    }
  },

  getEditProducts: async (req, res) => {
    const locals = {
      title: "Products",
    };

    const product = await Product.findById(req.params.id).populate("category").populate("brand");
    const categories = await Category.find({ isActive: true });
    const brands = await Brand.find();
    const breadcrumbs = [
      { name: 'Home', url: '/admin' },
      { name: 'Products', url: '/admin/products' },
      { name: "Edit Product", url: "/products/editProducts" }
    ];
    res.render("admin/products/editProducts", {
      locals,
      layout: adminLayout,
      product,
      categories,
      brands,
      breadcrumbs,
    });
  },
  
  deleteProductImage: async (req, res) => {
    try {
      const { productId, imageIndex } = req.body;

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Ensure imageIndex is valid
      if (imageIndex >= 0 && imageIndex < product.secondaryImages.length) {
        // Get the image to be deleted
        const imageToDelete = product.secondaryImages[imageIndex];

        // Remove the image from secondaryImages array
        product.secondaryImages.splice(imageIndex, 1);

        // Delete the file from the server
        fs.unlink(path.join(__dirname, '../../public/uploads/products-images/', imageToDelete.name), (err) => {
          if (err) console.error('Failed to delete image file:', err);
        });

        // Save the updated product
        await product.save();
        res.json({ message: "Image deleted successfully" });
      } else {
        res.status(400).json({ message: "Invalid image index" });
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  editProduct: async (req, res) => {
    try {
      const productId = req.params.id;
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Initialize images with existing ones
      let primaryImages = product.primaryImages;
      let secondaryImages = [...product.secondaryImages];

      for (let file of req.files) {
        const isPrimary = file.fieldname === 'primaryImage';
        const resizePath = path.join(__dirname, "../../public/uploads/products-images/crp/", file.filename);

        await sharp(file.path)
          .resize(500, 500)
          .toFile(resizePath);

        const imageObj = {
          name: file.filename,
          path: file.path,
        };

        if (isPrimary) {
          // Replace the primary image only if a new one is uploaded
          primaryImages = [imageObj];
        } else {
          // Handle secondary images: Replace only if a new image is uploaded for the same index
          const existingImageIndex = parseInt(file.fieldname.replace('image', ''), 10) - 2; // Image fieldname starts from image2

          if (!isNaN(existingImageIndex) && existingImageIndex >= 0 && existingImageIndex < secondaryImages.length) {
            // Replace the existing image with the new one at the same index
            secondaryImages[existingImageIndex] = imageObj;
          } else {
            // If the image doesn't correspond to an existing index, add it as a new one
            secondaryImages.push(imageObj);
          }
        }
      }

      const updateProduct = {
        productName: req.body.productName.toLowerCase(),
        category: req.body.categoryName,
        brand: req.body.brandName,
        description: req.body.productDespt,
        stock: req.body.productStock,
        price: req.body.price,
        oldPrice: req.body.price,
        Colour: req.body.colour,
        displaySize: req.body.displaySize,
        resolution: req.body.resolution,
        Processor: req.body.processor,
        ramSize: req.body.ramSize,
        hardDriveSize: req.body.hardDriveSize,
        hardDiskDescription: req.body.hardDiskDescription,
        graphicsChipsetBrand: req.body.graphicsChipsetBrand,
        operatingSystem: req.body.operatingSystem,
        audioDetails: req.body.audioDetails,
        numberofUSB: req.body.numberofUSB,
        countryofOrigin: req.body.countryofOrigin,
        itemWeight: req.body.itemWeight,
        primaryImages: primaryImages,
        secondaryImages: secondaryImages,
        onOffer:false,
      };

      await Product.findByIdAndUpdate(productId, updateProduct, { new: true });
      req.flash("success", "Product edited successfully");
      res.redirect("/admin/products");
    } catch (error) {
      console.error(error);
      req.flash("error", "Product edited unsuccessfully");
      res.redirect(`/admin/edit-product/${req.params.id}`);
    }
  },


  listOrUnlistProduct: async (req, res) => {
    const productId = req.body.productId;
    const shouldList = req.body.shouldList;

    console.log(
      `Received request to ${shouldList ? "list" : "unlist"
      } product with ID: ${productId}`
    );

    try {
      const product = await Product.findById(productId);
      if (!product) {
        console.log("Product not found");
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }

      product.isActive = shouldList;
      await product.save();

      console.log("Product status updated successfully");
      return res
        .status(200)
        .json({ success: true, message: "Product status updated" });
    } catch (error) {
      console.error("Error updating product status:", error);
      return res
        .status(500)
        .json({ success: false, message: "Server error", error });
    }
  },

  deleteProduct: async (req, res) => {
    try {
      const productId = req.body.productId;
      console.log(`Received request to delete product with ID: ${productId}`);

      const product = await Product.findById(productId);
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }

      await Product.findByIdAndDelete(productId);
      console.log("Product successfully deleted");

      return res
        .status(200)
        .json({ success: true, message: "Product successfully deleted" });
    } catch (error) {
      console.error("Error deleting product:", error);
      return res
        .status(500)
        .json({ success: false, message: "Server error", error });
    }
  },

  /*stock mangengment*/

  getStocks: async (req, res) => {
    try {
      const perPage = 15;
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

      const breadcrumbs = [
        { name: 'Home', url: '/admin' },
        { name: 'Products', url: '/admin/products' },
        { name: 'Stock', url: '/admin/products/stocks' },
        { name: `Page ${page}`, url: `/admin/products/stocks?page=${page}` }
      ];

      res.render("admin/products/stock", {
        products,
        layout: adminLayout,
        current: page,
        perPage: perPage,
        pages: Math.ceil(count / perPage),
        nextPage: hasNextPage ? nextPage : null,
        breadcrumbs,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  updateStocks: async (req, res) => {
    const { productId, newStock } = req.body;

    try {
      if (newStock < 0) {
        return res.json({
          success: false,
          error: "Stock value cannot be negative.",
        });
      }

      await Product.findByIdAndUpdate(productId, { stock: newStock });
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.redirect("/products")
      res.json({ success: false });
    }
  },

};