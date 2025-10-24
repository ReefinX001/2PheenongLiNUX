const InstallmentOrder = require('../models/Installment/InstallmentOrder');

// GET /api/loan/credit-approval/pending
exports.getPendingApprovals = async (req, res) => {
  try {
    const pending = await InstallmentOrder.find({
      status: 'pending'
    }).populate('customer').lean();

    res.json({
      success: true,
      data: pending,
      total: pending.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};