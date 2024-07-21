const bcrypt = require('bcrypt');
const adminLayout = './layouts/authLayout'



const User = require("../model/userSchema");
const OTP = require("../model/otpSchema");

const { sendOtpEmail } = require("../helper/userVerificationHelper");

module.exports={
  getUserLogin: (req, res) => {
    const local = {
      title: "Login",
    };
    res.render("auth/user/login");
  },

  /*-----getRegister------ */

  getUserRegister: async (req, res) => {
    const local = {
      title: "Register",
    };
    res.render("auth/user/register", {
      local,
      success: req.flash("success"),
      error: req.flash("error"),
    });
  },

  /*-----Register------ */

  uerRegister: async (req, res) => {
    const { firstName, lastName, email, password, confirmPassword } = req.body;

    const existUser = await User.findOne({ email });

    if (existUser) {
      req.flash("success", "Email already in use");
      return res.redirect("/login");
    }

    const hashpwd = await bcrypt.hash(password, 12);
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashpwd,
    });

    try {
      const savedUser = await user.save();
      if (!savedUser) {
        req.flash("error", "user not created!!!!");
        return res.redirect("/register");
      } else {
        req.session.verifyToken = savedUser._id;
        const issendOtpEmail = sendOtpEmail(savedUser, res);
        if (issendOtpEmail) {
          req.flash(
            "success",
            "user registered successfully, please verify your email"
          );
          return res.redirect("/verifyOtp");
        } else {
          req.flash(
            "error",
            "User registration unsuccessfull, please try to logged in"
          );
          return res.redirect("/login");
        }
      }
    } catch (error) {
      console.log(error), req.flash("error", "user registered unsuccessfully");
      return res.redirect("/register");
    }
  },

  /*---login----*/

  userLogin: async (req, res) => {
    const { email, password } = req.body;

    /*--checking is admin or not--*/

    const user = await User.findOne({ email, isAdmin: false });

    if (!user) {
      req.flash(
        "error",
        "User does not exist or invalid credentials, please register!!!"
      );
      return res.redirect("/login");
    }

    /*--checking password--*/

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      req.flash("error", "invalid credential");
      console.log("passwoerd not matech");
      return res.redirect("/login");
    }
    req.session.user = user;
    console.log(req.session);
    console.log(user);
    req.flash("success", "user successfully logged in");
    return res.redirect("/");
  },

  /*--OTP verification--*/

  getOtpVerify: async (req, res) => {
    if (!req.session.verifyToken) {
      return res.redirect("/");
    }
    res.render("auth/user/otpVerify");
  },

  /*--otpVerifying--*/
  otpVerify: async (req, res) => {
    console.log(req.body);
    try {
      // Check if verifyToken exists in session

      if (!req.session.verifyToken) {
        req.flash("error", "Verification token not found");
        return res.redirect("/");
      }

      const userId = req.session.verifyToken;
      const otpData = await OTP.findOne({ userId: userId });

      // Check if OTP data exists
      if (!otpData) {
        req.flash("error", "OTP data not found");
        return res.redirect("/verifyOtp");
      }

      // Compare OTP
      const validOtp = await bcrypt.compare(req.body.otp, otpData.otp);

      // Check if OTP is valid
      if (!validOtp) {
        req.flash("error", "Invalid OTP");
        return res.redirect("/verifyOtp");
      }

      // Update user verification status
      let user = await User.findOne({ _id: otpData.userId });
      user.isVerified = true;
      await user.save();

      // Success response
      req.flash("success", "User verification successful");
      delete req.session.verifyToken; // Clear the verification token from session
      return res.redirect("/login"); // Redirect to login page after successful OTP verification
    } catch (error) {
      console.error(error);
      req.flash("error", "Internal server error");
      return res.redirect("/verifyOtp");
    }
  },
  /*--reset otp--*/
  resendOtp: async (req, res) => {
    try {
      let userId;
      if (req.session.verifyToken) {
        userId = req.session.verifyToken;
      }
      if (req.session.forgetToken) {
        userId = req.session.forgetToken;
      }
      const user = await User.findOne({ _id: userId, isAdmin: false });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "user not found",
        });
      }
      const isOtpSend = sendOtpEmail(user, res);
      if (isOtpSend) {
        return res.status(200).json({
          success: true,
          message: "otp send to mail",
        });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
  /*--forgetPassword--*/
  getFogetPassword: async (req, res) => {
    res.render("auth/user/forgetPass");
  },
  forgetPassword: async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email, isAdmin: false });
      if (!user) {
        req.flash("error", "User email does not exist");
        return res.redirect("/forgetPass");
      } else {
        const isOtpSent = sendOtpEmail(user, res);
        console.log(isOtpSent);
        req.session.forgetToken = user._id;
        return res.redirect("/forgetOtpVerify");
      }
    } catch (error) {
      console.error(err);
      req.flash("error", "An error occurred");
      return res.redirect("/forgetPass");
    }
  },
  //verifying user by otp
  getForgetPasswordVerify: async (req, res) => {
    if (!req.session.forgetToken) {
      return res.redirect("/");
    }
    res.render("auth/user/forgetOtp");
  },

  forgetPasswordVerify: async (req, res) => {
    try {
      if (!req.session.forgetToken) {
        res.flash("error", "sesion time out");
        return res.redirect("/forgetOtpVerify");
      }
      const userId = req.session.forgetToken;
      const otpData = await OTP.findOne({ userId: userId });
      if (!otpData) {
        req.flash("error", "OTP not found");
        return res.redirect("/forgetOtpVerify");
      }
      const validOtp = await bcrypt.compare(req.body.otp, otpData.otp);
      if (!validOtp) {
        req.flash("error", "invalid OTP");
        return res.redirect("/forgetOtpVerify");
      }
      req.flash("success", "OTP cerification Success, cahnge Password");
      delete req.session.verifyToken;
      return res.redirect("/resetPass");
    } catch (error) {
      req.flash("error", "Internal server error");
      return res.redirect("/forgetOtpVerify");
    }
  },
  /*-reset new password-*/
  getResetPassword: async (req, res) => {
    res.render("auth/user/resetPass");
  },
  resetPassword: async (req, res) => {
    console.log(req.body);
    try {
      const { password, confirmPassword } = req.body;
      if (password !== confirmPassword) {
        req.flash("error", "password doesnot match");
        return res.redirect("/resetPass");
      }
      const userId = req.session.forgetToken;
      const hashpwd = await bcrypt.hash(password, 12);
      const user = await User.updateOne(
        { _id: userId },
        { $set: { password: hashpwd } }
      );
      if (user) {
        console.log(user);
        req.flash("success", "Password successfully reset");
        return res.redirect("/login");
      } else {
        req.flash("error", "password not reseted please try again");
        return res.redirect("/resetPass");
      }
    } catch (err) {
      console.error(err);
      req.flash("error", "An error occurred");
      return res.redirect("/resetPass");
    }
  },
  /*--user Logout--*/

  getUserLogout: (req, res) => {
    try {
      // Destroy the session and handle potential errors
      req.session.destroy((err) => {
        if (err) {
          req.flash('error', 'There was an issue logging you out. Please try again.');
          return res.redirect('/');
        }
        res.redirect('/login');
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'An unexpected error occurred. Please try again.');
      res.redirect('/');
    }
  },
  

  //admin   
  getAdminLogin: (req, res) => {
    const locals = {
      title: "Admin Login",
    };

    res.render("auth/admin/login", {
      locals,
      layout: adminLayout,
    });
  },
  getAdminRegister: (req, res) => {
    const locals = {
      title: "Admin Register",
    };

    res.render("auth/admin/register", {
      locals,
      layout: adminLayout,
    });
  },


  adminRegister: async (req, res) => {
    const { firstName, lastName, email, password, confirmPassword } = req.body;
  
    console.log(req.body); // Debugging line
  
    try {
      const existAdmin = await User.findOne({ email });
      if (existAdmin) {
        req.flash("error", "Email already in use");
        return res.redirect("/admin/register");
      }
      if (password !== confirmPassword) {
        req.flash("error", "Password not matching");
        return res.redirect("/admin/register");
      }
  
      // Ensure password and salt rounds are passed correctly
      const hashpwd = await bcrypt.hash(password, 12);
      const admin = new User({
        firstName,
        lastName,
        email,
        password: hashpwd,
        isAdmin: true,  // Assuming isAdmin field needs to be set
      });
  
      const savedAdmin = await admin.save();
      if (!savedAdmin) {
        req.flash("error", "Admin registration unsuccessful");
        return res.redirect("/admin/register");
      } else {
        req.flash("success", "Admin registered successfully");
        return res.redirect("/admin/login");
      }
    } catch (error) {
      console.error(error);
      req.flash("error", "Internal server error");
      return res.redirect("/admin/register");
    }
  },
  

 
  adminLogin: async (req, res) => {
    const { email, password } = req.body;
    console.log(req.body);
    const adminExist = await User.findOne({ email ,isAdmin:true});
    if (!adminExist) {
      req.flash("error", "Invalid credential");
      return res.redirect("/admin/login");
    }
    const isPassValid = await bcrypt.compare(password, adminExist.password);
    if (!isPassValid) {
      req.flash("error", "password not matching");
      return res.redirect("/admin/login");
    }

    // req.session.isAdmin = user.isAdmin;
    req.session.admin = adminExist;
    req.flash("success", "admin successfully logged in");
    return res.redirect("/admin");
  },
  AdminLogout:(req,res)=>{    
      
      req.flash("success","You have been Logged out.")
      req.session.destroy();
      res.redirect("/admin/login");
    
  },

  
  
}

