const express = require("express");
const router = express.Router();

// Admin Controller
const adminController = require("../controller/adminController");
const categoryController = require("../controller/categoryController");
const productController = require("../controller/productController");
const userMangementController = require("../controller/userManagementController");
const { productUpload,brandLogoUpload } = require("../config/multer");
const couponController = require("../controller/CouponCondroller");
const orderCondroller = require("../controller/orderController");
const brandController= require("../controller/brandsController");
const { isAdminLoggedIn } = require("../middleware/authMiddleware");
const brandsController = require("../controller/brandsController");
const offerController= require('../controller/offerController');

router.get("/", isAdminLoggedIn, adminController.getDashboard);
router.get('/dashboard/chart-data',isAdminLoggedIn, adminController.getChartData);

//category management
router.get("/category", isAdminLoggedIn, categoryController.getCategory);
router.get("/category/addCategory",isAdminLoggedIn,categoryController.getAddCategory);
router.get("/category/editCategory/:id",isAdminLoggedIn,categoryController.getEditCategory);
router.post("/category/addCategory", categoryController.addCategory);
router.post("/category/editCategory/:id",isAdminLoggedIn,categoryController.editCategory);
router.post("/category/unlistOrListCategory", categoryController.softdelete);
router.delete("/category/deleteCategory",isAdminLoggedIn,categoryController.deleteCategory);

//brands mangement 

router.get("/brands",isAdminLoggedIn,brandsController.getBrands);
router.get("/brands/addBrands",isAdminLoggedIn,brandsController.getAddBrand);
router.post("/brand/addBrand",isAdminLoggedIn,brandLogoUpload,brandsController.addBrand);


//product controller

router.get("/products", isAdminLoggedIn, productController.getProducts);
router.get("/products/editProducts",isAdminLoggedIn,productController.getEditProducts);
router.get("/products/deleteProduct/:id",isAdminLoggedIn,productController.deleteProduct);
router.get("/products/stocks", isAdminLoggedIn, productController.getStocks);
router.route("/add-product")
  .get(isAdminLoggedIn, productController.getAddProducts)
  .post(isAdminLoggedIn,productUpload,productController.addProducts);
router
  .route("/edit-product/:id")
  .get(isAdminLoggedIn, productController.getEditProducts)
  .post(isAdminLoggedIn, productUpload, productController.editProduct);
router.post('/dltiamge', isAdminLoggedIn, productController.deleteProductImage);
router.post("/product/action",isAdminLoggedIn,productController.listOrUnlistProduct);
router.delete("/product/deleteProduct",isAdminLoggedIn,productController.deleteProduct);
router.post("/product/updateStock",isAdminLoggedIn,productController.updateStocks);

/*--users--*/

router.get("/users", userMangementController.getAllUsers);
router.post("/users/toggle-block/:id",userMangementController.toggleBlock);

/* promocodes */

router.get("/coupon", isAdminLoggedIn, couponController.getCoupon);
router.get("/coupon/addCoupon", isAdminLoggedIn, couponController.getAddCoupon);
router.post("/coupon/addCoupon", isAdminLoggedIn, couponController.addCoupon);
router.get("/coupon/edit/:id", isAdminLoggedIn, couponController.getEditCoupon);
router.post("/coupon/edit/:id", isAdminLoggedIn, couponController.editCoupon);
router.delete("/coupon/delete/:id",isAdminLoggedIn,couponController.deleteCoupon);

/*orders  */

router.get('/order', isAdminLoggedIn, orderCondroller.getAllOrders)
router.post('/order/:orderId/update-status', orderCondroller.updateOrderStatus);
router.get('/order/:orderId', orderCondroller.getOrderDetils);

/*return */
router.get("/return",isAdminLoggedIn,orderCondroller.getAllreturn)

/*offers  */

router.get("/offer/product",isAdminLoggedIn,offerController.getProducts);
router.get("/offer/Category",isAdminLoggedIn,offerController.getCategory);

router.post("/offer/product",isAdminLoggedIn,offerController.addOfferToProducts);
router.post("/offer/product/status",isAdminLoggedIn,offerController.activationOrDeactiovatingProduct);
router.post("/offer/Category",isAdminLoggedIn,offerController.addOfferToCategory);
router.post("/offer/Category/status",isAdminLoggedIn,offerController.activationOrDeactiovatingCategory);

module.exports = router;
