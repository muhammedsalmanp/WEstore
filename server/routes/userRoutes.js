const express = require("express");
const router = express.Router();

const userController =require('../controller/userController')
const { checkBlockedUser, isAuthenticated } = require('../middleware/authMiddleware');
const { isLoggedOut } = require('../middleware/logoutMiddileware');
// user Wishlist 
router.post('/wishlist/add', userController.addToWishlist);
router.post('/wishlist/remove',userController.removeFromWishlist);
router.get('/wishlist', userController.getWishlist);
// user cart
router.get("/cart",userController.getCart)
router.post("/cart/addToCart",userController.addToCart)
router.post("/cart/update",userController.updateCart)
router.post('/cart/remove',userController.removeFromCart)
router.post("/cart/clearCart",userController.clearCart)



//account Details

router.get("/user/dashboard",userController.getAccountDetails)
router.post("/user/updateUser",userController.updateUser)

                                            














module.exports = router 