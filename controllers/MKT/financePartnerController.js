// controllers/MKT/financePartnerController.js
const FinancePartner = require('../../models/MKT/FinancePartner');
const mongoose = require('mongoose');

// Get all finance partners
exports.getAllFinancePartners = async (req, res) => {
  try {
    const {
      branchCode,
      serviceType,
      type,
      active,
      search,
      page = 1,
      limit = 50,
      sort = 'name'
    } = req.query;

    // Build query
    const query = {};

    // Active filter
    if (active !== undefined) {
      query.isActive = active === 'true';
    }

    // Branch filter
    if (branchCode && branchCode !== 'all') {
      query.$or = [
        { applicableBranches: { $size: 0 } }, // ทุกสาขา
        { applicableBranches: branchCode }
      ];
    }

    // Service type filter
    if (serviceType && serviceType !== 'all') {
      query.services = serviceType;
    }

    // Type filter
    if (type && type !== 'all') {
      query.type = type;
    }

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { nameEn: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortQuery = sort === 'name' ? { name: 1 } :
                     sort === 'code' ? { code: 1 } :
                     sort === 'type' ? { type: 1, name: 1 } :
                     sort === 'created' ? { createdAt: -1 } :
                     { name: 1 };

    const [financePartners, totalCount] = await Promise.all([
      FinancePartner.find(query)
        .select('-apiConfig.apiKey') // Hide sensitive data
        .sort(sortQuery)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      FinancePartner.countDocuments(query)
    ]);

    res.json({
      status: 'success',
      data: financePartners,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalItems: totalCount,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: `ไม่สามารถดึงข้อมูล Finance Partners: ${err.message}`
    });
  }
};

// Get active finance partners (for POS/frontend use)
exports.getActiveFinancePartners = async (req, res) => {
  try {
    const { branchCode, serviceType } = req.query;

    const financePartners = await FinancePartner.findActivePartners({
      branchCode,
      serviceType
    });

    const formattedPartners = financePartners.map(partner => ({
      code: partner.code,
      name: partner.name,
      nameEn: partner.nameEn,
      type: partner.type,
      services: partner.services,
      interestRates: partner.interestRates.filter(rate => rate.isActive),
      approvalRate: partner.approvalRate,
      processingTime: partner.approvalCriteria?.processingTime
    }));

    res.json({
      status: 'success',
      data: formattedPartners,
      count: formattedPartners.length
    });
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: `ไม่สามารถดึงข้อมูล Finance Partners ที่ใช้งานได้: ${err.message}`
    });
  }
};

// Get finance partner by ID
exports.getFinancePartnerById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'ID ไม่ถูกต้อง'
      });
    }

    const financePartner = await FinancePartner.findById(id)
      .select('-apiConfig.apiKey') // Hide sensitive data
      .populate('createdBy', 'name username')
      .lean();

    if (!financePartner) {
      return res.status(404).json({
        status: 'fail',
        message: 'ไม่พบ Finance Partner'
      });
    }

    res.json({
      status: 'success',
      data: financePartner
    });
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: `ไม่สามารถดึงข้อมูล Finance Partner: ${err.message}`
    });
  }
};

// Create new finance partner
exports.createFinancePartner = async (req, res) => {
  try {
    const partnerData = {
      ...req.body,
      createdBy: req.user?.id
    };

    const financePartner = new FinancePartner(partnerData);
    await financePartner.save();

    res.status(201).json({
      status: 'success',
      data: financePartner,
      message: 'สร้าง Finance Partner สำเร็จ'
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        status: 'fail',
        message: 'รหัส Finance Partner นี้มีอยู่แล้ว'
      });
    }

    res.status(400).json({
      status: 'fail',
      message: `ไม่สามารถสร้าง Finance Partner: ${err.message}`
    });
  }
};

// Update finance partner
exports.updateFinancePartner = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'ID ไม่ถูกต้อง'
      });
    }

    const updateData = { ...req.body };
    delete updateData._id; // Remove _id from update data

    const financePartner = await FinancePartner.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-apiConfig.apiKey');

    if (!financePartner) {
      return res.status(404).json({
        status: 'fail',
        message: 'ไม่พบ Finance Partner'
      });
    }

    res.json({
      status: 'success',
      data: financePartner,
      message: 'อัพเดท Finance Partner สำเร็จ'
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        status: 'fail',
        message: 'รหัส Finance Partner นี้มีอยู่แล้ว'
      });
    }

    res.status(400).json({
      status: 'fail',
      message: `ไม่สามารถอัพเดท Finance Partner: ${err.message}`
    });
  }
};

