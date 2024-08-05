// isLoggedIn , isLoggedOut
// isAdmin
const User = require("../model/userSchema");
const OTP = require('../model/otpSchema')






module.exports = {

   isAuthenticated : (req, res, next) => {
    if (req.session.userId) {
        // User is authenticated, continue with the request
        next();
    } else {
        // User is not authenticated, set flash message and redirect to login or send JSON response
        req.flash('error', 'User not authenticated');
        return res.status(401).json({ message: 'User not authenticated' });
    }
}, 
  //admin login
  isAdminLoggedIn: (req, res, next) => {
    if (req.session && req.session.admin) {
      next()
    } else {
      req.flash('error', 'Not Authorized')
      res.redirect('/admin/login');
    }
  },
 checkBlockedUser : async (req, res, next) => {
    try {
        if (req.session.user) {
            const user = await User.findById(req.session.user);

            // Confirm the session is not for an admin
            if (user && !user.isAdmin && user.isBlocked) {
                req.flash("error", "User is blocked by the admin");
                req.session.destroy((err) => {
                    if (err) {
                        console.error('Error logging out:', err);
                        req.flash("error", "Server error during logout");
                        return res.redirect("/login");
                    }
                    res.clearCookie("connect.sid");
                    return res.redirect("/login");
                });
            } else {
                next();
            }
        } else {
            next();
        }
    } catch (error) {
        console.error('Error checking blocked user:', error);
        req.flash("error", "Server error");
        res.redirect("/login");
    }
},



}