const PayoffApproval = require('../models/Load/PayoffApproval');
const Contract = require('../models/Load/Contract');
const BranchStock = require('../models/POS/BranchStock');
const ProductImage = require('../models/Stock/ProductImage');

// สร้างคำขออนุมัติ
exports.createApprovalRequest = async (req, res) => {
  try {
    // Debug logging for user object - commented out
    /*
    console.log('PayoffApproval DEBUG:', {
      user: req.user,
      userId: req.user?.id,
      hasId: !!req.user?.id
    });
    */

    const {
      contractNo,
      orderId,
      customerId,
      customerName,
      items,
      totalAmount,
      branchCode
    } = req.body;

    // ตรวจสอบว่ามีคำขออนุมัติอยู่แล้วหรือไม่
    const existing = await PayoffApproval.findOne({ contractNo }).lean();
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'มีคำขออนุมัติสำหรับสัญญานี้อยู่แล้ว'
      });
    }

    // ตรวจสอบว่ามี boxset หรือไม่
    const hasBoxset = items.some(item => item.productType === 'boxset');

    const approval = new PayoffApproval({
      contractNo,
      orderId,
      customerId,
      customerName,
      items,
      totalAmount,
      branchCode,
      requestedBy: req.user.id,
      hasBoxset
    });

    await approval.save();

    // ส่ง notification ไปยังผู้จัดการ
    const io = req.app.get('io');
    if (io) {
      io.emit('payoff-approval-needed', {
        approvalId: approval._id,
        contractNo,
        customerName,
        totalAmount,
        branchCode,
        hasBoxset,
        requestedBy: req.user.name || req.user.email
      });
    }

    res.json({
      success: true,
      data: approval,
      message: 'ส่งคำขออนุมัติเรียบร้อย'
    });

  } catch (error) {
    console.error('Create approval request error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// อนุมัติคำขอ
exports.approveRequest = async (req, res) => {
  try {
    const { approvalId } = req.params;
    const { notes } = req.body;

    const approval = await PayoffApproval.findById(approvalId).lean();
    if (!approval) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบคำขออนุมัติ'
      });
    }

    if (approval.status !== 'pending_approval') {
      return res.status(400).json({
        success: false,
        error: 'คำขออนุมัติถูกดำเนินการแล้ว'
      });
    }

    approval.status = 'approved';
    approval.approvedBy = req.user.id;
    approval.approvedAt = new Date();
    approval.notes = notes || '';

    await approval.save();

    // อัปเดตสถานะใน Contract เป็น approved
    await Contract.findOneAndUpdate(
      { contractNo: approval.contractNo },
      {
        status: 'approved',
        approvedBy: req.user.id,
        approvedAt: new Date()
      }
    );

    // ส่ง notification
    const io = req.app.get('io');
    if (io) {
      io.emit('payoff-approved', {
        contractNo: approval.contractNo,
        approvedBy: req.user.name || req.user.email,
        approvedAt: new Date(),
        hasBoxset: approval.hasBoxset
      });
    }

    res.json({
      success: true,
      data: approval,
      message: 'อนุมัติคำขอเรียบร้อย'
    });

  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ปฏิเสธคำขอ
exports.rejectRequest = async (req, res) => {
  try {
    const { approvalId } = req.params;
    const { rejectionReason, notes } = req.body;

    const approval = await PayoffApproval.findById(approvalId).lean();
    if (!approval) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบคำขออนุมัติ'
      });
    }

    if (approval.status !== 'pending_approval') {
      return res.status(400).json({
        success: false,
        error: 'คำขออนุมัติถูกดำเนินการแล้ว'
      });
    }

    approval.status = 'rejected';
    approval.rejectedBy = req.user.id;
    approval.rejectedAt = new Date();
    approval.rejectionReason = rejectionReason;
    approval.notes = notes || '';

    await approval.save();

    // อัปเดตสถานะใน Contract เป็น rejected
    await Contract.findOneAndUpdate(
      { contractNo: approval.contractNo },
      {
        status: 'rejected',
        rejectedBy: req.user.id,
        rejectedAt: new Date(),
        rejectionReason
      }
    );

    // ส่ง notification
    const io = req.app.get('io');
    if (io) {
      io.emit('payoff-rejected', {
        contractNo: approval.contractNo,
        rejectedBy: req.user.name || req.user.email,
        rejectionReason,
        rejectedAt: new Date()
      });
    }

    res.json({
      success: true,
      data: approval,
      message: 'ปฏิเสธคำขอเรียบร้อย'
    });

  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ดึงรายการคำขออนุมัติ
exports.getApprovalRequests = async (req, res) => {
  try {
    const { status, branchCode, hasBoxset } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (branchCode) filter.branchCode = branchCode;
    if (hasBoxset !== undefined) filter.hasBoxset = hasBoxset === 'true';

    const approvals = await PayoffApproval.find(filter).limit(100).lean()
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('rejectedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: approvals
    });

  } catch (error) {
    console.error('Get approval requests error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ดึงข้อมูลคำขออนุมัติตาม ID
exports.getApprovalById = async (req, res) => {
  try {
    const { approvalId } = req.params;

    const approval = await PayoffApproval.findById(approvalId).lean()
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('rejectedBy', 'name email');

    if (!approval) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบคำขออนุมัติ'
      });
    }

    res.json({
      success: true,
      data: approval
    });

  } catch (error) {
    console.error('Get approval by id error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ตรวจสอบสถานะการอนุมัติด้วย contract number
exports.getApprovalByContractNo = async (req, res) => {
  try {
    const { contractNo } = req.params;

    const approval = await PayoffApproval.findOne({ contractNo }).lean()
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('rejectedBy', 'name email');

    if (!approval) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบคำขออนุมัติสำหรับสัญญานี้'
      });
    }

    res.json({
      success: true,
      data: approval
    });

  } catch (error) {
    console.error('Get approval by contract error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
