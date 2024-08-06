const adminLayout = "./layouts/adminLayouts";

const Category = require("../model/categorySchema");

module.exports = {
  /*---category view and add---*/

  getCategory: async (req, res) => {
    
    const locals = {
      title: "Category",
    };
    const perPage = 12
    const page = req.query.page||1
    const categories = await Category.find()
    .skip(perPage*page-perPage)   
    .limit(perPage)
    .exec();
    const count = await Category.find().countDocuments({});
    const nextPage = parseInt(page)+1;
    const hasNextPage = nextPage <= Math.ceil(count / perPage);

    const breadcrumbs = [
      { name: 'Home', url: '/admin' },
      { name: 'Category', url: '/admin/category' },
      { name: `Page ${page}`, url: `/admin/category?page=${page}` }
    ];             
    console.log(categories);
    res.render("admin/categories/category", {
      locals,
      layout: adminLayout,
      categories,
      current: page,
      perPage: perPage,
      pages: Math.ceil(count / perPage),
      nextPage: hasNextPage ? nextPage : null,
      breadcrumbs,
    });
  },

  getAddCategory: async (req, res) => {
    const locals = {
      titel: "Add Category",
    };
    const breadcrumbs = [
      { name: 'Home', url: '/admin' },
      { name: 'Category', url: '/admin/category' },
      { name: `Add Category`, url: `/category/addCategory` }
    ];   
    res.render("admin/categories/addCategory", {
      locals,
      layout: adminLayout,
      breadcrumbs
    });
  },

  addCategory: async (req, res) => {
    try {
      console.log(req.body);

      const name = req.body.category_name.trim().toLowerCase();

      const category = await Category.findOne({ name: name });

      if (category) {
        req.flash("error", "Category already exist");
        return res.redirect("/admin/category");
      }

      const addCategory = new Category({ name });

      await addCategory.save();
      req.flash("success", "Category successfully saved");

      return res.redirect("/admin/category");
    } catch (error) {
      console.error(error);
    }
  },

  getEditCategory: async (req, res) => {
    const category = await Category.findById(req.params.id);
    const breadcrumbs = [
      { name: 'Home', url: '/admin' },
      { name: 'Category', url: '/admin/category' },
      { name: `Edit Category`, url: `/category/editCategory/:id` }
    ];  
    res.render("admin/categories/editCategory", {
      category,
      layout: adminLayout,
      breadcrumbs,
    });
  },

  editCategory: async (req, res) => {
    try {
      const { status } = req.body;
      console.log(req.body);
      const name = req.body.category_name.trim().toLowerCase();

      const category = await Category.findOne({ name: name });

      if (category && category._id.toString() !== req.params.id) {
        req.flash("error", "Category with this name already exists");
        return res.redirect("/admin/category");
      }

      const updatedCategory = {
        name: name,
        isActive: status === "true" ? true : false,
      };

      const id = req.params.id;
      const update_category = await Category.findByIdAndUpdate(
        id,
        updatedCategory,
        { new: true }
      );

      if (update_category) {
        req.flash("success", "Category successfully updated");
        return res.redirect("/admin/category");
      } else {
        req.flash("error", "Category not found");
        return res.redirect("/admin/category");
      }
    } catch (error) {
      console.error(error);
      req.flash("error", "Server error");
      return res.redirect(`/admin/category/editCategory`);
    }
  },

  softdelete: async (req, res) => {
    try {
      const categoryId = req.body.categoryId;
      const action = req.body.shouldList;

      const category = await Category.findById(categoryId);
      if (!category) {
        return res
          .status(404)
          .json({ success: false, message: "Category not found" });
      }

      category.isActive = action;
      await category.save();
      console.log("Product category updated successfully");

      return res
        .status(200)
        .json({
          success: true,
          message: "Product category updated successfully",
        });
    } catch (error) {
      console.error("Error updating product status:", error);
      return res
        .status(500)
        .json({ success: false, message: "Server error", error });
    }
  },
  
  deleteCategory: async (req, res) => {
    try {
      const categoryId = req.body.categoryId;

      const category = await Category.findById(categoryId);
      if (!category) {
        return res
          .status(404)
          .json({ success: false, message: "Category not found" });
      }

      await Category.deleteOne({ _id: categoryId });
      console.log("Category deleted successfully");

      return res
        .status(200)
        .json({ success: true, message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting category:", error);
      return res
        .status(500)
        .json({ success: false, message: "Server error", error });
    }
  },
};
