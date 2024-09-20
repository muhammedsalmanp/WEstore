module.exports={
    isLoggedOut:(req,res,next)=>{
        if (req.session && req.session.user) {
            res.redirect("/");
        } else {
            next();
        }
    },
    isAdminLoggedOut:(req,res,next)=>{
        if (req.session && req.session.admin) {
            res.redirect("/admin");
        } else {
            next();
        }
    },
     //admin login
  isuserLoggedIn: (req, res, next) => {
    if (req.session && req.session.admin) {
      next()
    } else {
      req.flash('error', 'Not Authorized')
      res.redirect('/admin/login');
    }
  }
}