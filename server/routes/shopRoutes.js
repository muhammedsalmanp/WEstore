const express = require('express');
const router =express.Router();

//controller

const shopController = require('../controller/shopController');
const reviewController = require("../controller/reviewController")

//getHome
router.get('/', shopController.userHome);

router.get('/shop/quickView/:id',shopController.getQuickView)
router.get("/shop/productDetails/:id",shopController.getProductDetails)

//allProducts
router.get("/allProducts",shopController.getAllProduct)


// Review

router.get("/submitReview",reviewController.getAllReviews)
router.post("/submitReview",reviewController.submitReview);


module.exports = router                                    