const User = require("../model/userSchema");
const Product = require("../model/productSchema");
const Wishlist = require("../model/wishlistSchema");
const Cart = require("../model/cartSchema");
const UserAddress = require("../model/userAddressSchema");
const bcrypt = require("bcrypt");
const Coupon = require ("../model/couponSchema")


const mongoose = require("mongoose");

module.exports = {


  /*user account details*/

  getAccountDetails: async (req, res) => {
    try {
      const user = await User.findById(req.session.user);
      const wishlist = await Wishlist.findOne({
        userId: req.session.user,
      }).populate("products");
      const cart = await Cart.findOne({ userId: req.session.user });
      const userAddress = await UserAddress.findOne({
        userId: req.session.user,
      });

      if (!user) {
        req.flash("error", "You need to log in!");
        return res.redirect("/login");
      }

      res.render("user/profile", {
        user,
        wishlist,
        cart,
        addresses: userAddress ? userAddress.addresses : [], // Ensure this is an array
      });
    } catch (error) {
      console.error("Error fetching account details:", error);
      req.flash("error", "An error occurred while fetching details.");
      res.redirect("/user/profile");
    }
  },

  updateUser: async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        currentPassword,
        newPassword,
        confirmPassword,
      } = req.body;
      const user = await User.findOne(req.session.user);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      if (
        !firstName ||
        !lastName ||
        !currentPassword ||
        !newPassword ||
        !confirmPassword
      ) {
        return res
          .status(400)
          .json({ success: false, message: "All fields are required" });
      }
      if (newPassword !== confirmPassword) {
        return res
          .status(400)
          .json({ success: false, message: "New passwords do not match" });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);

      if (!isMatch) {
        return res
          .status(400)
          .json({ success: false, message: "Current password is incorrect" });
      }

      // Update user details
      user.firstName = firstName;
      user.lastName = lastName;
      user.password = newPassword;

      // Save the updated user
      await user.save();
      return res
        .status(200)
        .json({
          success: true,
          message: "Password and details updated successfully",
        });
    } catch (error) {
      console.error("Error updating user:", error);
      return res
        .status(500)
        .json({
          success: false,
          message: "An error occurred while updating the user",
        });
    }
  },

  addAddress: async (req, res) => {
    try {
      const {
        place,
        houseNumber,
        street,
        city,
        zipcode,
        country,
        landmark,
        phoneNumber,
      } = req.body;
      const userId = req.session.user; // Assuming user ID is stored in session

      // Create the new address object
      const newAddress = {
        place,
        houseNumber,
        street,
        city,
        zipcode,
        country,
        landmark,
        phoneNumber,
        isDefault: true, // Set as default initially
      };

      // Check if the user already has addresses
      const userDocument = await UserAddress.findOne({ userId });

      if (userDocument && userDocument.addresses.length > 0) {
        newAddress.isDefault = false;
      }

      // Add the new address to the user's address array
      const result = await UserAddress.findOneAndUpdate(
        { userId },
        { $push: { addresses: newAddress } },
        { new: true }
      );

      if (!result) {
        // If the user document does not exist, create it
        await UserAddress.create({ userId, addresses: [newAddress] });
      }

      req.flash("success", "Address added successfully");
      res.redirect("/user/profile");
    } catch (error) {
      console.error("Error adding address:", error);
      req.flash("error", "Address addition unsuccessful");
      res.redirect("/user/profile");
    }
  },

  editAddress : async (req, res) => {
    try {
      const userId = req.session.user;
      const addressId = req.params.addressId;
      const updatedAddress = req.body;
  
      if (!updatedAddress.place || !['home', 'work'].includes(updatedAddress.place)) {
        return res.json({ success: false, message: "Invalid place value." });
      }

      const result = await UserAddress.updateOne(
        { userId, "addresses._id": addressId },
        { $set: { "addresses.$": updatedAddress } }
      );
  
      if (result.modifiedCount > 0) {
        const userDoc = await UserAddress.findOne({ userId });
  
        console.log('User document:', userDoc);
  
        if (userDoc) {
          const hasDefault = userDoc.addresses.some(
            (address) => address.isDefault
          );
          console.log('Has default address:', hasDefault);
          if (!hasDefault) {
            const updateResult = await UserAddress.updateOne(
              { userId, "addresses._id": addressId },
              { $set: { "addresses.$.isDefault": true } }
            );
            console.log('Default address update result:', updateResult);
          }
        } else {
          console.log("User document not found");
        }
  
        req.flash("success","Address updated successfully.")
        res.json({ success: true, message: "Address updated successfully." });
      } else {
        req.flash("error","Address update unsuccessful. Address may not be found")
        res.json({
          success: false,
          message: "Address update unsuccessful. Address may not be found.",
        });
      }
    } catch (error) {
      console.error("Error updating address:", error);
      res.json({
        success: false,
        message: "Address update unsuccessful. Please try again.",
      });
    }
  },
  
  deleteAddress: async (req, res) => {
    try {
      const userId = req.session.user;
      const addressId = req.params.addressId;

      // Find the user's document
      const userDoc = await UserAddress.findOne({ userId });

      if (!userDoc) {
        return res.json({ success: false, message: "User not found." });
      }

      // Check if the address to be deleted is the default one
      const addressToDelete = userDoc.addresses.id(addressId);
      const isDefault = addressToDelete.isDefault;

      // Perform the delete operation
      const result = await UserAddress.findOneAndUpdate(
        { userId },
        { $pull: { addresses: { _id: addressId } } },
        { new: true } // Return the updated document
      );

      if (result) {
        // If the deleted address was the default, set the next address as default
        if (isDefault) {
          const nextDefaultAddress = result.addresses[0]; // Set the first address as default

          // Update the first address to be the default if it exists
          if (nextDefaultAddress) {
            await UserAddress.updateOne(
              { userId, "addresses._id": nextDefaultAddress._id },
              { $set: { "addresses.$.isDefault": true } }
            );
          }
        }

        // Send a success response
        res.json({ success: true, message: "Address deleted successfully." });
      } else {
        res.json({
          success: false,
          message: "Address not found or already deleted.",
        });
      }
    } catch (error) {
      console.error("Error deleting address:", error);
      res.json({
        success: false,
        message: "Address deletion unsuccessful. Please try again.",
      });
    }
  },

  setDefault:async (req, res) => {
    try {
        const { addressId } = req.params;
        const userId = req.session.user;
         console.log(addressId);
        if (!addressId) {
            return res.json({ success: false, message: 'Address ID is required.' });
        }

        const userDocument = await UserAddress.findOne({ userId }).exec();
        
        if (!userDocument) {
            return res.json({ success: false, message: 'User not found.' });
        }

        userDocument.addresses.forEach(address => {
            address.isDefault = false;
        });

        const selectedAddress = userDocument.addresses.id(addressId);
        if (!selectedAddress) {
            return res.json({ success: false, message: 'Address not found.' });
        }
        selectedAddress.isDefault = true;

        await userDocument.save();

        res.json({ success: true });
    } catch (error) {
        console.error('Error setting default address:', error);
        res.json({ success: false, message: 'An error occurred while setting the default address.' });
    }
  },

  /*check out */

  checkOutaddAddress: async (req, res) => {
    try {
      const {
        place,
        houseNumber,
        street,
        city,
        zipcode,
        country,
        landmark,
        phoneNumber,
      } = req.body;
      const userId = req.session.user; // Assuming user ID is stored in session

      // Create the new address object
      const newAddress = {
        place,
        houseNumber,
        street,
        city,
        zipcode,
        country,
        landmark,
        phoneNumber,
        isDefault: true, // Set as default initially
      };

      // Check if the user already has addresses
      const userDocument = await UserAddress.findOne({ userId });

      if (userDocument && userDocument.addresses.length > 0) {
        newAddress.isDefault = false;
      }

      // Add the new address to the user's address array
      const result = await UserAddress.findOneAndUpdate(
        { userId },
        { $push: { addresses: newAddress } },
        { new: true }
      );

      if (!result) {
        // If the user document does not exist, create it
        await UserAddress.create({ userId, addresses: [newAddress] });
      }

      req.flash("success", "Address added successfully");
      res.redirect("/checkOut");
    } catch (error) {
      console.error("Error adding address:", error);
      req.flash("error", "Address addition unsuccessful");
      res.redirect("/checkOut");
    }
  },
  checkOuteditAddress : async (req, res) => {
    try {
      const userId = req.session.user;
      const addressId = req.params.addressId;
      const updatedAddress = req.body;
  
      if (!updatedAddress.place || !['home', 'work'].includes(updatedAddress.place)) {
        return res.json({ success: false, message: "Invalid place value." });
      }

      const result = await UserAddress.updateOne(
        { userId, "addresses._id": addressId },
        { $set: { "addresses.$": updatedAddress } }
      );
  
      if (result.modifiedCount > 0) {
        const userDoc = await UserAddress.findOne({ userId });
  
        console.log('User document:', userDoc);
  
        if (userDoc) {
          const hasDefault = userDoc.addresses.some(
            (address) => address.isDefault
          );
          console.log('Has default address:', hasDefault);
          if (!hasDefault) {
            const updateResult = await UserAddress.updateOne(
              { userId, "addresses._id": addressId },
              { $set: { "addresses.$.isDefault": true } }
            );
            console.log('Default address update result:', updateResult);
          }
        } else {
          console.log("User document not found");
        }
  
        req.flash("success","Address updated successfully.")
        res.json({ success: true, message: "Address updated successfully." });
      } else {
        req.flash("error","Address update unsuccessful. Address may not be found")
        res.json({
          success: false,
          message: "Address update unsuccessful. Address may not be found.",
        });
      }
    } catch (error) {
      console.error("Error updating address:", error);
      res.json({
        success: false,
        message: "Address update unsuccessful. Please try again.",
      });
    }
  },
  checkOutdeleteAddress: async (req, res) => {
    try {
      const userId = req.session.user;
      const addressId = req.params.addressId;

      // Find the user's document
      const userDoc = await UserAddress.findOne({ userId });

      if (!userDoc) {
        return res.json({ success: false, message: "User not found." });
      }

      // Check if the address to be deleted is the default one
      const addressToDelete = userDoc.addresses.id(addressId);
      const isDefault = addressToDelete.isDefault;

      // Perform the delete operation
      const result = await UserAddress.findOneAndUpdate(
        { userId },
        { $pull: { addresses: { _id: addressId } } },
        { new: true } // Return the updated document
      );

      if (result) {
        // If the deleted address was the default, set the next address as default
        if (isDefault) {
          const nextDefaultAddress = result.addresses[0]; // Set the first address as default

          // Update the first address to be the default if it exists
          if (nextDefaultAddress) {
            await UserAddress.updateOne(
              { userId, "addresses._id": nextDefaultAddress._id },
              { $set: { "addresses.$.isDefault": true } }
            );
          }
        }

        // Send a success response
        res.json({ success: true, message: "Address deleted successfully." });
      } else {
        res.json({
          success: false,
          message: "Address not found or already deleted.",
        });
      }
    } catch (error) {
      console.error("Error deleting address:", error);
      res.json({
        success: false,
        message: "Address deletion unsuccessful. Please try again.",
      });
    }
  },
  checkOutsetDefault:async (req, res) => {
    try {
        const { addressId } = req.params;
        const userId = req.session.user;
         console.log(addressId);
        if (!addressId) {
            return res.json({ success: false, message: 'Address ID is required.' });
        }

        const userDocument = await UserAddress.findOne({ userId }).exec();
        
        if (!userDocument) {
            return res.json({ success: false, message: 'User not found.' });
        }

        userDocument.addresses.forEach(address => {
            address.isDefault = false;
        });

        const selectedAddress = userDocument.addresses.id(addressId);
        if (!selectedAddress) {
            return res.json({ success: false, message: 'Address not found.' });
        }
        selectedAddress.isDefault = true;

        await userDocument.save();

        res.json({ success: true });
    } catch (error) {
        console.error('Error setting default address:', error);
        res.json({ success: false, message: 'An error occurred while setting the default address.' });
    }
  },

};
