const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    productName: {  
        type: String,
        required: true,
    },
    oldPrice: {
        type: Number,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    description: {
        type: String,
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    stock: {
        type: Number,
        min: 0,
        required: true,
        default: 0,
    },
    Colour: {
        type: String,
    },
    displaySize: {
        type: Number,
        required: true,
    },
    resolution: {
        type: String,
        required: true,
    },
    Processor: {
        type: String,
        enum: ['Intel', 'AMD', 'Apple M1', 'Qualcomm Snapdragon', 'Samsung Exynos'],
        required: true,
    },
    ramSize: {
        type: Number,
        enum: [4, 8, 16, 32, 64],
        required: true,
    },
    hardDriveSize: {
        type: Number,
        enum: [128, 256, 512, 1024, 2048],
        required: true,
    },
    hardDiskDescription: {
        type: String,
        enum: ['HDD', 'SSD', 'Hybrid', 'NVMe'],
        required: true,
    },
    graphicsChipsetBrand: {
        type: String,
        enum: ['NVIDIA', 'AMD', 'Intel', 'Apple',"Non-Graphic"],
        required: true,
    },
    operatingSystem: {
        type: String,
        enum: ['Windows', 'macOS', 'Linux', 'Chrome OS', 'Android'],
        required: true,
    },
    numberofUSB: {
        type: Number,
        required: true,
    },
    audioDetails: {
        type: String,
        required: true,
    },
    countryofOrigin: {
        type: String,
        required: true,
    },
    itemWeight: {
        type: String,
        required: true,
    },
    reviews: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Review',
        },
    ],
    primaryImages: [
        {
            name: {
                type: String,
            },
            path: {
                type: String,
            },
        },
    ],
    secondaryImages: [
        {
            name: {
                type: String,
            },
            path: {
                type: String,
            },
        },
    ],
}, {
    timestamps: true,
    strict: false,
});

module.exports = mongoose.model('Product', productSchema);
