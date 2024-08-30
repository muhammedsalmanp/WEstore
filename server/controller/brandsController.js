const Brands = require('../model/brandsSchema');
const adminLayout = "./layouts/adminLayouts";

const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

module.exports = {
    getBrands: async (req, res) => {
        try {

            const locals = {
                title: "Brands",
            };
            const perPage = 12
            const page = req.query.page || 1
            const brand = await Brands.find()


            const breadcrumbs = [
                { name: 'Home', url: '/admin' },
                { name: 'Brands', url: '/admin/brands' },
            ];
            console.log(brand);
            res.render("admin/brand/brands", {
                locals,
                layout: adminLayout,
                brand,
                breadcrumbs,
            })
        } catch (error) {
            console.error(error);
        }
    },
    
    getAddBrand: async (req, res) => {
        try {
            const locals = {
                title: "Add Brand",
            };
            const breadcrumbs = [
                { name: 'Home', url: '/admin' },
                { name: 'Brands', url: '/admin/brands' },
                { name: `Add Brand`, url: `/admin/brands/addBrands` }
            ];
            res.render("admin/brand/addBrands", {
                locals,
                layout: adminLayout,
                breadcrumbs,
            })
        } catch (error) {

        }
    },

    addBrand:async (req, res) => {
        try {
            console.log("Data from addBrand:", req.body);
            const name = req.body.brand_name.trim().toUpperCase();
            const brandLogo = req.file;
    
            const existingBrand = await Brands.findOne({ name: name });
            if (existingBrand) {
                req.flash("error", "Brand already exists");
                return res.redirect('/admin/brands');
            }
    
            let logoPath = '';
            if (brandLogo) {
                logoPath = path.join('/uploads/brand-logos/', brandLogo.filename);
    
                // Ensure the directory exists
                const resizedDir = path.join(__dirname, '../../public/uploads/brand-logos/resized/');
                if (!fs.existsSync(resizedDir)) {
                    fs.mkdirSync(resizedDir, { recursive: true });
                }
    
                // Resize the logo if needed
                await sharp(brandLogo.path)
                    .resize(500, 500)
                    .toFile(
                        path.join(resizedDir, brandLogo.filename)
                    );
            }
    
            const newBrand = new Brands({
                name: name.toUpperCase(),
                logo: {
                    name: brandLogo ? brandLogo.filename : '',
                    path: logoPath
                }
            });
    
            await newBrand.save();
            req.flash("success", "Brand added successfully");
            res.redirect("/admin/brands");
        } catch (error) {
            req.flash("error", "There was an error adding the brand");
            res.redirect("/admin/brands");
            console.error("Error adding brand:", error);
        }
    },

    
}