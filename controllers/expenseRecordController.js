// controllers/expenseRecordController.js
const ExpenseRecord = require('../models/ExpenseRecord');
const mongoose = require('mongoose');

// สร้างรายการค่าใช้จ่ายใหม่
exports.createExpenseRecord = async (req, res) => {
  const io = req.app.get('io');
  try {
    console.log('Received expense record request:', {
      body: req.body,
      user: req.user,
      headers: req.headers
    });

    // Extract only fields that exist in the ExpenseRecord model
    const allowedFields = [
      'recordId', 'recordDate', 'expenseType', 'description', 'amount',
      'paymentMethod', 'referenceNumber', 'payee', 'accountCategory',
      'status', 'attachments', 'notes', 'department', 'project',
      'vat', 'withHoldingTax', 'netAmount', 'tags', 'createdBy'
    ];

    const data = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        data[field] = req.body[field];
      }
    });

    console.log('Filtered data:', data);

    // Set createdBy - generate a new ObjectId if not provided
    if (!data.createdBy && !req.user?.id) {
      data.createdBy = new mongoose.Types.ObjectId();
    } else if (req.user?.id) {
      data.createdBy = req.user.id;
    }

    // คำนวณ netAmount
    const amount = parseFloat(data.amount) || 0;
    const vat = parseFloat(data.vat) || 0;
    const withHoldingTax = parseFloat(data.withHoldingTax) || 0;
    data.netAmount = amount + vat - withHoldingTax;

    console.log('Data with calculations:', data);

    // Validate required fields
    if (!data.payee) {
      console.error('Missing payee field');
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุผู้รับเงิน/ผู้ขาย'
      });
    }

    if (!data.description) {
      console.error('Missing description field');
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุรายละเอียด'
      });
    }

    const expenseRecord = new ExpenseRecord(data);
    await expenseRecord.save();

    // ส่ง event ผ่าน Socket.IO
    io.emit('expenseRecordCreated', {
      id: expenseRecord._id,
      data: expenseRecord
    });

    res.status(201).json({
      success: true,
      data: expenseRecord,
      message: 'สร้างรายการค่าใช้จ่ายสำเร็จ'
    });
  } catch (error) {
    console.error('Error creating expense record:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// ดึงรายการค่าใช้จ่ายทั้งหมด
exports.getAllExpenseRecords = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      expenseType,
      status,
      search,
      department,
      project
    } = req.query;

    // สร้าง query object
    const query = {};

    // เงื่อนไขวันที่
    if (startDate || endDate) {
      query.recordDate = {};
      if (startDate) query.recordDate.$gte = new Date(startDate);
      if (endDate) query.recordDate.$lte = new Date(endDate);
    }

    // เงื่อนไขอื่นๆ
    if (expenseType) query.expenseType = expenseType;
    if (status) query.status = status;
    if (department) query.department = department;
    if (project) query.project = project;

    // ค้นหาข้อความ
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { payee: { $regex: search, $options: 'i' } },
        { recordId: { $regex: search, $options: 'i' } }
      ];
    }

    // คำนวณ pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // ดึงข้อมูล
    const expenseRecords = await ExpenseRecord.find(query)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ recordDate: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // นับจำนวนทั้งหมด
    const totalRecords = await ExpenseRecord.countDocuments(query);

    // คำนวณสถิติ
    const statistics = await calculateExpenseStatistics(query);

    res.json({
      success: true,
      data: expenseRecords,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRecords / parseInt(limit)),
        totalRecords,
        hasNext: skip + expenseRecords.length < totalRecords,
        hasPrev: parseInt(page) > 1
      },
      statistics
    });
  } catch (error) {
    console.error('Error fetching expense records:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
    });
  }
};

// ดึงรายการค่าใช้จ่ายตาม ID
exports.getExpenseRecordById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID ไม่ถูกต้อง'
      });
    }

    const expenseRecord = await ExpenseRecord.findById(id)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .lean();

    if (!expenseRecord) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบรายการค่าใช้จ่าย'
      });
    }

    res.json({
      success: true,
      data: expenseRecord
    });
  } catch (error) {
    console.error('Error fetching expense record:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
    });
  }
};

