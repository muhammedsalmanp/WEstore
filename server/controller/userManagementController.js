const User = require("../model/userSchema");
const bcrypt = require("bcrypt");
const adminLayout = "./layouts/adminLayouts";


module.exports = {
  getAllUsers: async (req, res) => {
    const locals = {
      title: "Users",
    };

    try {
      let perPage = 7;
      let page=req.query.page||1
      const userList = await User.find().sort({createdAt:-1})
      .skip(perPage*page-perPage)
      .limit(perPage)
      .exec();
      const count = await User.find().countDocuments({});
      const nextPage = parseInt(page)+1;
      const hasNextPage = nextPage <= Math.ceil(count / perPage);

      const breadcrumbs = [
        { name: 'Home', url: '/admin' },
        { name: 'Users', url: '/admin/users' },
        { name: `Page ${page}`, url: `/admin/users?page=${page}` }
    ];
     
      console.log("Fetched users:", userList); 
      res.render("./admin/users/users", {
        locals,
        layout: adminLayout,
        users: userList,
        current: page,
        perPage: perPage,
        pages: Math.ceil(count / perPage),
        nextPage: hasNextPage ? nextPage : null,
        breadcrumbs,
      });
    } catch (error) {
      console.error("Unexpected error in fetching users:", error);
      res.status(500).send("Internal Server Error");
    }
  },
  toggleBlock: async (req, res) => {
    try {
      let user = await User.findOne({ _id: req.params.id, isAdmin: false });
      if (!user) {
        return res.status(404).json({ message: "User not found or is an admin" });
      }
      user.isBlocked = !user.isBlocked;
      await user.save();
      res.status(200).json({
        message: user.isBlocked
          ? "User blocked successfully"
          : "User unblocked successfully",
      });
    } catch (error) {
      console.error("Error toggling block status:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
}
