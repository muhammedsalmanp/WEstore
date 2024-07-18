const adminLayout = "./layouts/adminLayouts";

const User = require("../model/userSchema");
const Product = require("../model/productSchema");



module.exports = {
  getDashboard: async (req, res) => {
    const locals = {
      title: "WE STORE",
    };
    const userCount = await User.countDocuments()
    const productCount =await Product.countDocuments()
    const outOfStock =  await  Product.countDocuments({ stock: { $lte: 0 } });
    
    res.render("admin/dashboard", {
      locals,
      userCount,
      productCount,
      layout: adminLayout,
      outOfStock,
    });
  },

}