// อัปเดตรายการค่าใช้จ่าย
exports.updateExpenseRecord = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;

    console.log('Update request for ID:', id);
    console.log('Update data received:', req.body);

    // Handle both MongoDB _id and recordId
    let query = {};
    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { _id: id };
    } else {
      query = { recordId: id };
    }

    const currentRecord = await ExpenseRecord.findOne(query);

    if (!currentRecord) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบรายการค่าใช้จ่าย'
      });
    }

    // Prepare update data
    const updateData = { ...req.body };

    // คำนวณ netAmount ใหม่
    const amount = parseFloat(updateData.amount) || parseFloat(currentRecord.amount) || 0;
    const vat = parseFloat(updateData.vat) || parseFloat(currentRecord.vat) || 0;
    const withHoldingTax = parseFloat(updateData.withHoldingTax) || parseFloat(currentRecord.withHoldingTax) || 0;

    updateData.amount = amount;
    updateData.vat = vat;
    updateData.withHoldingTax = withHoldingTax;
    updateData.netAmount = amount + vat - withHoldingTax;

    console.log('Calculated amounts:', {
      amount: updateData.amount,
      vat: updateData.vat,
      withHoldingTax: updateData.withHoldingTax,
      netAmount: updateData.netAmount
    });

    // เพิ่มข้อมูลการแก้ไข
    updateData.lastModified = {
      date: new Date(),
      by: req.user?.id || updateData.lastModified?.by
    };

    const expenseRecord = await ExpenseRecord.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email')
     .populate('approvedBy', 'name email');

    if (!expenseRecord) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบรายการค่าใช้จ่าย'
      });
    }

    // ส่ง event ผ่าน Socket.IO
    io.emit('expenseRecordUpdated', {
      id: expenseRecord._id,
      data: expenseRecord
    });

    res.json({
      success: true,
      data: expenseRecord,
      message: 'อัปเดตรายการค่าใช้จ่ายสำเร็จ'
    });
  } catch (error) {
    console.error('Error updating expense record:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// ลบรายการค่าใช้จ่าย
exports.deleteExpenseRecord = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID ไม่ถูกต้อง'
      });
    }

    const expenseRecord = await ExpenseRecord.findByIdAndDelete(id);

    if (!expenseRecord) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบรายการค่าใช้จ่าย'
      });
    }

    // ส่ง event ผ่าน Socket.IO
    io.emit('expenseRecordDeleted', {
      id: expenseRecord._id,
      data: expenseRecord
    });

    res.json({
      success: true,
      message: 'ลบรายการค่าใช้จ่ายสำเร็จ'
    });
  } catch (error) {
    console.error('Error deleting expense record:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการลบข้อมูล'
    });
  }
};

// อนุมัติรายการค่าใช้จ่าย
exports.approveExpenseRecord = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID ไม่ถูกต้อง'
      });
    }

    const expenseRecord = await ExpenseRecord.findById(id);

    if (!expenseRecord) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบรายการค่าใช้จ่าย'
      });
    }

    await expenseRecord.approve(userId);

    // ส่ง event ผ่าน Socket.IO
    io.emit('expenseRecordApproved', {
      id: expenseRecord._id,
      data: expenseRecord
    });

    res.json({
      success: true,
      data: expenseRecord,
      message: 'อนุมัติรายการค่าใช้จ่ายสำเร็จ'
    });
  } catch (error) {
    console.error('Error approving expense record:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการอนุมัติ'
    });
  }
};

// ปฏิเสธรายการค่าใช้จ่าย
exports.rejectExpenseRecord = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID ไม่ถูกต้อง'
      });
    }

    const expenseRecord = await ExpenseRecord.findById(id);

    if (!expenseRecord) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบรายการค่าใช้จ่าย'
      });
    }

    await expenseRecord.reject(userId);

    // ส่ง event ผ่าน Socket.IO
    io.emit('expenseRecordRejected', {
      id: expenseRecord._id,
      data: expenseRecord
    });

    res.json({
      success: true,
      data: expenseRecord,
      message: 'ปฏิเสธรายการค่าใช้จ่ายสำเร็จ'
    });
  } catch (error) {
    console.error('Error rejecting expense record:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการปฏิเสธ'
    });
  }
};

// ดึงรายงานค่าใช้จ่าย
exports.getExpenseReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'type' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'ต้องระบุวันที่เริ่มต้นและสิ้นสุด'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    let reportData;

    if (groupBy === 'type') {
      reportData = await ExpenseRecord.getSummaryByType(start, end);
    } else if (groupBy === 'month') {
      reportData = await ExpenseRecord.getMonthlySummary(start.getFullYear());
    } else {
      // รายงานตามวันที่
      reportData = await ExpenseRecord.aggregate([
        {
          $match: {
            recordDate: { $gte: start, $lte: end },
            status: 'อนุมัติแล้ว'
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$recordDate' } },
            totalAmount: { $sum: '$netAmount' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);
    }

    res.json({
      success: true,
      data: reportData,
      period: { startDate, endDate },
      groupBy
    });
  } catch (error) {
    console.error('Error generating expense report:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการสร้างรายงาน'
    });
  }
};

// ฟังก์ชันคำนวณสถิติ
async function calculateExpenseStatistics(query) {
  try {
    const pipeline = [
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$netAmount' },
          totalRecords: { $sum: 1 },
          averageAmount: { $avg: '$netAmount' },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'รออนุมัติ'] }, 1, 0] }
          },
          approvedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'อนุมัติแล้ว'] }, 1, 0] }
          },
          rejectedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'ถูกปฏิเสธ'] }, 1, 0] }
          }
        }
      }
    ];

    const result = await ExpenseRecord.aggregate(pipeline);
    return result[0] || {
      totalAmount: 0,
      totalRecords: 0,
      averageAmount: 0,
      pendingCount: 0,
      approvedCount: 0,
      rejectedCount: 0
    };
  } catch (error) {
    console.error('Error calculating statistics:', error);
    return {
      totalAmount: 0,
      totalRecords: 0,
      averageAmount: 0,
      pendingCount: 0,
      approvedCount: 0,
      rejectedCount: 0
    };
  }
}
