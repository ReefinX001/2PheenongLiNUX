const CashSale = require('../models/POS/CashSale');
const InstallmentOrder = require('../models/Installment/InstallmentOrder');
const Branch = require('../models/Account/Branch');
const User = require('../models/User/User');

class SalesDashboardController {

  // Get today's sales summary
  static async getTodaySummary(req, res) {
    try {
      // ตั้งค่าช่วงเวลาของวันนี้
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // ตั้งค่าช่วงเวลาของเมื่อวาน
      const startOfYesterday = new Date(startOfDay);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);

      const endOfYesterday = new Date(endOfDay);
      endOfYesterday.setDate(endOfYesterday.getDate() - 1);

      // ดึงข้อมูลการขายสดวันนี้
      const todayCashSales = await CashSale.find({
        soldAt: { $gte: startOfDay, $lte: endOfDay },
        status: 'completed'
      });

      // ดึงข้อมูลการขายผ่อนวันนี้
      const todayInstallmentSales = await InstallmentOrder.find({
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['approved', 'active', 'ongoing', 'completed'] }
      });

      // ดึงข้อมูลการขายเมื่อวาน
      const yesterdayCashSales = await CashSale.find({
        soldAt: { $gte: startOfYesterday, $lte: endOfYesterday },
        status: 'completed'
      });

      const yesterdayInstallmentSales = await InstallmentOrder.find({
        createdAt: { $gte: startOfYesterday, $lte: endOfYesterday },
        status: { $in: ['approved', 'active', 'ongoing', 'completed'] }
      });

