const express = require("express");
const router = express.Router();

const userController =require('../controller/userController')
// user Wishlist 

 // Add to Wishlist
router.post('/wishlist/add', userController.addToWishlist);

// Remove from Wishlist
router.post('/wishlist/remove', userController.removeFromWishlist);

// Get Wishlist
router.get('/wishlist', userController.getWishlist);




















module.exports = router 