const express = require('express')
const router = express.Router()

// Admin Controller
const adminController = require('../controller/adminController')
const categoryController = require("../controller/categoryController");
const productController = require("../controller/productController")
const userMangementController = require('../controller/userManagementController')
const {productUpload, upload } = require("../middleware/multer");


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
router.get('/products/addProduct',isAdminLoggedIn, productController.getAddProducts)
router.get("/products/editProduct/:id",isAdminLoggedIn, productController.getEditProducts)

router.post("/products/updateStock", isAdminLoggedIn, productController.updateStocks)
router.post('/products/addProduct',isAdminLoggedIn,
   productUpload.fields([,
    {name:"primaryImage",maxCount:1},
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },,]),
    productController.addProducts)
router.post("/products/editProduct/:id",isAdminLoggedIn,
  productUpload.fields([
  { name: 'primaryImage', maxCount: 1 },
  { name: 'image2', maxCount: 1 },
  { name: 'image3', maxCount: 1 },
  { name: 'image4', maxCount: 1 }]), 
  productController.editProduct)
router.post("/product/action",productController.listOrUnlistProduct)
router.delete("/product/deleteProduct",productController.deleteProduct)








/*--users--*/
router.get('/users',userMangementController.getAllUsers)
router.post('/users/toggle-block/:id',userMangementController.toggleBlock)



module.exports = router