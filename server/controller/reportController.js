
const Order = require("../model/orderSchema");
const Product = require("../model/productSchema");
const adminLayout = "./layouts/adminLayouts";
const excelJs = require("exceljs");
const UserAddress = require("../model/userAddressSchema");
const PDFDocument = require("pdfkit");

module.exports = {
    getSailReport: async (req, res) => {
        try {
            const locals = {
                title: "Sales Report",
            };
            const perPage = 50;
            const page = req.query.page || 1;
            const reportType = req.query.reportType || 'daily';
            const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
            const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    
            // Determine date range based on reportType
            let matchCondition = { return: false };
            const now = new Date();
            switch (reportType) {
                case 'daily':
                    matchCondition.createdAt = { $gte: new Date(now.setHours(0, 0, 0, 0)) };
                    break;
                case 'weekly':
                    const startOfWeek = new Date();
                    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
                    matchCondition.createdAt = { $gte: startOfWeek };
                    break;
                case 'monthly':
                    matchCondition.createdAt = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
                    break;
                case 'yearly':
                    matchCondition.createdAt = { $gte: new Date(now.getFullYear(), 0, 1) };
                    break;
                case 'custom':
                    if (startDate && endDate) {
                        matchCondition.createdAt = { $gte: startDate, $lte: endDate };
                    } else {
                        throw new Error('Custom date range is required for custom report type.');
                    }
                    break;
                default:
                    throw new Error('Invalid report type.');
            }
    
            // Fetch orders with pagination and populate required fields
            const orders = await Order.find(matchCondition)
                .populate({
                    path: 'products._id', 
                    select: 'productName price offerDiscountPrice offerDiscountPersantage categoryDiscountAmount' // Selecting required product fields
                })
                .populate({
                    path: 'userId', 
                    select: 'firstName lastName email referralCode refferalRewards' 
                })
                .populate({
                    path: 'shippingAddress', 
                    select: 'addressLine1 city state postalCode'
                })
                .sort({ createdAt: -1 })
                .skip(perPage * (page - 1))
                .limit(perPage)
                .exec();
    
            const totalOrders = await Order.countDocuments(matchCondition);
    
            // Calculate the total amount and discount using aggregation
            const totalAmount = await Order.aggregate([
                { $match: matchCondition },
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: '$offerAppliedTotalAmount' },
                        totalDiscount: { $sum: '$couponDiscount' }
                    }
                }
            ]);
    
            const overallAmount = totalAmount.length ? totalAmount[0].totalAmount : 0;
            const overallDiscount = totalAmount.length ? totalAmount[0].totalDiscount : 0;
    
            // Pagination details
            const count = await Order.countDocuments(matchCondition);
            const nextPage = parseInt(page) + 1;
            const hasNextPage = nextPage <= Math.ceil(count / perPage);
    
            const breadcrumbs = [
                { name: 'Home', url: '/admin' },
                { name: 'Sales Report', url: '/admin/sales-report' },
                { name: `Page ${page}`, url: `/admin/sales-report?page=${page}` }
            ];
    
            // Now you have populated orders with all details, you can create variables to store the data you need:
            const reportData = orders.map(order => ({
                orderId: order.orderId,
                userName: `${order.userId.firstName} ${order.userId.lastName}`,
                userEmail: order.userId.email,
                referralCode: order.userId.referralCode,
                referralRewards: order.userId.refferalRewards,
                shippingAddress: `${order.shippingAddress.addressLine1}, ${order.shippingAddress.city}, ${order.shippingAddress.state}, ${order.shippingAddress.postalCode}`,
                products: order.products.map(product => ({
                    name: product._id.productName,
                    price: product._id.price,
                    discountPrice: product._id.offerDiscountPrice,
                    categoryDiscount: product._id.categoryDiscountAmount,
                    quantity: product.quantity,
                    totalPrice: product.totalprice
                })),
                totalAmount: order.totalAmount,
                offerAppliedTotalAmount: order.offerAppliedTotalAmount,
                couponDiscount: order.couponDiscount,
                status: order.status,
                paymentMethod: order.paymentMethod,
                createdAt: order.createdAt
            }));
    
            res.render('admin/report/salesReport', {
                locals,
                layout: adminLayout,
                orders:reportData, // Pass the processed data to the view
                current: page,
                perPage,
                pages: Math.ceil(count / perPage),
                nextPage: hasNextPage ? nextPage : null,
                breadcrumbs,
                totalOrders,
                overallAmount,
                overallDiscount,
                reportType,
                startDate,
                endDate
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, error: "An error occurred while fetching the sales report." });
        }
    },

    exportToPdf: async (req, res) => {
        try {
          // Parse and validate date parameters
          let startDate = new Date(req.query.startDate);
          let endDate = new Date(req.query.endDate);
      
          // Check if the dates are valid
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).send('Invalid date range');
          }
      
          // Set default dates if not provided
          if (isNaN(startDate.getTime())) startDate = new Date();
          if (isNaN(endDate.getTime())) endDate = new Date();
      
          startDate.setUTCHours(0, 0, 0, 0);
          endDate.setUTCHours(23, 59, 59, 999);
      
          // Fetch orders
          const orders = await Order.find({
            createdAt: { $gte: startDate, $lte: endDate },
            return: false,
          })
            .populate({ path: 'userId', select: 'firstName lastName' })
            .populate({ path: 'products._id', select: 'productName' })
            .lean();
      
          const doc = new PDFDocument({ margin: 20, size: 'A4' });
      
          let filename = 'sales_report.pdf';
          filename = encodeURIComponent(filename);
          res.setHeader('content-disposition', `attachment; filename="${filename}"`);
          res.setHeader('content-type', 'application/pdf');
      
          doc.fontSize(15).text('Sales Report', { align: 'center' }).moveDown();
      
          // Define column widths and starting positions
          const margins = { left: 20, top: 50 };
          const columnWidths = {
            orderId: 80,
            date: 80,
            customer: 80,
            products: 120,
            totalAmount: 60,
            paymentMethod: 70,
            status: 80
          };
          const rowHeight = 30;
          const maxRowsPerPage = 20; // Max rows per page
      
          let yPosition = margins.top + rowHeight * 2;
          let currentPage = 1;
      
          // Draw table header
          const drawHeader = () => {
            doc.fontSize(10).font('Helvetica-Bold');
            doc.text('Order ID', margins.left, margins.top, { width: columnWidths.orderId, align: 'left' });
            doc.text('Date', margins.left + columnWidths.orderId, margins.top, { width: columnWidths.date, align: 'left' });
            doc.text('Customer', margins.left + columnWidths.orderId + columnWidths.date, margins.top, { width: columnWidths.customer, align: 'left' });
            doc.text('Products', margins.left + columnWidths.orderId + columnWidths.date + columnWidths.customer, margins.top, { width: columnWidths.products, align: 'left' });
            doc.text('Total Amount', margins.left + columnWidths.orderId + columnWidths.date + columnWidths.customer + columnWidths.products, margins.top, { width: columnWidths.totalAmount, align: 'left' });
            doc.text('Payment Method', margins.left + columnWidths.orderId + columnWidths.date + columnWidths.customer + columnWidths.products + columnWidths.totalAmount, margins.top, { width: columnWidths.paymentMethod, align: 'left' });
            doc.text('Status', margins.left + columnWidths.orderId + columnWidths.date + columnWidths.customer + columnWidths.products + columnWidths.totalAmount + columnWidths.paymentMethod, margins.top, { width: columnWidths.status, align: 'left' });
            doc.moveDown();
      
            // Draw a line under the header
            doc.strokeColor('black').lineWidth(1);
            doc.moveTo(margins.left, margins.top + rowHeight).lineTo(margins.left + Object.values(columnWidths).reduce((acc, width) => acc + width, 0), margins.top + rowHeight).stroke();
            yPosition = margins.top + rowHeight + 10; // Adjust yPosition after the line
          };
      
          // Draw a line before each order details
          const drawSeparatorLine = () => {
            doc.strokeColor('black').lineWidth(1);
            doc.moveTo(margins.left, yPosition).lineTo(margins.left + Object.values(columnWidths).reduce((acc, width) => acc + width, 0), yPosition).stroke();
            yPosition += 5; // Space after the line
          };
      
          // Wrap text function
          const wrapText = (text, width) => {
            const lines = [];
            let line = '';
            const words = text.split(' ');
      
            for (const word of words) {
              const testLine = line + word + ' ';
              const widthOfTestLine = doc.widthOfString(testLine);
              if (widthOfTestLine > width) {
                lines.push(line);
                line = word + ' ';
              } else {
                line = testLine;
              }
            }
            lines.push(line);
            return lines;
          };
      
          // Draw table rows
          const drawRows = () => {
            doc.fontSize(10).font('Helvetica');
            let rowCount = 0;
      
            orders.forEach(order => {
              const orderDate = order.createdAt.toISOString().split('T')[0];
              const productNames = order.products.map(item => `${item._id.productName} (Qty: ${item.quantity})`).join(', ');
              const customerName = order.userId ? `${order.userId.firstName} ${order.userId.lastName}` : '';
      
              // Check if we need to add a new page
              if (yPosition > doc.page.height - margins.top - rowHeight) {
                doc.addPage();
                drawHeader();
                yPosition = margins.top + rowHeight * 2;
                rowCount = 0;
              }
      
              // Draw separator line before order details
              drawSeparatorLine();
      
              // Draw order ID
              doc.text(order._id.toString().slice(-7).toUpperCase(), margins.left, yPosition, { width: columnWidths.orderId, align: 'left' });
              // Draw date
              doc.text(orderDate, margins.left + columnWidths.orderId, yPosition, { width: columnWidths.date, align: 'left' });
              // Draw customer name
              doc.text(customerName, margins.left + columnWidths.orderId + columnWidths.date, yPosition, { width: columnWidths.customer, align: 'left' });
      
            
              // Draw total amount
              doc.text(`₹${order.totalAmount.toFixed(2)}`, margins.left + columnWidths.orderId + columnWidths.date + columnWidths.customer + columnWidths.products, yPosition, { width: columnWidths.totalAmount, align: 'left' });
              // Draw payment method
              doc.text(order.paymentMethod, margins.left + columnWidths.orderId + columnWidths.date + columnWidths.customer + columnWidths.products + columnWidths.totalAmount, yPosition, { width: columnWidths.paymentMethod, align: 'left' });
              // Draw status
              doc.text(order.status, margins.left + columnWidths.orderId + columnWidths.date + columnWidths.customer + columnWidths.products + columnWidths.totalAmount + columnWidths.paymentMethod, yPosition, { width: columnWidths.status, align: 'left' });
               // Draw products
               const productLines = wrapText(productNames, columnWidths.products);
               productLines.forEach((line, index) => {
                 if (index > 0) {
                   yPosition += rowHeight; // Move to the next line if there's more text
                   if (yPosition > doc.page.height - margins.top - rowHeight) {
                     doc.addPage();
                     drawHeader();
                     yPosition = margins.top + rowHeight * 2;
                   }
                 }
                 doc.text(line, margins.left + columnWidths.orderId + columnWidths.date + columnWidths.customer, yPosition, { width: columnWidths.products, align: 'left' });
               });
              yPosition += rowHeight;
              rowCount++;
      
              // Check if we need to add a new page
              if (rowCount >= maxRowsPerPage) {
                doc.addPage();
                drawHeader();
                yPosition = margins.top + rowHeight * 2;
                rowCount = 0;
              }
            });
          };
      
          // Draw header and rows
          drawHeader();
          drawRows();
      
          // Sending the PDF
          doc.pipe(res);
          doc.end();
        } catch (err) {
          console.log(err);
          res.status(500).send('Internal Server Error');
        }
      },
      
      exportToExcel:async (req, res) => {
        // Date setup
        let startDate = req.query.startDate ? new Date(req.query.startDate) : new Date();
        let endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
        startDate.setUTCHours(0, 0, 0, 0);
        endDate.setUTCHours(23, 59, 59, 999);
    
        try {
            // Fetch orders with populated user, product, and address information
            const orders = await Order.find({
                createdAt: { $gte: startDate, $lte: endDate },
                return: false,
            }).populate('userId', 'firstName lastName') // Populating user information
              .populate('products._id', 'productName price') // Populating product information
              .populate('shippingAddress'); // Populating shipping address
    
            // Prepare data for Excel
            const excelData = orders.flatMap(order => 
                order.products.map(product => ({
                    _id: order._id.toString().slice(-7).toUpperCase(), // Formatting Order ID
                    customer: `${order.userId.firstName} ${order.userId.lastName}`,
                    productName: product._id.productName,
                    price: product._id.price,
                    quantity: product.quantity,
                    itemTotal: product.totalprice,
                    totalAmount: order.totalAmount,
                    shippingAddress: `${order.shippingAddress.houseNumber || ''}, ${order.shippingAddress.street || ''}, ${order.shippingAddress.city || ''}, ${order.shippingAddress.state || ''}, ${order.shippingAddress.zipcode || ''}, ${order.shippingAddress.country || ''}`,
                    paymentMethod: order.paymentMethod,
                    status: order.status,
                    createdAt: order.createdAt.toISOString().split("T")[0]
                }))
            );
    
            // Workbook and worksheet setup
            const workBook = new excelJs.Workbook();
            const worksheet = workBook.addWorksheet("Sales Report");
    
            worksheet.columns = [
                { header: "Order ID", key: "_id", width: 15 },
                { header: "Customer", key: "customer", width: 25 },
                { header: "Product Name", key: "productName", width: 30 },
                { header: "Price", key: "price", width: 10 },
                { header: "Quantity", key: "quantity", width: 10 },
                { header: "Item Total", key: "itemTotal", width: 15 },
                { header: "Total Amount", key: "totalAmount", width: 15 },
                { header: "Payment Method", key: "paymentMethod", width: 15 },
                { header: "Status", key: "status", width: 15 },
                { header: "Date", key: "createdAt", width: 15 }
            ];
    
            // Adding rows
            excelData.forEach(row => {
                worksheet.addRow(row);
            });
    
            // Styling headers
            worksheet.getRow(1).eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } }; // Yellow background
                cell.font = { bold: true, color: { argb: '000000' } }; // Black text
                cell.alignment = { horizontal: 'center' };
            });
    
            // Optional: Styling rows (alternating colors for better readability)
            worksheet.eachRow({ includeEmpty: false, skipHeader: true }, (row, rowNumber) => {
                row.eachCell((cell) => {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                });
                // Add alternating row color
                if (rowNumber % 2 === 0) {
                    row.eachCell({ includeEmpty: true }, (cell) => {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F2F2' } }; // Light grey
                    });
                }
            });
    
            // Sending the response
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", "attachment; filename=orders.xlsx");
            await workBook.xlsx.write(res);
            res.status(200).end();
    
        } catch (err) {
            console.error("Error generating Excel:", err);
            res.status(500).send("Internal Server Error");
        }
    },
      
      
    

    
}