const User = require("../model/userSchema");
const bcrypt = require("bcrypt");
const adminLayout = "./layouts/adminLayouts";


module.exports = {
  getAllUsers: async (req, res) => {
    const locals = {
      title: "Users",
    };

    try {
      const userList = await User.find();
      console.log("Fetched users:", userList); // Check data is fetched

      res.render("./admin/users/users", {
        locals,
        layout: adminLayout,
        users: userList, // Pass the fetched user data
      });;
    } catch (error) {
      console.error("Unexpected error in fetching users:", error);
      res.status(500).send("Internal Server Error");
    }
  },
  toggleBlock: async (req, res) => {
    try {
      // Find user by ID and ensure the user is not an admin
      let user = await User.findOne({ _id: req.params.id, isAdmin: false });

      if (!user) {
        return res.status(404).json({ message: "User not found or is an admin" });
      }

      // Toggle the isBlocked status
      user.isBlocked = !user.isBlocked;
      await user.save();

      // Send the appropriate response
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
