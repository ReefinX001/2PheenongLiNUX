/**
 * Extended Loan Integration Controller Functions
 * Additional handlers for loan system integration
 */

const InstallmentOrder = require('../../models/Installment/InstallmentOrder');
const InstallmentPayment = require('../../models/Installment/InstallmentPayment');
const BadDebtCriteria = require('../../models/BadDebtCriteria');
const mongoose = require('mongoose');

// Get installment history
exports.getInstallmentHistory = async (req, res) => {
  try {
    const { status, customerId, startDate, endDate, limit = 100 } = req.query;

    const query = { deleted_at: null };
    if (status === 'overdue') {
      query['paymentSchedule.status'] = 'overdue';
    } else if (status) {
      query.status = status;
    }
    if (customerId) query.customer = customerId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const orders = await InstallmentOrder.find(query)
      .populate('customer')
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const history = orders.map(order => ({
      id: order._id,
      contractNo: order.contractNo,
      customerName: order.customer?.displayName || formatCustomerName(order.customer_info),
      customerId: order.customer?._id,
      totalAmount: order.totalAmount,
      paidAmount: order.paidAmount || 0,
      remainingAmount: order.remainingAmount || (order.totalAmount - (order.paidAmount || 0)),
      installmentMonths: order.installmentMonths || order.installmentCount,
      status: order.status,
      nextDueDate: getNextDueDate(order),
      overdueAmount: calculateOverdueAmount(order),
      overdueDays: calculateOverdueDays(order),
      createdAt: order.createdAt
    }));

    res.json({
      success: true,
      data: history,
      total: history.length
    });
  } catch (error) {
    console.error('Error getting installment history:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงประวัติการผ่อนชำระ',
      error: error.message
    });
  }
};

// Process payment
exports.processPayment = async (req, res) => {
  try {
    const { contractId, amount, paymentMethod, installmentNo, notes } = req.body;

    // Find contract
    const contract = await InstallmentOrder.findById(contractId);
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลสัญญา'
      });
    }

    // Extract customer information from contract
    let customerName = 'ไม่ระบุ';
    let customerPhone = 'ไม่ระบุ';

    if (contract.customer_info) {
      const { prefix = '', firstName = '', lastName = '', phone = '' } = contract.customer_info;
      customerName = `${prefix} ${firstName} ${lastName}`.trim() || 'ไม่ระบุ';
      customerPhone = phone || 'ไม่ระบุ';
    }

    // Create payment record
    const payment = await InstallmentPayment.create({
      contractId: contract._id,
      contractNumber: contract.contractNo || contract.contractNumber,
      customerId: contract.customer,
      customerName: customerName,
      customerPhone: customerPhone,
      installmentNumber: installmentNo || 1,
      amount: amount,
      paymentMethod: paymentMethod || 'cash',
      paymentDate: new Date(),
      status: 'paid',
      notes: notes,
      branchCode: contract.branch_code || '00000',
      branchName: contract.branch_name || 'สำนักงานใหญ่',
      recordedBy: req.user?._id,
      recordedByName: req.user?.name || 'ระบบ'
    });

    // Update payment schedule if specified
    if (installmentNo && contract.paymentSchedule) {
      const scheduleIndex = contract.paymentSchedule.findIndex(
        s => s.installmentNo === installmentNo
      );
      if (scheduleIndex !== -1) {
        contract.paymentSchedule[scheduleIndex].status = 'paid';
        contract.paymentSchedule[scheduleIndex].paidDate = new Date();
        contract.paymentSchedule[scheduleIndex].paidAmount = amount;
      }
    }

    // Update contract totals
    contract.paidAmount = (contract.paidAmount || 0) + amount;
    contract.lastPaymentDate = new Date();

    // Check if fully paid
    if (contract.paidAmount >= contract.totalAmount) {
      contract.status = 'completed';
      contract.completedAt = new Date();
    }

    await contract.save();

    res.json({
      success: true,
      message: 'บันทึกการชำระเงินสำเร็จ',
      data: {
        paymentId: payment._id,
        receiptNo: payment.receiptNo || payment.paymentId,
        contractNo: contract.contractNo,
        amount: amount,
        remainingAmount: contract.totalAmount - contract.paidAmount,
        status: contract.status
      }
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการบันทึกการชำระเงิน',
      error: error.message
    });
  }
};

// Get dashboard debtors
exports.getDashboardDebtors = async (req, res) => {
  try {
    const debtors = await InstallmentOrder.find({
      status: { $in: ['overdue', 'defaulted'] },
      deleted_at: null
    }).populate('customer');

    const debtorList = debtors.map(contract => ({
      id: contract._id,
      contractNo: contract.contractNo,
      customerName: contract.customer?.displayName || formatCustomerName(contract.customer_info),
      phone: contract.customer?.phone || contract.customer_info?.phone,
      overdueAmount: calculateOverdueAmount(contract),
      overdueDays: calculateOverdueDays(contract),
      totalDebt: contract.remainingAmount || (contract.totalAmount - (contract.paidAmount || 0)),
      lastPaymentDate: contract.lastPaymentDate,
      branch: contract.branch_code
    }));

    res.json({
      success: true,
      data: debtorList,
      total: debtorList.length
    });
  } catch (error) {
    console.error('Error getting dashboard debtors:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลลูกหนี้',
      error: error.message
    });
  }
};

