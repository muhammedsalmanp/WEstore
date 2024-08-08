const express = require("express");
const router = express.Router();
const userController =require('../controller/userController')
const cartController = require("../controller/cartController")
const wishlistController = require("../controller/wishlistController")
const { checkBlockedUser, isAuthenticated } = require('../middleware/authMiddleware');
const { isLoggedOut } = require('../middleware/logoutMiddileware');
const checkOutCondroller = require("../controller/checkOutCondroller");
const couponController = require("../controller/CouponCondroller");
const orderController = require("../controller/orderController")


// user Wishlist 
router.post('/wishlist/add', wishlistController.addToWishlist);
router.post('/wishlist/remove',wishlistController.removeFromWishlist);
router.get('/wishlist', wishlistController.getWishlist);
// user cart
router.get("/cart",cartController.getCart)
router.post("/cart/addToCart",cartController.addToCart)
router.post("/cart/update",cartController.updateCart)
router.post('/cart/remove',cartController.removeFromCart)
router.post("/cart/clearCart",cartController.clearCart)

//account Details
router.get("/user/profile",userController.getAccountDetails)
router.post("/user/updateUser",userController.updateUser)
router.post("/user/addAddress",userController.addAddress)
router.post("/user/address/:addressId/edit",userController.editAddress)
router.delete("/user/address/:addressId/delete",userController.deleteAddress)
router.post("/set-default-address/:addressId",userController.setDefault)                                           

// coupon 

router.get('/coupons/available', couponController.getAllCoupons);
router.post('/coupons/apply', couponController.applyCoupon);
router.post('/coupons/remove', couponController.removeCoupon);



//check Out 

router.get('/checkOut',checkOutCondroller.getCheckOut)

router.post("/checkOut/addAddress",userController.checkOutaddAddress)
router.post("/checkOut/address/:addressId/edit",userController.checkOuteditAddress)
router.delete("/checkOut/address/:addressId/delete",userController.checkOutdeleteAddress)
router.post("/checkOut/set-default-address/:addressId",userController.checkOutsetDefault)

router.get('/cart/check', cartController.getCheckOutC);

// order 
router.post('/checkOut/placeOrder',checkOutCondroller.placeOrder)

router.get("/order/details/:orderId", orderController.getOrder);










module.exports = router 