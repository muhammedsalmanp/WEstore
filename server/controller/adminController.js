const adminLayout = "./layouts/adminLayouts";

const User = require("../model/userSchema");
const Product = require("../model/productSchema");



module.exports = {
  getDashboard: async (req, res) => {
    const locals = {
      title: "WE STORE",
    };
    const userCount = await User.find().countDocuments()
    const productCount =await Product.find().countDocuments()
    
    res.render("admin/dashboard", {
      locals,
      userCount,
      productCount,
      layout: adminLayout,
    });
  },

}