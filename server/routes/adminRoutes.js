const express = require('express')
const router = express.Router()

// Admin Controller
const adminController = require('../controller/adminController')
const categoryController = require("../controller/categoryController");
const productController = require("../controller/productController")
const userMangementController = require('../controller/userManagementController')
const {productUpload, upload } = require("../config/multer");


const { isAdminLoggedIn } = require("../middleware/authMiddleware");


router.get('/', isAdminLoggedIn, adminController.getDashboard)
                                                   

//category management
router.get('/category', isAdminLoggedIn, categoryController.getCategory);
router.get('/category/addCategory', isAdminLoggedIn, categoryController.getAddCategory);3
router.get('/category/editCategory/:id', isAdminLoggedIn, categoryController.getEditCategory);

router.post("/category/addCategory",categoryController.addCategory)
router.post('/category/editCategory/:id', isAdminLoggedIn, categoryController.editCategory);
router.post('/category/unlistOrListCategory',categoryController.softdelete);
router.delete('/category/deleteCategory', isAdminLoggedIn, categoryController.deleteCategory)

//product controller

router.get('/products', isAdminLoggedIn, productController.getProducts);
router.get('/products/editProducts', isAdminLoggedIn, productController.getEditProducts);
router.get('/products/deleteProduct/:id', isAdminLoggedIn, productController.deleteProduct);
router.get("/products/stocks",isAdminLoggedIn, productController.getStocks)
router
  .route("/add-product")
  .get(isAdminLoggedIn, productController.getAddProducts)
  .post(
    isAdminLoggedIn,
    productUpload.fields([
      { name: "images", maxCount: 4 },
      { name: "primaryImage", maxCount: 1 }
    ]),
    productController.addProducts
  );
  
  router
  .route("/edit-product/:id")
  .get(isAdminLoggedIn, productController.getEditProducts)
  .post(
    isAdminLoggedIn,
    productUpload.fields([
      { name: 'primaryImage', maxCount: 1 },
      { name: 'image2', maxCount: 1 },
      { name: 'image3', maxCount: 1 },
      { name: 'image4', maxCount: 1 }
    ]),
    productController.editProduct
  );

router.post("/product/action",productController.listOrUnlistProduct)
router.delete("/product/deleteProduct",productController.deleteProduct)





/*--users--*/
router.get('/users',userMangementController.getAllUsers)
router.post('/users/toggle-block/:id',userMangementController.toggleBlock)



module.exports = router