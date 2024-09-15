const adminLayout = "./layouts/adminLayouts";

const mongoose = require('mongoose');
const Order = require("../model/orderSchema");
const Product = require("../model/productSchema");
const Category = require("../model/categorySchema");
const User = require("../model/userSchema");

function getDateKey(date, timeRange) {
  switch (timeRange) {
    case 'today':
    case '1day':
      return `${date.getHours()}:00`;
    case '1week':
      return `Day ${date.getDate() - (new Date().getDate() - 1)}`; // Days since the start of the week
    case '1month':
      return `Day ${date.getDate()}`;
    case '1year':
      return `Month ${date.getMonth() + 1}`;
    default:
      return `${date.getFullYear()}`;
  }
}

function getLabelRange(timeRange, startDate, endDate) {
  const labels = [];
  const currentDate = new Date(endDate);

  switch (timeRange) {
    case 'today':
    case '1day':
      for (let i = 0; i < 24; i++) {
        labels.push(`${i}:00`);
      }
      break;
    case '1week':
      for (let i = 6; i >= 0; i--) {
        const labelDate = new Date();
        labelDate.setDate(labelDate.getDate() - i); // Go back i days from today
        labels.push(`Day ${labelDate.getDate()}`);
      }
      break;
    case '1month':
      for (let i = 1; i <= 31; i++) {
        labels.push(`Day ${i}`);
      }
      break;
    case '1year':
      for (let i = 1; i <= 12; i++) {
        labels.push(`Month ${i}`);
      }
      break;
    default:
      for (let i = 2019; i <= new Date().getFullYear(); i++) {
        labels.push(`${i}`);
      }
  }
  return labels;
}



module.exports = {
  getDashboard: async (req, res) => {
    const locals = {
      title: "WE STORE",
    };

    // Default time range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const userCount = await User.countDocuments();
    const productCount = await Product.countDocuments();
    const CatCount=await Category.countDocuments();
    const cordCount= await Order.countDocuments();
    const outOfStock = await Product.countDocuments({ stock: { $lte: 0 } });

   
    const orders = await Order.find({
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    });

    
    let totalOrders = 0;
    let totalReturns = 0;
    let totalCancellations = 0;

  
    const productSalesMap = {};
    const categorySalesMap = {};
    const brandSalesMap = {};


    for (const order of orders) {
      totalOrders++;
      if (order.status === 'returned') totalReturns++;
      if (order.status === 'cancelled') totalCancellations++;

      for (const orderProduct of order.products) {
        const product = await Product.findById(orderProduct._id).populate('category').populate('brand');
        if (!product) continue;

        const salesAmount = orderProduct.quantity * product.price;
        const productId = product._id.toString();
        const categoryId = product.category ? product.category._id.toString() : null;
        const brandId = product.brand ? product.brand._id.toString() : null;

        if (!productSalesMap[productId]) {
          productSalesMap[productId] = {
            _id: product._id,
            productName: product.productName,
            productImage: product.primaryImages[0]?.path || null,
            categoryName: product.category ? product.category.name : 'Unknown',
            totalQuantity: 0,
            totalSales: 0,
          };
        }
        productSalesMap[productId].totalQuantity += orderProduct.quantity;
        productSalesMap[productId].totalSales += salesAmount;

        if (categoryId) {
          if (!categorySalesMap[categoryId]) {
            categorySalesMap[categoryId] = {
              _id: categoryId,
              categoryName: product.category.name || 'Unknown',
              totalQuantity: 0,
              totalSales: 0,
            };
          }
          categorySalesMap[categoryId].totalQuantity += orderProduct.quantity;
          categorySalesMap[categoryId].totalSales += salesAmount;
        }

        if (brandId) {
          if (!brandSalesMap[brandId]) {
            brandSalesMap[brandId] = {
              _id: brandId,
              brandName: product.brand.name,
              totalQuantity: 0,
              totalSales: 0,
            };
          }
          brandSalesMap[brandId].totalQuantity += orderProduct.quantity;
          brandSalesMap[brandId].totalSales += salesAmount;
        }
      }
    }
    const paidOrders = await Order.find({ paymentStatus: 'Paid' });
    const totalRevenue = paidOrders.reduce((sum, order) => sum + order.offerAppliedTotalAmount, 0);

    const topSellingProducts = Object.values(productSalesMap).sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, 10);
    const topSellingCategories = Object.values(categorySalesMap).sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, 10);
    const topSellingBrands = Object.values(brandSalesMap).sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, 10);

    res.render("admin/dashboard", {
      locals,
      userCount,
      productCount,
      outOfStock,
      totalOrders,
      totalReturns,
      totalCancellations,
      topSellingProducts,
      topSellingCategories,
      topSellingBrands,
      layout: adminLayout,
      CatCount,
      totalRevenue,
      cordCount,
    });
  },

  getChartData: async (req, res) => {
    const { timeRange } = req.query;

    const endDate = new Date();
    let startDate = new Date();

    switch (timeRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case '1day':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case '1week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '1month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case '1year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        const earliestOrder = await Order.find({}).sort({ createdAt: 1 }).limit(1);
        startDate = earliestOrder.length > 0 ? earliestOrder[0].createdAt : new Date(2024, 6, 1);
    }

    const orders = await Order.find({
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    });

    const data = {
      labels: getLabelRange(timeRange, startDate, endDate),
      orders: [],
      cancellations: [],
      returns: [],
    };

    const counts = {
      orders: {},
      cancellations: {},
      returns: {},
    };

    orders.forEach(order => {
      const dateKey = getDateKey(order.createdAt, timeRange);
      counts.orders[dateKey] = (counts.orders[dateKey] || 0) + 1;
      if (order.status === 'Cancelled') counts.cancellations[dateKey] = (counts.cancellations[dateKey] || 0) + 1;
      if (order.status === 'Returned') counts.returns[dateKey] = (counts.returns[dateKey] || 0) + 1;
    });

    data.labels.forEach(label => {
      data.orders.push(counts.orders[label] || 0);
      data.cancellations.push(counts.cancellations[label] || 0);
      data.returns.push(counts.returns[label] || 0);
    });

    console.log('Data:', data);
    res.json(data);
  },

};