// Delete finance partner
exports.deleteFinancePartner = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'ID ไม่ถูกต้อง'
      });
    }

    const financePartner = await FinancePartner.findByIdAndDelete(id);

    if (!financePartner) {
      return res.status(404).json({
        status: 'fail',
        message: 'ไม่พบ Finance Partner'
      });
    }

    res.json({
      status: 'success',
      message: 'ลบ Finance Partner สำเร็จ'
    });
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: `ไม่สามารถลบ Finance Partner: ${err.message}`
    });
  }
};

// Toggle finance partner active status
exports.toggleFinancePartner = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'ID ไม่ถูกต้อง'
      });
    }

    const financePartner = await FinancePartner.findById(id);

    if (!financePartner) {
      return res.status(404).json({
        status: 'fail',
        message: 'ไม่พบ Finance Partner'
      });
    }

    financePartner.isActive = !financePartner.isActive;
    await financePartner.save();

    res.json({
      status: 'success',
      data: {
        id: financePartner._id,
        isActive: financePartner.isActive
      },
      message: `${financePartner.isActive ? 'เปิด' : 'ปิด'}ใช้งาน Finance Partner สำเร็จ`
    });
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: `ไม่สามารถเปลี่ยนสถานะ Finance Partner: ${err.message}`
    });
  }
};

// Get finance partner statistics
exports.getFinancePartnerStats = async (req, res) => {
  try {
    const { branchCode, type, dateRange } = req.query;

    // Build match query
    const matchQuery = {};
    if (branchCode && branchCode !== 'all') {
      matchQuery.$or = [
        { applicableBranches: { $size: 0 } },
        { applicableBranches: branchCode }
      ];
    }
    if (type && type !== 'all') {
      matchQuery.type = type;
    }

    const stats = await FinancePartner.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalPartners: { $sum: 1 },
          activePartners: {
            $sum: { $cond: ['$isActive', 1, 0] }
          },
          totalApplications: { $sum: '$stats.totalApplications' },
          totalApprovals: { $sum: '$stats.approvedApplications' },
          totalRejections: { $sum: '$stats.rejectedApplications' },
          avgApprovalTime: { $avg: '$stats.averageApprovalTime' },
          partnersByType: {
            $push: {
              type: '$type',
              name: '$name',
              approvalRate: {
                $cond: [
                  { $eq: ['$stats.totalApplications', 0] },
                  0,
                  {
                    $multiply: [
                      { $divide: ['$stats.approvedApplications', '$stats.totalApplications'] },
                      100
                    ]
                  }
                ]
              }
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalPartners: 0,
      activePartners: 0,
      totalApplications: 0,
      totalApprovals: 0,
      totalRejections: 0,
      avgApprovalTime: 0,
      partnersByType: []
    };

    // Calculate overall approval rate
    result.overallApprovalRate = result.totalApplications > 0
      ? ((result.totalApprovals / result.totalApplications) * 100).toFixed(2)
      : 0;

    res.json({
      status: 'success',
      data: result
    });
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: `ไม่สามารถดึงสถิติ Finance Partner: ${err.message}`
    });
  }
};

// Update finance partner stats (for API integration)
exports.updateFinancePartnerStats = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, approvalTime } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'ID ไม่ถูกต้อง'
      });
    }

    const financePartner = await FinancePartner.findById(id);

    if (!financePartner) {
      return res.status(404).json({
        status: 'fail',
        message: 'ไม่พบ Finance Partner'
      });
    }

    await financePartner.updateStats(action, approvalTime);

    res.json({
      status: 'success',
      data: {
        stats: financePartner.stats,
        approvalRate: financePartner.approvalRate
      },
      message: 'อัพเดทสถิติสำเร็จ'
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: `ไม่สามารถอัพเดทสถิติ: ${err.message}`
    });
  }
};

// Get finance partners by service type
exports.getPartnersByService = async (req, res) => {
  try {
    const { serviceType, branchCode } = req.query;

    if (!serviceType) {
      return res.status(400).json({
        status: 'fail',
        message: 'กรุณาระบุประเภทบริการ'
      });
    }

    const partners = await FinancePartner.findActivePartners({
      serviceType,
      branchCode
    });

    res.json({
      status: 'success',
      data: partners.map(partner => ({
        code: partner.code,
        name: partner.name,
        type: partner.type,
        interestRates: partner.interestRates.filter(
          rate => rate.serviceType === serviceType && rate.isActive
        ),
        approvalCriteria: partner.approvalCriteria,
        approvalRate: partner.approvalRate
      }))
    });
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: `ไม่สามารถดึงข้อมูลพาร์ทเนอร์ตามบริการ: ${err.message}`
    });
  }
};