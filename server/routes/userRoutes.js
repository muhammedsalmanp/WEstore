const express = require("express");
const router = express.Router();
const userController =require('../controller/userController')
const { checkBlockedUser, isAuthenticated } = require('../middleware/authMiddleware');
const { isLoggedOut } = require('../middleware/logoutMiddileware');
const checkOutCondroller = require("../controller/checkOutCondroller");
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
router.get("/user/profile",userController.getAccountDetails)
router.post("/user/updateUser",userController.updateUser)
router.post("/user/addAddress",userController.addAddress)
router.post("/user/address/:addressId/edit",userController.editAddress)
router.delete("/user/address/:addressId/delete",userController.deleteAddress)
router.post("/set-default-address/:addressId",userController.setDefault)                                           

//check Out 

router.get('/checkOut',checkOutCondroller.getCheckOut)










module.exports = router 