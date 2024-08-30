
// const multer = require("multer");
// const path = require("path");

// const storage = multer.diskStorage({
//     destination : (req, file, cb) =>{
//         cb(null, path.join(__dirname, "../../public/uploads/images/"))
//     },
//     fileName : (req,file, cb) =>{
//         const uniqueFileName = Date.now() + '-' + file.originalName;
//         cb( null, uniqueFileName )
//     }
// })


// const productStorage = multer.diskStorage({
//     destination : ( req, file, cb ) => {
//         cb( null, path.join(__dirname,'../../public/uploads/products-images/'))
//     },
//     filename : ( req, file, cb ) => {
//         const uniqueFileName = Date.now() + '-' + file.originalname
//         cb( null, uniqueFileName )
//     }
// })

// module.exports  = {
//     upload: multer({storage : storage}),
//     productUpload: multer({storage : productStorage}),
// }

const multer = require("multer");
const path = require("path");

const productStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../public/uploads/products-images/'));
    },
    filename: (req, file, cb) => {
        const uniqueFileName = Date.now() + '-' + file.originalname;
        cb(null, uniqueFileName);
    }
});


const productUpload = multer({
    storage: productStorage
}).any(); 

const logoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../public/uploads/brand-logos/'));
    },
    filename: (req, file, cb) => {
        const uniqueFileName = Date.now() + '-' + file.originalname;
        cb(null, uniqueFileName);
    }
});

const brandLogoUpload = multer({
    storage: logoStorage
}).single('brandLogo');

module.exports = {
    productUpload: productUpload,
    brandLogoUpload:brandLogoUpload,
};
