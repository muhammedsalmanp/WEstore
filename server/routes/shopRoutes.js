const express = require('express');
const router =express.Router();

//controller

const shopController = require('../controller/shopController');
const reviewController = require("../controller/reviewController")

//getHome
router.get('/', shopController.userHome);

router.get('/shop/quickView/:id',shopController.getQuickView)
router.get("/shop/productDetails/:id",shopController.getProductDetails)

router.post("/submitReview",reviewController.submitReview);

module.exports = router                                    