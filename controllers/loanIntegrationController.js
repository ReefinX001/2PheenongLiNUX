/**
 * Loan Integration Controller
 * Provides compatibility layer between Installment System (Step 1-4) and Loan System
 */

const mongoose = require('mongoose');
const InstallmentOrder = require('../models/Installment/InstallmentOrder');
const InstallmentPayment = require('../models/Installment/InstallmentPayment');
const Customer = require('../models/Customer/Customer');

// Safe import of BadDebtCriteria to avoid OverwriteModelError
let BadDebtCriteria;
try {
  BadDebtCriteria = mongoose.model('BadDebtCriteria');
} catch (error) {
  BadDebtCriteria = require('../models/Installment/BadDebtCriteria');
}

class LoanIntegrationController {
  /**
   * Get contracts for loan system (compatible with repayment.html)
   * GET /api/loan/contracts
   */
  static async getContracts(req, res) {
    try {
      const { status, customerId, limit = 100, skip = 0 } = req.query;

      // Build query
      const query = { deleted_at: null };
      if (status) query.status = status;
      if (customerId) query.customer = customerId;

      // Get contracts from InstallmentOrder
      const contracts = await InstallmentOrder.find(query)
        .populate('customer')
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .sort({ createdAt: -1 });

      // Transform to loan format
      const loanContracts = contracts.map(contract => ({
        id: contract._id,
        contractId: contract._id,
        contractNo: contract.contractNo,
        customerName: contract.customer?.displayName || contract.customer_info?.firstName + ' ' + contract.customer_info?.lastName,
        customerId: contract.customer?._id,
        phone: contract.customer?.phone || contract.customer_info?.phone,
        totalAmount: contract.totalAmount,
        remainingAmount: contract.remainingAmount || contract.totalAmount,
        monthlyPayment: contract.monthlyPayment,
        installmentMonths: contract.installmentMonths || contract.installmentCount,
        status: mapInstallmentStatusToLoan(contract.status),
        dueDate: contract.nextDueDate || contract.paymentSchedule?.[0]?.dueDate,
        createdAt: contract.createdAt,
        branch: contract.branch_code || contract.branch,
        planType: contract.planType,
        items: contract.items?.map(item => ({
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          imei: item.imei
        }))
      }));

      res.json({
        success: true,
        data: loanContracts,
        total: await InstallmentOrder.countDocuments(query)
      });
    } catch (error) {
      console.error('Error getting loan contracts:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get single contract details
   * GET /api/loan/installment/contract/:contractId
   */
  static async getContractById(req, res) {
    try {
      const { contractId } = req.params;

      // Support both contractNo and _id
      const query = mongoose.Types.ObjectId.isValid(contractId)
        ? { _id: contractId }
        : { contractNo: contractId };

      const contract = await InstallmentOrder.findOne(query)
        .populate('customer');

      if (!contract) {
        return res.status(404).json({ success: false, error: 'Contract not found' });
      }

      // Get payment history
      const payments = await InstallmentPayment.find({
        contractId: contract._id
      }).sort({ paymentDate: -1 });

      // Transform to loan format
      const loanContract = {
        id: contract._id,
        contractNo: contract.contractNo,
        customer: {
          id: contract.customer?._id,
          name: contract.customer?.displayName || `${contract.customer_info?.firstName} ${contract.customer_info?.lastName}`,
          phone: contract.customer?.phone || contract.customer_info?.phone,
          address: contract.customer_info?.address,
          taxId: contract.customer?.individual?.taxId || contract.customer_info?.taxId
        },
        loanDetails: {
          totalAmount: contract.totalAmount,
          downPayment: contract.downPayment,
          financedAmount: contract.financedAmount,
          interestRate: contract.interestRate,
          monthlyPayment: contract.monthlyPayment,
          installmentMonths: contract.installmentMonths || contract.installmentCount
        },
        paymentSchedule: contract.paymentSchedule?.map((schedule, index) => ({
          installmentNo: schedule.installmentNo || index + 1,
          dueDate: schedule.dueDate,
          amount: schedule.amount,
          principal: schedule.principal,
          interest: schedule.interest,
          status: schedule.status,
          paidDate: schedule.paidDate,
          paidAmount: schedule.paidAmount
        })),
        paymentHistory: payments.map(payment => ({
          id: payment._id,
          paymentDate: payment.paymentDate,
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          receiptNo: payment.receiptNumber || payment.receiptNo,
          status: payment.status
        })),
        status: mapInstallmentStatusToLoan(contract.status),
        createdAt: contract.createdAt,
        updatedAt: contract.updatedAt
      };

      res.json({ success: true, data: loanContract });
    } catch (error) {
      console.error('Error getting contract by ID:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get installment history for loan system
   * GET /api/loan/installment/history
   */
  static async getInstallmentHistory(req, res) {
    try {
      const { status, customerId, startDate, endDate, limit = 100 } = req.query;

      const query = {};
      if (status === 'overdue') {
        query['paymentSchedule.status'] = 'overdue';
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
        customerName: order.customer?.displayName || 'N/A',
        customerId: order.customer?._id,
        totalAmount: order.totalAmount,
        paidAmount: order.paidAmount || 0,
        remainingAmount: order.remainingAmount || order.totalAmount,
        installmentMonths: order.installmentMonths,
        status: mapInstallmentStatusToLoan(order.status),
        nextDueDate: order.nextDueDate,
        overdueAmount: calculateOverdueAmount(order),
        overdueDays: calculateOverdueDays(order),
        createdAt: order.createdAt
      }));

      res.json({ success: true, data: history });
    } catch (error) {
      console.error('Error getting installment history:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Process payment for loan system
   * POST /api/loan/installment/payment
   */
  static async processPayment(req, res) {
    try {
      const { contractId, amount, paymentMethod, installmentNo } = req.body;

      // Find contract
      const contract = await InstallmentOrder.findById(contractId);
      if (!contract) {
        return res.status(404).json({ success: false, error: 'Contract not found' });
      }

      // Create payment record
      const payment = await InstallmentPayment.create({
        contractId: contract._id,
        contractNumber: contract.contractNo,
        customerId: contract.customer,
        installmentNumber: installmentNo || 1,
        amount: amount,
        paymentMethod: paymentMethod || 'cash',
        paymentDate: new Date(),
        status: 'paid',
        branchCode: contract.branch_code || '00000',
        recordedBy: req.user?._id
      });

      // Update payment schedule
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
      if (contract.paidAmount >= contract.totalAmount) {
        contract.status = 'completed';
      }

      await contract.save();

      res.json({
        success: true,
        data: {
          paymentId: payment._id,
          receiptNo: payment.receiptNo,
          contractNo: contract.contractNo,
          amount: amount,
          remainingAmount: contract.totalAmount - contract.paidAmount
        }
      });
    } catch (error) {
      console.error('Error processing payment:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get bad debt criteria and customers
   * GET /api/loan/bad-debt/criteria
   */
  static async getBadDebtCriteria(req, res) {
    try {
      // Get overdue contracts
      const overdueContracts = await InstallmentOrder.find({
        status: { $in: ['overdue', 'defaulted'] },
        deleted_at: null
      }).populate('customer');

      // Transform to bad debt format
      const badDebtCustomers = overdueContracts.map(contract => {
        const overdueDays = calculateOverdueDays(contract);
        return {
          id: contract._id,
          contractNo: contract.contractNo,
          customerName: contract.customer?.displayName || 'N/A',
          phone: contract.customer?.phone,
          overdueAmount: calculateOverdueAmount(contract),
          overdueDays: overdueDays,
          totalDebt: contract.remainingAmount || contract.totalAmount,
          lastPaymentDate: contract.lastPaymentDate,
          status: getBadDebtStatus(overdueDays),
          risk: getRiskLevel(overdueDays)
        };
      });

      res.json({
        success: true,
        data: badDebtCustomers,
        criteria: {
          low: { minDays: 1, maxDays: 30 },
          medium: { minDays: 31, maxDays: 60 },
          high: { minDays: 61, maxDays: 90 },
          critical: { minDays: 91 }
        }
      });
    } catch (error) {
      console.error('Error getting bad debt criteria:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get claim items (products ready for delivery after full payment)
   * GET /api/loan/claim-items/list
   */
  static async getClaimItems(req, res) {
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
        customerName: contract.customer?.displayName,
        phone: contract.customer?.phone,
        products: contract.items?.map(item => ({
          name: item.productName,
          quantity: item.quantity,
          imei: item.imei
        })),
        paymentCompleteDate: contract.completedAt || contract.updatedAt,
        branch: contract.branch_code,
        status: 'ready_for_delivery'
      }));

      res.json({ success: true, data: claimItems });
    } catch (error) {
      console.error('Error getting claim items:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get dashboard statistics
   * GET /api/loan/dashboard/*
   */
  static async getDashboardStats(req, res) {
    try {
      const endpoint = req.params[0]; // Get the specific dashboard endpoint

      switch(endpoint) {
        case 'trends':
          return await LoanIntegrationController.getTrends(req, res);
        case 'status-distribution':
          return await LoanIntegrationController.getStatusDistribution(req, res);
        case 'recent-loans':
          return await LoanIntegrationController.getRecentLoans(req, res);
        case 'debtors':
          return await LoanIntegrationController.getDebtors(req, res);
        default:
          return res.status(404).json({ success: false, error: 'Endpoint not found' });
      }
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getTrends(req, res) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orders = await InstallmentOrder.find({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Group by date
    const trendData = {};
    orders.forEach(order => {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!trendData[date]) {
        trendData[date] = { count: 0, amount: 0 };
      }
      trendData[date].count++;
      trendData[date].amount += order.totalAmount;
    });

    res.json({ success: true, data: trendData });
  }

  static async getStatusDistribution(req, res) {
    const distribution = await InstallmentOrder.aggregate([
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }}
    ]);

    res.json({ success: true, data: distribution });
  }

  static async getRecentLoans(req, res) {
    const recentLoans = await InstallmentOrder.find()
      .populate('customer')
      .sort({ createdAt: -1 })
      .limit(10);

    const loans = recentLoans.map(loan => ({
      id: loan._id,
      contractNo: loan.contractNo,
      customerName: loan.customer?.displayName,
      amount: loan.totalAmount,
      status: loan.status,
      createdAt: loan.createdAt
    }));

    res.json({ success: true, data: loans });
  }

  static async getDebtors(req, res) {
    const debtors = await InstallmentOrder.find({
      status: { $in: ['overdue', 'defaulted'] }
    }).populate('customer');

    const debtorList = debtors.map(contract => ({
      id: contract._id,
      contractNo: contract.contractNo,
      customerName: contract.customer?.displayName,
      phone: contract.customer?.phone,
      overdueAmount: calculateOverdueAmount(contract),
      overdueDays: calculateOverdueDays(contract),
      totalDebt: contract.remainingAmount || contract.totalAmount
    }));

    res.json({ success: true, data: debtorList });
  }
}

// Helper functions
function mapInstallmentStatusToLoan(status) {
  const statusMap = {
    'active': 'active',
    'completed': 'completed',
    'cancelled': 'cancelled',
    'pending': 'pending',
    'overdue': 'overdue',
    'defaulted': 'defaulted'
  };
  return statusMap[status] || status;
}

function calculateOverdueAmount(contract) {
  if (!contract.paymentSchedule) return 0;

  const now = new Date();
  return contract.paymentSchedule
    .filter(schedule =>
      schedule.status === 'pending' &&
      new Date(schedule.dueDate) < now
    )
    .reduce((sum, schedule) => sum + schedule.amount, 0);
}

function calculateOverdueDays(contract) {
  if (!contract.paymentSchedule) return 0;

  const now = new Date();
  const overdueSchedules = contract.paymentSchedule
    .filter(schedule =>
      schedule.status === 'pending' &&
      new Date(schedule.dueDate) < now
    )
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  if (overdueSchedules.length === 0) return 0;

  const oldestDue = new Date(overdueSchedules[0].dueDate);
  return Math.floor((now - oldestDue) / (1000 * 60 * 60 * 24));
}

function getBadDebtStatus(overdueDays) {
  if (overdueDays === 0) return 'current';
  if (overdueDays <= 30) return 'late';
  if (overdueDays <= 60) return 'delinquent';
  if (overdueDays <= 90) return 'default';
  return 'write-off';
}

function getRiskLevel(overdueDays) {
  if (overdueDays === 0) return 'none';
  if (overdueDays <= 30) return 'low';
  if (overdueDays <= 60) return 'medium';
  if (overdueDays <= 90) return 'high';
  return 'critical';
}

module.exports = LoanIntegrationController;