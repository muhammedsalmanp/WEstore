const bcrypt = require('bcrypt');
const adminLayout = './layouts/authLayout'

const User = require("../model/userSchema");
const OTP = require("../model/otpSchema");
const Wallet = require("../model/walletSchema")

const { sendOtpEmail } = require("../helper/userVerificationHelper");

function generateRefferalCode(length) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let referralCode = "";
  for (let i = 0; i < length; i++) {
    referralCode += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }
  return referralCode;
}
const generateTransactionId = () => {
  const prefix = 'TXN';
  const maxLength = 17;
  const randomPartLength = maxLength - prefix.length;
  const randomPart = Math.random().toString(36).substr(2, randomPartLength).toUpperCase(); 
  return `${prefix}${randomPart}`;
};
module.exports={
  getUserLogin: (req, res) => {
    const local = {
      title: "Login",
    };
    res.render("auth/user/login");
  },

  userLogin: async (req, res) => {
    const { email, password } = req.body;
  
    // Basic validation
    if (!email || !password) {
      req.flash("error", "Please provide both email and password.");
      return res.render("auth/user/login", { email, errors: { email: "Email is required", password: "Password is required" } });
    }
  
    try {
      // Check if the user is an admin
      const admin = await User.findOne({ email, isAdmin: true });
  
      if (admin) {
        const isPassValid = await bcrypt.compare(password, admin.password);
  
        if (!isPassValid) {
          req.flash("error", "Password is incorrect");
          return res.render("auth/user/login", { email, errors: { password: "Password is incorrect" } });
        }
  
        req.session.admin = admin;
        req.flash("success", "Admin successfully logged in");
        return res.redirect("/admin");
      }
  
      // Check if the user is a regular user
      const user = await User.findOne({ email, isAdmin: false });
  
      if (!user) {
        req.flash("error", "Invalid email or password. Please register if you don't have an account.");
        return res.render("auth/user/login", { email, errors: { email: "Invalid email or password" } });
      }
  
      if (user.isBlocked) {
        req.flash("error", "Your account is blocked. Please contact admin.");
        return res.render("auth/user/login", { email, errors: { email: "Account is blocked" } });
      }
  
      if (user.googleId || user.facebookId) {
        // User authenticated via Google or Facebook
        req.session.user = user;
        req.flash("info", "Create a new password to complete your registration.");
        return res.redirect("/resetPass");
      }
  
      // Check if password is valid for non-social login users
      const isValid = await bcrypt.compare(password, user.password);
  
      if (!isValid) {
        req.flash("error", "Password is incorrect");
        return res.render("auth/user/login", { email, errors: { password: "Password is incorrect" } });
      }
  
      req.session.user = user;
      req.flash("success", "User successfully logged in");
      return res.redirect("/");
  
    } catch (error) {
      console.error(error);
      req.flash("error", "Internal server error. Please try again later.");
      return res.render("auth/user/login", { email, errors: { general: "Internal server error" } });
    }
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

  uerRegister: async (req, res) => {
    try {
    const { firstName, lastName, email, password, confirmPassword ,referral} = req.body;

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
     console.log();
     
    
    if (referral) {
      console.log("Stuck Here");
      
      const refferer = await User.findOne({referralCode:referral});
      
      if (refferer) {
          console.log({ refferer: refferer, referralCode: referral });
          
        
          let wallet = await Wallet.findOne({ userId: refferer._id });
  
          if (!wallet) {
              wallet = await Wallet.create({
                  userId: refferer._id,
                  balance: 0.0,  
                  transactions: []  
              });
          }
          const referralBonus = 50;

          wallet.balance += referralBonus;
 
          
          
          const transactionId = generateTransactionId();
          console.log(transactionId);
  
          wallet.transactions.push({
              transactionId: transactionId,
              amount: referralBonus,
              type: 'bonus',
              status: 'completed', 
              debit: 'credit', 
              date: new Date(),
              description: "Referral bonus"
          });
  
          // Save the updated wallet
          await wallet.save();
  
          console.log(`₹${referralBonus} added to ${refferer.firstName}'s wallet.`);
      } 
  }
  
      const savedUser = await user.save();

      let userWallet = await Wallet.findOne({ userId: savedUser._id });

      if (!userWallet) {
        userWallet = await Wallet.create({
          userId: user._id,
          balance: 0.0,
          transactions: [],
        });
      }
  
      const newUserBonus = 100; 
      userWallet.balance += newUserBonus;
  
      const newUserTransactionId = generateTransactionId();
  
      userWallet.transactions.push({
        transactionId: newUserTransactionId,
        amount: newUserBonus,
        type: 'bonus',
        status: 'completed',
        debit: 'credit',
        date: new Date(),
        description: "New user bonus",
      });
  
      await userWallet.save();

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


  /*--OTP verification--*/

  getOtpVerify: async (req, res) => {
    if (!req.session.verifyToken) {
      return res.redirect("/");
    }
    res.render("auth/user/otpVerify");
  },

  otpVerify: async (req, res) => {
    console.log(req.body);
    try {
      if (!req.session.verifyToken) {
        req.flash("error", "Verification token not found");
        return res.redirect("/");
      }
  
      const userId = req.session.verifyToken;
      const otpData = await OTP.findOne({ userId: userId });
  
     
      if (!otpData) {
        req.flash("error", "OTP data not found");
        return res.redirect("/verifyOtp");
      }
  
      
      const otp = `${req.body.otp1}${req.body.otp2}${req.body.otp3}${req.body.otp4}${req.body.otp5}${req.body.otp6}`;
  
      
      const validOtp = await bcrypt.compare(otp, otpData.otp);
  
      
      if (!validOtp) {
        req.flash("error", "Invalid OTP");
        return res.redirect("/verifyOtp");
      }
  
      
      let user = await User.findOne({ _id: otpData.userId });
      user.isVerified = true;
      await user.save();
  
      
      req.flash("success", "User verification successful");
      delete req.session.verifyToken; 
      return res.redirect("/login"); 
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

  /*--verifying user by otp--*/

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
      const otp = `${req.body.otp1}${req.body.otp2}${req.body.otp3}${req.body.otp4}${req.body.otp5}${req.body.otp6}`;
      const validOtp = await bcrypt.compare(otp, otpData.otp);
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
  

  /*--admin--*/

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