// Get claim items
exports.getClaimItems = async (req, res) => {
  try {
    // Find contracts that are fully paid but items not delivered
    const contracts = await InstallmentOrder.find({
      status: 'completed',
      itemsDelivered: { $ne: true },
      deleted_at: null
    }).populate('customer');

    const claimItems = contracts.map(contract => ({
      id: contract._id,
      contractNo: contract.contractNo,
      contractId: contract._id,
      customerName: contract.customer?.displayName || formatCustomerName(contract.customer_info),
      phone: contract.customer?.phone || contract.customer_info?.phone,
      products: contract.items?.map(item => ({
        name: item.productName,
        quantity: item.quantity,
        imei: item.imei
      })),
      paymentCompleteDate: contract.completedAt || contract.updatedAt,
      lastPaymentDate: contract.lastPaymentDate,
      branch: contract.branch_code,
      status: 'ready_for_delivery'
    }));

    res.json({
      success: true,
      data: claimItems,
      total: claimItems.length
    });
  } catch (error) {
    console.error('Error getting claim items:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสินค้าพร้อมส่งมอบ',
      error: error.message
    });
  }
};

// Get credit approved
exports.getCreditApproved = async (req, res) => {
  try {
    const pending = await InstallmentOrder.find({
      status: 'pending',
      creditApproved: { $ne: true },
      deleted_at: null
    }).populate('customer');

    const pendingApprovals = pending.map(order => ({
      id: order._id,
      contractNo: order.contractNo,
      customerName: order.customer?.displayName || formatCustomerName(order.customer_info),
      amount: order.totalAmount,
      requestDate: order.createdAt,
      creditScore: order.customer?.creditScore || 0,
      monthlyIncome: order.customer?.monthlyIncome || 0,
      debtToIncomeRatio: calculateDebtToIncomeRatio(order)
    }));

    res.json({
      success: true,
      data: pendingApprovals,
      total: pendingApprovals.length
    });
  } catch (error) {
    console.error('Error getting credit approvals:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรออนุมัติเครดิต',
      error: error.message
    });
  }
};

// Sync installment data
exports.syncInstallmentData = async (req, res) => {
  try {
    const { installmentOrderId } = req.params;

    const order = await InstallmentOrder.findById(installmentOrderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลคำสั่งผ่อนชำระ'
      });
    }

    // Sync logic here
    order.lastSyncedAt = new Date();
    await order.save();

    res.json({
      success: true,
      message: 'ซิงค์ข้อมูลสำเร็จ',
      data: {
        orderId: order._id,
        contractNo: order.contractNo,
        syncedAt: order.lastSyncedAt
      }
    });
  } catch (error) {
    console.error('Error syncing installment data:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการซิงค์ข้อมูล',
      error: error.message
    });
  }
};

// Helper Functions
function formatCustomerName(customerInfo) {
  if (!customerInfo) return 'N/A';
  return `${customerInfo.prefix || ''} ${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim() || 'N/A';
}

function calculateOverdueAmount(contract) {
  if (!contract.paymentSchedule || !Array.isArray(contract.paymentSchedule)) return 0;

  const now = new Date();
  return contract.paymentSchedule
    .filter(schedule =>
      schedule.status !== 'paid' &&
      new Date(schedule.dueDate) < now
    )
    .reduce((sum, schedule) => sum + (schedule.amount || 0), 0);
}

function calculateOverdueDays(contract) {
  if (!contract.paymentSchedule || !Array.isArray(contract.paymentSchedule)) return 0;

  const now = new Date();
  const overdueSchedules = contract.paymentSchedule
    .filter(schedule =>
      schedule.status !== 'paid' &&
      new Date(schedule.dueDate) < now
    )
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  if (overdueSchedules.length === 0) return 0;

  const oldestDue = new Date(overdueSchedules[0].dueDate);
  return Math.floor((now - oldestDue) / (1000 * 60 * 60 * 24));
}

function getNextDueDate(contract) {
  if (!contract.paymentSchedule || !Array.isArray(contract.paymentSchedule)) return null;

  const now = new Date();
  const nextSchedule = contract.paymentSchedule
    .filter(schedule =>
      schedule.status !== 'paid' &&
      new Date(schedule.dueDate) >= now
    )
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];

  return nextSchedule ? nextSchedule.dueDate : null;
}

function calculateDebtToIncomeRatio(order) {
  const monthlyIncome = order.customer?.monthlyIncome || 0;
  if (monthlyIncome === 0) return 0;

  const monthlyPayment = order.monthlyPayment || 0;
  return ((monthlyPayment / monthlyIncome) * 100).toFixed(2);
}

module.exports = exports;