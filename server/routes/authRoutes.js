const express = require('express');
const router = express.Router();

//authcontroller
const authController = require('../controller/authController');

const { isLoggedOut } = require('../middleware/logoutMiddileware');
const { checkBlockedUser, isAuthenticated } = require('../middleware/authMiddleware');

//user

router.get('/login', isLoggedOut, authController.getUserLogin);
router.get('/register', isLoggedOut, authController.getUserRegister);

router.post('/login', authController.userLogin);
router.post('/register', authController.uerRegister);


/*GET verifyotp */
router
  .route("/verifyOtp")
  .get(authController.getOtpVerify)
  .post(authController.otpVerify);

/*GET forgetpassword */

router
  .route("/forgetPass")
  .get(authController.getFogetPassword)
  .post(authController.forgetPassword);

/*GET ForgetPassotp */

router
  .route("/forgetOtpVerify")
  .get(authController.getForgetPasswordVerify)
  .post(authController.forgetPasswordVerify);

/*GET ResetPass */

router
  .route("/resetPass")
  .get(authController.getResetPassword)
  .post(authController.resetPassword);

router.get('/resendOtp',authController.resendOtp)
router.get("/logout", authController.getUserLogout);
  




//admin

router
.route('/admin/register')
.get(authController.getAdminRegister)
.post(authController.adminRegister)

/* GET admin login */

router
.route('/admin/login')
.get(authController.getAdminLogin)
.post(authController.adminLogin)

router.get('/admin/logout', authController.AdminLogout);








module.exports = router;


