/**
 * Repayment Routes - Dedicated routes for repayment system
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();

// Import models
const InstallmentOrder = require('../models/Installment/InstallmentOrder');
const InstallmentPayment = require('../models/Installment/InstallmentPayment');

// Import middleware
const authenticateToken = require('../middlewares/authJWT');

// GET /api/repayment/stats - For repayment.html
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Getting repayment stats...');

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Get basic counts
    const totalContracts = await InstallmentOrder.countDocuments({}) || 0;
    const activeContracts = await InstallmentOrder.countDocuments({
      status: { $in: ['ongoing', 'active'] }
    }) || 0;

    // Calculate overdue contracts
    const overdueContracts = await InstallmentOrder.countDocuments({
      status: { $in: ['ongoing', 'active'] },
      nextPaymentDate: { $lt: today }
    }) || 0;

    // Calculate monthly payments
    const monthlyPaymentsResult = await InstallmentPayment.aggregate([
      {
        $match: {
          paymentDate: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const monthlyPayments = monthlyPaymentsResult[0]?.total || 0;
    const paymentCount = monthlyPaymentsResult[0]?.count || 0;

    // Calculate on-time rate
    const onTimeRate = activeContracts > 0 ?
      Math.round(((activeContracts - overdueContracts) / activeContracts) * 100) : 0;

    // Mock growth data (can be calculated from historical data)
    const contractsGrowth = Math.random() * 10 - 5; // Random between -5 to 5
    const paymentsGrowth = Math.random() * 15 - 7.5; // Random between -7.5 to 7.5

    const stats = {
      totalContracts,
      monthlyPayments,
      overdueContracts,
      onTimeRate,
      contractsGrowth: Math.round(contractsGrowth * 10) / 10,
      paymentsGrowth: Math.round(paymentsGrowth * 10) / 10
    };

    console.log('✅ Repayment stats calculated:', stats);

    res.json({
      success: true,
      data: stats,
      message: 'ดึงข้อมูลสถิติการผ่อนชำระเรียบร้อยแล้ว'
    });

  } catch (error) {
    console.error('❌ Error getting repayment stats:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/repayment/contracts - Get contracts for repayment
router.get('/contracts', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Getting contracts for repayment...');

    const { search, status = 'active', overdue } = req.query;

    const query = { status };

    if (search) {
      query.$or = [
        { contractNo: { $regex: search, $options: 'i' } },
        { 'customer_info.firstName': { $regex: search, $options: 'i' } },
        { 'customer_info.lastName': { $regex: search, $options: 'i' } }
      ];
    }

    if (overdue === 'true') {
      const today = new Date();
      query.nextPaymentDate = { $lt: today };
      query.remainingBalance = { $gt: 0 };
    }

    const contracts = await InstallmentOrder.find(query)
      .populate('customer', 'individual.firstName individual.lastName individual.phone')
      .populate('branchId', 'name')
      .sort({ nextPaymentDate: 1, createdAt: -1 })
      .lean();

    const processedContracts = contracts.map(contract => {
      const today = new Date();
      const nextPayment = contract.nextPaymentDate ? new Date(contract.nextPaymentDate) : null;
      const overdueDays = nextPayment && nextPayment < today ?
        Math.floor((today - nextPayment) / (1000 * 60 * 60 * 24)) : 0;

      return {
        contractId: contract._id,
        contractNo: contract.contractNo,
        customerName: contract.customer?.individual ?
          `${contract.customer.individual.firstName || ''} ${contract.customer.individual.lastName || ''}`.trim() : 'ไม่ระบุ',
        customerPhone: contract.customer?.individual?.phone || '',
        totalAmount: contract.totalAmount || 0,
        remainingBalance: contract.remainingBalance || 0,
        monthlyPayment: contract.monthlyPayment || 0,
        nextPaymentDate: contract.nextPaymentDate,
        overdueDays,
        isOverdue: overdueDays > 0,
        status: contract.status,
        branchName: contract.branchId?.name || 'ไม่ระบุ'
      };
    });

    res.json({
      success: true,
      data: processedContracts,
      summary: {
        total: processedContracts.length,
        overdue: processedContracts.filter(c => c.isOverdue).length,
        totalDebt: processedContracts.reduce((sum, c) => sum + c.remainingBalance, 0)
      },
      message: `พบสัญญา ${processedContracts.length} รายการ`
    });

  } catch (error) {
    console.error('❌ Error getting contracts for repayment:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสัญญา: ' + error.message
    });
  }
});

// POST /api/repayment/payment - Record a payment
router.post('/payment', authenticateToken, async (req, res) => {
  try {
    console.log('💰 Recording repayment...');

    const { contractId, amount, paymentMethod, notes } = req.body;

    if (!contractId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลการชำระเงินไม่ครบถ้วน'
      });
    }

    // Find the contract
    const contract = await InstallmentOrder.findOne({ contractNo: contractId });
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบสัญญาดังกล่าว'
      });
    }

    // Create payment record
    const payment = new InstallmentPayment({
      contractId: contract._id,
      contractNo: contractId,
      amount: parseFloat(amount),
      paymentMethod: paymentMethod || 'cash',
      paymentDate: new Date(),
      notes: notes || '',
      createdBy: req.user.id,
      status: 'completed'
    });

    await payment.save();

    // Update contract balance
    const newBalance = Math.max(0, (contract.remainingBalance || contract.totalAmount) - parseFloat(amount));
    const updateData = {
      remainingBalance: newBalance,
      lastPaymentDate: new Date()
    };

    // Update status if fully paid
    if (newBalance <= 0) {
      updateData.status = 'completed';
    } else {
      // Calculate next payment date (add 1 month)
      const nextDate = new Date();
      nextDate.setMonth(nextDate.getMonth() + 1);
      updateData.nextPaymentDate = nextDate;
    }

    await InstallmentOrder.findByIdAndUpdate(contract._id, updateData);

    res.json({
      success: true,
      data: {
        paymentId: payment._id,
        contractNo: contractId,
        amountPaid: amount,
        remainingBalance: newBalance,
        status: newBalance <= 0 ? 'completed' : 'active'
      },
      message: 'บันทึกการชำระเงินเรียบร้อยแล้ว'
    });

  } catch (error) {
    console.error('❌ Error recording payment:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการบันทึกการชำระเงิน: ' + error.message
    });
  }
});

module.exports = router;