      // คำนวณยอดขายรวมวันนี้
      const totalSalesToday = todayCashSales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0) +
                              todayInstallmentSales.reduce((sum, order) => sum + (order.finalTotalAmount || order.totalAmount || 0), 0);

      // คำนวณจำนวนเครื่องที่ขายได้วันนี้
      const totalUnitsSold = todayCashSales.reduce((sum, sale) => {
        return sum + (sale.items ? sale.items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) : 0);
      }, 0) + todayInstallmentSales.reduce((sum, order) => {
        return sum + (order.items ? order.items.reduce((itemSum, item) => itemSum + (item.qty || 0), 0) : 0);
      }, 0);

      // คำนวณ iPhone และ iPad ที่ขายได้
      const iphoneSold = todayCashSales.reduce((sum, sale) => {
        return sum + (sale.items ? sale.items.filter(item =>
          item.name && (item.name.toLowerCase().includes('iphone'))
        ).reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) : 0);
      }, 0) + todayInstallmentSales.reduce((sum, order) => {
        return sum + (order.items ? order.items.filter(item =>
          item.name && (item.name.toLowerCase().includes('iphone'))
        ).reduce((itemSum, item) => itemSum + (item.qty || 0), 0) : 0);
      }, 0);

      const ipadSold = todayCashSales.reduce((sum, sale) => {
        return sum + (sale.items ? sale.items.filter(item =>
          item.name && (item.name.toLowerCase().includes('ipad'))
        ).reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) : 0);
      }, 0) + todayInstallmentSales.reduce((sum, order) => {
        return sum + (order.items ? order.items.filter(item =>
          item.name && (item.name.toLowerCase().includes('ipad'))
        ).reduce((itemSum, item) => itemSum + (item.qty || 0), 0) : 0);
      }, 0);

      // คำนวณยอดขายเมื่อวาน
      const totalSalesYesterday = yesterdayCashSales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0) +
                                  yesterdayInstallmentSales.reduce((sum, order) => sum + (order.finalTotalAmount || order.totalAmount || 0), 0);

      const totalUnitsYesterday = yesterdayCashSales.reduce((sum, sale) => {
        return sum + (sale.items ? sale.items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) : 0);
      }, 0) + yesterdayInstallmentSales.reduce((sum, order) => {
        return sum + (order.items ? order.items.reduce((itemSum, item) => itemSum + (item.qty || 0), 0) : 0);
      }, 0);

      // คำนวณเปอร์เซ็นต์การเปลี่ยนแปลง
      const salesGrowth = totalSalesYesterday > 0 ?
        ((totalSalesToday - totalSalesYesterday) / totalSalesYesterday * 100).toFixed(1) : 0;

      const unitsGrowth = totalUnitsYesterday > 0 ?
        ((totalUnitsSold - totalUnitsYesterday) / totalUnitsYesterday * 100).toFixed(1) : 0;

      // คำนวณเปอร์เซ็นต์ iPhone และ iPad
      const iphonePercentage = totalUnitsSold > 0 ? ((iphoneSold / totalUnitsSold) * 100).toFixed(1) : 0;
      const ipadPercentage = totalUnitsSold > 0 ? ((ipadSold / totalUnitsSold) * 100).toFixed(1) : 0;

      const todaySummary = {
        totalSalesToday: Math.round(totalSalesToday),
        totalUnitsSold,
        iphoneSold,
        ipadSold,
        salesGrowth: parseFloat(salesGrowth),
        unitsGrowth: parseFloat(unitsGrowth),
        iphoneGrowth: 0, // จะคำนวณจากข้อมูลจริงในอนาคต
        ipadGrowth: 0,   // จะคำนวณจากข้อมูลจริงในอนาคต
        iphonePercentage: parseFloat(iphonePercentage),
        ipadPercentage: parseFloat(ipadPercentage)
      };

      res.json({
        success: true,
        data: todaySummary
      });

    } catch (error) {
      console.error('Error getting today summary:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสรุปวันนี้',
        error: error.message
      });
    }
  }

  // Get today's sales with pagination and filters
  static async getTodaySales(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        branch,
        product,
        salesperson,
        search
      } = req.query;

      // ตั้งค่าช่วงเวลาของวันนี้
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // สร้าง filter สำหรับ CashSale
      const cashSaleFilter = {
        soldAt: { $gte: startOfDay, $lte: endOfDay },
        status: 'completed'
      };

      if (branch) {
        cashSaleFilter.branchCode = branch;
      }

      if (salesperson) {
        cashSaleFilter.staffName = new RegExp(salesperson, 'i');
      }

      // สร้าง filter สำหรับ InstallmentOrder
      const installmentFilter = {
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['approved', 'active', 'ongoing', 'completed'] }
      };

      if (branch) {
        installmentFilter.branch_code = branch;
      }

      if (salesperson) {
        installmentFilter.staffName = new RegExp(salesperson, 'i');
      }

      // ดึงข้อมูลการขาย
      const cashSales = await CashSale.find(cashSaleFilter)
        .populate('salesperson', 'employee')
        .populate({
          path: 'salesperson',
          populate: {
            path: 'employee',
            select: 'name'
          }
        })
        .sort({ soldAt: -1 });

      const installmentSales = await InstallmentOrder.find(installmentFilter)
        .populate('salesperson.id', 'employee')
        .populate({
          path: 'salesperson.id',
          populate: {
            path: 'employee',
            select: 'name'
          }
        })
        .sort({ createdAt: -1 });

      // แปลงข้อมูลเป็นรูปแบบเดียวกัน
      const formattedSales = [];

      // แปลงข้อมูล CashSale
      cashSales.forEach(sale => {
        if (sale.items && sale.items.length > 0) {
          sale.items.forEach(item => {
            // ตรวจสอบ filter product
            if (product && item.name && !item.name.toLowerCase().includes(product.toLowerCase())) {
              return; // ข้าม item นี้
            }

            // ตรวจสอบ search
            if (search && !(
              (item.name && item.name.toLowerCase().includes(search.toLowerCase())) ||
              (sale.invoiceNo && sale.invoiceNo.toLowerCase().includes(search.toLowerCase())) ||
              (sale.staffName && sale.staffName.toLowerCase().includes(search.toLowerCase()))
            )) {
              return; // ข้าม item นี้
            }

            formattedSales.push({
              _id: sale._id,
              timestamp: sale.soldAt.toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit'
              }),
              items: [{
                product: item.name || 'สินค้า',
                model: item.name || '', // CashSale ไม่มี model แยก
                color: 'ไม่ระบุ', // CashSale ไม่มีข้อมูลสี
                capacity: 'ไม่ระบุ', // CashSale ไม่มีข้อมูล capacity
                price: item.price || item.total || 0
              }],
              branch: sale.branchCode || 'ไม่ระบุสาขา',
              salesperson: sale.staffName || (sale.salesperson?.employee?.name) || 'ไม่ระบุ'
            });
          });
        }
      });

      // แปลงข้อมูล InstallmentOrder
      installmentSales.forEach(order => {
        if (order.items && order.items.length > 0) {
          order.items.forEach(item => {
            // ตรวจสอบ filter product
            if (product && item.name && !item.name.toLowerCase().includes(product.toLowerCase())) {
              return; // ข้าม item นี้
            }

            // ตรวจสอบ search
            if (search && !(
              (item.name && item.name.toLowerCase().includes(search.toLowerCase())) ||
              (order.contractNo && order.contractNo.toLowerCase().includes(search.toLowerCase())) ||
              (order.staffName && order.staffName.toLowerCase().includes(search.toLowerCase()))
            )) {
              return; // ข้าม item นี้
            }

            formattedSales.push({
              _id: order._id,
              timestamp: order.createdAt.toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit'
              }),
              items: [{
                product: item.name || 'สินค้า',
                model: item.name || '',
                color: 'ไม่ระบุ',
                capacity: 'ไม่ระบุ',
                price: item.pricePayOff || item.downAmount || 0
              }],
              branch: order.branch_code || 'ไม่ระบุสาขา',
              salesperson: order.staffName || order.salesperson?.name || 'ไม่ระบุ'
            });
          });
        }
      });

      // เรียงลำดับตามเวลา
      formattedSales.sort((a, b) => {
        const timeA = a.timestamp.split(':').map(Number);
        const timeB = b.timestamp.split(':').map(Number);
        return (timeB[0] * 60 + timeB[1]) - (timeA[0] * 60 + timeA[1]);
      });

      // Pagination
      const skip = (page - 1) * limit;
      const paginatedSales = formattedSales.slice(skip, skip + parseInt(limit));

      res.json({
        success: true,
        data: {
          sales: paginatedSales,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(formattedSales.length / limit),
            totalItems: formattedSales.length,
            itemsPerPage: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Error getting today sales:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการขาย',
        error: error.message
      });
    }
  }

  // Get branch statistics
  static async getBranchStats(req, res) {
    try {
      // ตั้งค่าช่วงเวลาของวันนี้
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // ดึงข้อมูลการขายแยกตามสาขา
      const branchStats = await CashSale.aggregate([
        {
          $match: {
            soldAt: { $gte: startOfDay, $lte: endOfDay },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: '$branchCode',
            totalAmount: { $sum: '$totalAmount' },
            totalSales: { $sum: 1 },
            iphoneCount: {
              $sum: {
                $reduce: {
                  input: '$items',
                  initialValue: 0,
                  in: {
                    $add: [
                      '$$value',
                      {
                        $cond: [
                          { $regexMatch: { input: '$$this.name', regex: /iphone/i } },
                          '$$this.quantity',
                          0
                        ]
                      }
                    ]
                  }
                }
              }
            },
            ipadCount: {
              $sum: {
                $reduce: {
                  input: '$items',
                  initialValue: 0,
                  in: {
                    $add: [
                      '$$value',
                      {
                        $cond: [
                          { $regexMatch: { input: '$$this.name', regex: /ipad/i } },
                          '$$this.quantity',
                          0
                        ]
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      ]);

      // ดึงข้อมูลการขายผ่อนแยกตามสาขา
      const installmentBranchStats = await InstallmentOrder.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfDay, $lte: endOfDay },
            status: { $in: ['approved', 'active', 'ongoing', 'completed'] }
          }
        },
        {
          $group: {
            _id: '$branch_code',
            totalAmount: { $sum: { $ifNull: ['$finalTotalAmount', '$totalAmount'] } },
            totalSales: { $sum: 1 },
            iphoneCount: {
              $sum: {
                $reduce: {
                  input: '$items',
                  initialValue: 0,
                  in: {
                    $add: [
                      '$$value',
                      {
                        $cond: [
                          { $regexMatch: { input: '$$this.name', regex: /iphone/i } },
                          '$$this.qty',
                          0
                        ]
                      }
                    ]
                  }
                }
              }
            },
            ipadCount: {
              $sum: {
                $reduce: {
                  input: '$items',
                  initialValue: 0,
                  in: {
                    $add: [
                      '$$value',
                      {
                        $cond: [
                          { $regexMatch: { input: '$$this.name', regex: /ipad/i } },
                          '$$this.qty',
                          0
                        ]
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      ]);

      // รวมข้อมูลจากทั้งสองแหล่ง
      const combinedStats = {};

      branchStats.forEach(stat => {
        const branchCode = stat._id || 'ไม่ระบุสาขา';
        combinedStats[branchCode] = {
          _id: branchCode,
          totalAmount: stat.totalAmount || 0,
          totalSales: stat.totalSales || 0,
          iphoneCount: stat.iphoneCount || 0,
          ipadCount: stat.ipadCount || 0
        };
      });

      installmentBranchStats.forEach(stat => {
        const branchCode = stat._id || 'ไม่ระบุสาขา';
        if (combinedStats[branchCode]) {
          combinedStats[branchCode].totalAmount += stat.totalAmount || 0;
          combinedStats[branchCode].totalSales += stat.totalSales || 0;
          combinedStats[branchCode].iphoneCount += stat.iphoneCount || 0;
          combinedStats[branchCode].ipadCount += stat.ipadCount || 0;
        } else {
          combinedStats[branchCode] = {
            _id: branchCode,
            totalAmount: stat.totalAmount || 0,
            totalSales: stat.totalSales || 0,
            iphoneCount: stat.iphoneCount || 0,
            ipadCount: stat.ipadCount || 0
          };
        }
      });

      const finalStats = Object.values(combinedStats);

      res.json({
        success: true,
        data: finalStats
      });

    } catch (error) {
      console.error('Error getting branch stats:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถิติสาขา',
        error: error.message
      });
    }
  }

  // Get product distribution
  static async getProductDistribution(req, res) {
    try {
      // ตั้งค่าช่วงเวลาของวันนี้
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // ดึงข้อมูลจาก CashSale
      const cashSaleProducts = await CashSale.aggregate([
        {
          $match: {
            soldAt: { $gte: startOfDay, $lte: endOfDay },
            status: 'completed'
          }
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: {
              $cond: [
                { $regexMatch: { input: '$items.name', regex: /iphone/i } },
                'iPhone',
                {
                  $cond: [
                    { $regexMatch: { input: '$items.name', regex: /ipad/i } },
                    'iPad',
                    'อื่นๆ'
                  ]
                }
              ]
            },
            count: { $sum: '$items.quantity' }
          }
        }
      ]);

      // ดึงข้อมูลจาก InstallmentOrder
      const installmentProducts = await InstallmentOrder.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfDay, $lte: endOfDay },
            status: { $in: ['approved', 'active', 'ongoing', 'completed'] }
          }
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: {
              $cond: [
                { $regexMatch: { input: '$items.name', regex: /iphone/i } },
                'iPhone',
                {
                  $cond: [
                    { $regexMatch: { input: '$items.name', regex: /ipad/i } },
                    'iPad',
                    'อื่นๆ'
                  ]
                }
              ]
            },
            count: { $sum: '$items.qty' }
          }
        }
      ]);

      // รวมข้อมูล
      const combinedProducts = {};

      cashSaleProducts.forEach(product => {
        const productName = product._id;
        combinedProducts[productName] = (combinedProducts[productName] || 0) + product.count;
      });

      installmentProducts.forEach(product => {
        const productName = product._id;
        combinedProducts[productName] = (combinedProducts[productName] || 0) + product.count;
      });

      const productDistribution = Object.entries(combinedProducts).map(([key, value]) => ({
        _id: key,
        count: value
      }));

      res.json({
        success: true,
        data: productDistribution
      });

    } catch (error) {
      console.error('Error getting product distribution:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการกระจายสินค้า',
        error: error.message
      });
    }
  }

  // Get color distribution
  static async getColorDistribution(req, res) {
    try {
      // ตั้งค่าช่วงเวลาของวันนี้
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // พยายามดึงข้อมูลสีจากข้อมูลจริง
      const colorStats = await CashSale.aggregate([
        {
          $match: {
            soldAt: { $gte: startOfDay, $lte: endOfDay },
            status: 'completed'
          }
        },
        {
          $unwind: '$items'
        },
        {
          $lookup: {
            from: 'products',
            localField: 'items.product',
            foreignField: '_id',
            as: 'productInfo'
          }
        },
        {
          $group: {
            _id: {
              $ifNull: [
                { $arrayElemAt: ['$productInfo.color', 0] },
                'ไม่ระบุสี'
              ]
            },
            count: { $sum: '$items.quantity' }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      res.json({
        success: true,
        data: colorStats
      });

    } catch (error) {
      console.error('Error getting color distribution:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการกระจายสี',
        error: error.message
      });
    }
  }

  // Get top sales staff
  static async getTopSalesStaff(req, res) {
    try {
      // ตั้งค่าช่วงเวลาของวันนี้
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // ดึงข้อมูลจาก CashSale
      const cashSaleStaff = await CashSale.aggregate([
        {
          $match: {
            soldAt: { $gte: startOfDay, $lte: endOfDay },
            status: 'completed',
            staffName: { $ne: null, $ne: '' }
          }
        },
        {
          $group: {
            _id: '$staffName',
            totalAmount: { $sum: '$totalAmount' },
            totalUnits: {
              $sum: {
                $reduce: {
                  input: '$items',
                  initialValue: 0,
                  in: { $add: ['$$value', '$$this.quantity'] }
                }
              }
            }
          }
        }
      ]);

      // ดึงข้อมูลจาก InstallmentOrder
      const installmentStaff = await InstallmentOrder.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfDay, $lte: endOfDay },
            status: { $in: ['approved', 'active', 'ongoing', 'completed'] },
            staffName: { $ne: null, $ne: '' }
          }
        },
        {
          $group: {
            _id: '$staffName',
            totalAmount: { $sum: { $ifNull: ['$finalTotalAmount', '$totalAmount'] } },
            totalUnits: {
              $sum: {
                $reduce: {
                  input: '$items',
                  initialValue: 0,
                  in: { $add: ['$$value', '$$this.qty'] }
                }
              }
            }
          }
        }
      ]);

      // รวมข้อมูล
      const combinedStaff = {};

      cashSaleStaff.forEach(staff => {
        const staffName = staff._id;
        combinedStaff[staffName] = {
          _id: staffName,
          totalAmount: staff.totalAmount || 0,
          totalUnits: staff.totalUnits || 0
        };
      });

      installmentStaff.forEach(staff => {
        const staffName = staff._id;
        if (combinedStaff[staffName]) {
          combinedStaff[staffName].totalAmount += staff.totalAmount || 0;
          combinedStaff[staffName].totalUnits += staff.totalUnits || 0;
        } else {
          combinedStaff[staffName] = {
            _id: staffName,
            totalAmount: staff.totalAmount || 0,
            totalUnits: staff.totalUnits || 0
          };
        }
      });

      // เรียงลำดับตามยอดขาย
      const topSalesStaff = Object.values(combinedStaff)
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 5); // แสดงแค่ 5 คนแรก

      res.json({
        success: true,
        data: topSalesStaff
      });

    } catch (error) {
      console.error('Error getting top sales staff:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลพนักงานขายยอดเยี่ยม',
        error: error.message
      });
    }
  }

  // Get all branches
  static async getBranches(req, res) {
    try {
      const branches = await Branch.find({
        deleted_at: null,
        status: 'active'
      }).select('name branch_code');

      const branchNames = branches.map(branch => branch.name || branch.branch_code);

      res.json({
        success: true,
        data: branchNames
      });

    } catch (error) {
      console.error('Error getting branches:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสาขา',
        error: error.message
      });
    }
  }

  // Get all salespersons
  static async getSalespersons(req, res) {
    try {
      // ดึงพนักงานจาก CashSale
      const cashSalesPersons = await CashSale.distinct('staffName', {
        staffName: { $ne: null, $ne: '' }
      });

      // ดึงพนักงานจาก InstallmentOrder
      const installmentPersons = await InstallmentOrder.distinct('staffName', {
        staffName: { $ne: null, $ne: '' }
      });

      // รวมและกรองข้อมูลซ้ำ
      const allSalespersons = [...new Set([...cashSalesPersons, ...installmentPersons])];

      res.json({
        success: true,
        data: allSalespersons
      });

    } catch (error) {
      console.error('Error getting salespersons:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลพนักงานขาย',
        error: error.message
      });
    }
  }
}

module.exports = SalesDashboardController;
