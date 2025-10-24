// File: controllers/loan/loanIntegrationController.js
// Purpose: Integration controller between loan module and pattani installment system

const Contract = require('../../models/Load/Contract');
const InstallmentOrder = require('../../models/Installment/InstallmentOrder');
const Customer = require('../../models/Customer/Customer');
const PayoffApproval = require('../../models/Load/PayoffApproval');
const BadDebtCriteria = require('../../models/BadDebtCriteria');
const DepositReceipt = require('../../models/DepositReceipt');
const QuickSale = require('../../models/QuickSale');
const InstallmentPayment = require('../../models/Installment/InstallmentPayment');
const mongoose = require('mongoose');

// Helper function to calculate installment details
const calculateInstallmentDetails = (principal, interestRate, numberOfMonths, downPayment = 0) => {
  const remainingPrincipal = principal - downPayment;
  const monthlyInterestRate = interestRate / 100 / 12;

  let monthlyPayment;
  if (monthlyInterestRate === 0) {
    monthlyPayment = remainingPrincipal / numberOfMonths;
  } else {
    monthlyPayment = remainingPrincipal *
      (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfMonths)) /
      (Math.pow(1 + monthlyInterestRate, numberOfMonths) - 1);
  }

  const totalPayment = (monthlyPayment * numberOfMonths) + downPayment;
  const totalInterest = totalPayment - principal;

  return {
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    totalPayment: Math.round(totalPayment * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    remainingPrincipal: Math.round(remainingPrincipal * 100) / 100
  };
};

// Get single contract by ID
exports.getContractById = async (req, res) => {
  try {
    const { contractId } = req.params;
    console.log('Getting contract by ID:', contractId);

    // Support both MongoDB _id and contractNo
    let query;
    if (mongoose.Types.ObjectId.isValid(contractId)) {
      query = { _id: contractId };
    } else {
      query = { contractNo: contractId };
    }

    // Find the installment order
    const contract = await InstallmentOrder.findOne(query)
      .populate('customer');

    if (!contract) {
      console.log('Contract not found:', contractId);
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลสัญญา'
      });
    }

    // Get payment history
    const payments = await InstallmentPayment.find({
      contractId: contract._id
    }).sort({ paymentDate: -1 });

    // Calculate summary
    const paidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const remainingAmount = contract.totalAmount - paidAmount;

    // Format response for loan system
    const response = {
      success: true,
      data: {
        id: contract._id,
        contractNo: contract.contractNo,
        customer: {
          id: contract.customer?._id,
          name: contract.customer?.displayName || formatCustomerName(contract.customer_info),
          phone: contract.customer?.phone || contract.customer_info?.phone,
          taxId: contract.customer?.individual?.taxId || contract.customer_info?.taxId,
          address: contract.customer_info?.address || contract.customer?.homeAddress
        },
        loanDetails: {
          totalAmount: contract.totalAmount,
          downPayment: contract.downPayment || 0,
          financedAmount: contract.financedAmount || (contract.totalAmount - (contract.downPayment || 0)),
          interestRate: contract.interestRate || 0,
          monthlyPayment: contract.monthlyPayment || 0,
          installmentMonths: contract.installmentMonths || contract.installmentCount || 0
        },
        paymentSummary: {
          paidAmount,
          remainingAmount,
          totalPayments: payments.length,
          lastPaymentDate: payments[0]?.paymentDate
        },
        paymentSchedule: contract.paymentSchedule?.map((schedule, index) => ({
          installmentNo: schedule.installmentNo || index + 1,
          dueDate: schedule.dueDate,
          amount: schedule.amount,
          principal: schedule.principal,
          interest: schedule.interest,
          status: schedule.status || 'pending',
          paidDate: schedule.paidDate,
          paidAmount: schedule.paidAmount
        })) || [],
        paymentHistory: payments.map(payment => ({
          id: payment._id,
          paymentDate: payment.paymentDate,
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          receiptNo: payment.receiptNumber || payment.receiptNo,
          status: payment.status
        })),
        products: contract.items?.map(item => ({
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          imei: item.imei
        })) || [],
        status: contract.status,
        createdAt: contract.createdAt,
        updatedAt: contract.updatedAt
      }
    };

    console.log('Contract found and formatted successfully');
    res.json(response);

  } catch (error) {
    console.error('Error getting contract by ID:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสัญญา',
      error: error.message
    });
  }
};

// Helper function to format customer name
function formatCustomerName(customerInfo) {
  if (!customerInfo) return 'N/A';
  return `${customerInfo.prefix || ''} ${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim() || 'N/A';
}

// Create loan contract from installment order
exports.createLoanContract = async (req, res) => {
  try {
    const { installmentOrderId, additionalData } = req.body;

    // Get installment order data
    const installmentOrder = await InstallmentOrder.findById(installmentOrderId)
      .populate('customer_id')
      .populate('product_list.product_id');

    if (!installmentOrder) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลใบสั่งซื้อผ่อนชำระ'
      });
    }

    // Calculate loan details
    const loanDetails = calculateInstallmentDetails(
      installmentOrder.total_amount,
      installmentOrder.interest_rate || 0,
      installmentOrder.installment_months,
      installmentOrder.down_payment
    );

    // Create contract
    const contract = new Contract({
      contract_number: `CNT-${Date.now()}`,
      customer_id: installmentOrder.customer_id._id,
      installment_order_id: installmentOrderId,
      branch_code: installmentOrder.branch_code || req.user.branch_code,

      // Contract details
      contract_date: new Date(),
      contract_type: 'installment',
      status: 'active',

      // Financial details
      principal_amount: installmentOrder.total_amount,
      down_payment: installmentOrder.down_payment || 0,
      remaining_principal: loanDetails.remainingPrincipal,
      interest_rate: installmentOrder.interest_rate || 0,
      monthly_payment: loanDetails.monthlyPayment,
      total_payment: loanDetails.totalPayment,
      total_interest: loanDetails.totalInterest,

      // Payment schedule
      installment_months: installmentOrder.installment_months,
      first_payment_date: installmentOrder.first_payment_date,
      last_payment_date: new Date(
        new Date(installmentOrder.first_payment_date).setMonth(
          new Date(installmentOrder.first_payment_date).getMonth() + installmentOrder.installment_months
        )
      ),

      // Products
      products: installmentOrder.product_list.map(item => ({
        product_id: item.product_id._id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      })),

      // Additional info
      guarantor: additionalData?.guarantor || installmentOrder.guarantor,
      collateral: additionalData?.collateral || installmentOrder.collateral,
      notes: additionalData?.notes || installmentOrder.notes,

      created_by: req.user._id,
      updated_by: req.user._id
    });

    await contract.save();

    // Update installment order with contract reference
    installmentOrder.contract_id = contract._id;
    installmentOrder.contract_status = 'contracted';
    await installmentOrder.save();

    res.status(201).json({
      success: true,
      message: 'สร้างสัญญาเงินกู้สำเร็จ',
      data: contract
    });

  } catch (error) {
    console.error('Create loan contract error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างสัญญาเงินกู้',
      error: error.message
    });
  }
};

// Import extended functions
const extendedFunctions = require('./loanIntegrationControllerExtended');

// Export extended functions
exports.getInstallmentHistory = extendedFunctions.getInstallmentHistory;
exports.processPayment = extendedFunctions.processPayment;
exports.getDashboardDebtors = extendedFunctions.getDashboardDebtors;
exports.getClaimItems = extendedFunctions.getClaimItems;
exports.getCreditApproved = extendedFunctions.getCreditApproved;
exports.syncInstallmentData = extendedFunctions.syncInstallmentData;

// Get loan contracts with installment details
exports.getLoanContracts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      customerName,
      contractNumber,
      branchCode,
      startDate,
      endDate
    } = req.query;

    // Build query
    const query = {};

    if (status) query.status = status;
    if (contractNumber) query.contract_number = new RegExp(contractNumber, 'i');
    if (branchCode) query.branch_code = branchCode;

    if (startDate || endDate) {
      query.contract_date = {};
      if (startDate) query.contract_date.$gte = new Date(startDate);
      if (endDate) query.contract_date.$lte = new Date(endDate);
    }

    // Execute query with population
    const contracts = await Contract.find(query)
      .populate('customer_id', 'fullname phone id_card')
      .populate('installment_order_id')
      .sort({ contract_date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Filter by customer name if provided
    let filteredContracts = contracts;
    if (customerName) {
      filteredContracts = contracts.filter(contract =>
        contract.customer_id?.fullname?.toLowerCase().includes(customerName.toLowerCase())
      );
    }

    // Get total count
    const totalCount = await Contract.countDocuments(query);

    res.json({
      success: true,
      data: filteredContracts,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        pages: Math.ceil(totalCount / limit),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get loan contracts error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสัญญา',
      error: error.message
    });
  }
};

// Get bad debt criteria
exports.getBadDebtCriteria = async (req, res) => {
  try {
    let criteria = await BadDebtCriteria.findOne({ is_active: true });

    // If no criteria exists, create default
    if (!criteria) {
      criteria = new BadDebtCriteria({
        allowance_percentage: 5.00,
        doubtful_percentage: 2.00,
        bad_debt_percentage: 1.00,
        repossession_cost: 500,
        policy_notes: 'เกณฑ์การพิจารณาหนี้สงสัยจะสูญ:\n' +
          '1. ค่าเผื่อหนี้สงสัยจะสูญ: ลูกหนี้ที่มีอายุหนี้ 60-90 วัน\n' +
          '2. หนี้สงสัยจะสูญ: ลูกหนี้ที่มีอายุหนี้ 90-180 วัน\n' +
          '3. หนี้สูญ: ลูกหนี้ที่มีอายุหนี้เกิน 180 วัน',
        is_active: true,
        created_by: req.user?._id
      });
      await criteria.save();
    }

    res.json({
      success: true,
      data: criteria
    });

  } catch (error) {
    console.error('Get bad debt criteria error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเกณฑ์หนี้สูญ',
      error: error.message
    });
  }
};

// Update bad debt criteria
exports.updateBadDebtCriteria = async (req, res) => {
  try {
    const {
      allowance_percentage,
      doubtful_percentage,
      bad_debt_percentage,
      repossession_cost,
      policy_notes
    } = req.body;

    let criteria = await BadDebtCriteria.findOne({ is_active: true });

    if (!criteria) {
      criteria = new BadDebtCriteria();
    }

    // Update fields
    if (allowance_percentage !== undefined) criteria.allowance_percentage = allowance_percentage;
    if (doubtful_percentage !== undefined) criteria.doubtful_percentage = doubtful_percentage;
    if (bad_debt_percentage !== undefined) criteria.bad_debt_percentage = bad_debt_percentage;
    if (repossession_cost !== undefined) criteria.repossession_cost = repossession_cost;
    if (policy_notes !== undefined) criteria.policy_notes = policy_notes;

    criteria.updated_by = req.user._id;
    criteria.updated_at = new Date();

    await criteria.save();

    res.json({
      success: true,
      message: 'อัพเดทเกณฑ์หนี้สูญสำเร็จ',
      data: criteria
    });

  } catch (error) {
    console.error('Update bad debt criteria error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัพเดทเกณฑ์หนี้สูญ',
      error: error.message
    });
  }
};

// Get debtors list
exports.getDebtors = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      overdueDays,
      branchCode,
      status = 'overdue'
    } = req.query;

    // Build aggregation pipeline
    const pipeline = [
      {
        $match: {
          status: { $in: ['active', 'overdue', 'default'] },
          remaining_principal: { $gt: 0 }
        }
      },
      {
        $lookup: {
          from: 'customers',
          localField: 'customer_id',
          foreignField: '_id',
          as: 'customer'
        }
      },
      {
        $unwind: '$customer'
      },
      {
        $addFields: {
          overdue_days: {
            $divide: [
              { $subtract: [new Date(), '$last_payment_date'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      }
    ];

    // Add filters
    if (branchCode) {
      pipeline[0].$match.branch_code = branchCode;
    }

    if (overdueDays) {
      pipeline.push({
        $match: {
          overdue_days: { $gte: parseInt(overdueDays) }
        }
      });
    }

    if (status === 'overdue') {
      pipeline.push({
        $match: {
          overdue_days: { $gt: 0 }
        }
      });
    }

    // Add sorting and pagination
    pipeline.push(
      { $sort: { overdue_days: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: parseInt(limit) }
    );

    const debtors = await Contract.aggregate(pipeline);

    // Get total count
    const countPipeline = pipeline.slice(0, -2); // Remove skip and limit
    countPipeline.push({ $count: 'total' });
    const countResult = await Contract.aggregate(countPipeline);
    const totalCount = countResult[0]?.total || 0;

    res.json({
      success: true,
      data: debtors,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        pages: Math.ceil(totalCount / limit),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get debtors error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลลูกหนี้',
      error: error.message
    });
  }
};

// Get deposit receipts
exports.getDepositReceipts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      customerName,
      branchCode,
      startDate,
      endDate
    } = req.query;

    // Build query
    const query = {};

    if (status) query.status = status;
    if (branchCode) query.branch_code = branchCode;

    if (startDate || endDate) {
      query.receipt_date = {};
      if (startDate) query.receipt_date.$gte = new Date(startDate);
      if (endDate) query.receipt_date.$lte = new Date(endDate);
    }

    // Execute query
    const deposits = await DepositReceipt.find(query)
      .populate('customer_id', 'fullname phone id_card')
      .populate('contract_id', 'contract_number')
      .sort({ receipt_date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Filter by customer name if provided
    let filteredDeposits = deposits;
    if (customerName) {
      filteredDeposits = deposits.filter(deposit =>
        deposit.customer_id?.fullname?.toLowerCase().includes(customerName.toLowerCase())
      );
    }

    // Get total count
    const totalCount = await DepositReceipt.countDocuments(query);

    res.json({
      success: true,
      data: filteredDeposits,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        pages: Math.ceil(totalCount / limit),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get deposit receipts error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเงินมัดจำ',
      error: error.message
    });
  }
};

// Create deposit receipt
exports.createDepositReceipt = async (req, res) => {
  try {
    const {
      customer_id,
      contract_id,
      amount,
      payment_method,
      reference_number,
      notes
    } = req.body;

    // Generate receipt number
    const receiptCount = await DepositReceipt.countDocuments();
    const receiptNumber = `DEP-${new Date().getFullYear()}${String(receiptCount + 1).padStart(6, '0')}`;

    const deposit = new DepositReceipt({
      receipt_number: receiptNumber,
      customer_id,
      contract_id,
      amount,
      payment_method,
      reference_number,
      receipt_date: new Date(),
      status: 'active',
      branch_code: req.user.branch_code,
      notes,
      created_by: req.user._id
    });

    await deposit.save();

    // If contract_id provided, update contract
    if (contract_id) {
      const contract = await Contract.findById(contract_id);
      if (contract) {
        contract.deposit_amount = (contract.deposit_amount || 0) + amount;
        await contract.save();
      }
    }

    res.status(201).json({
      success: true,
      message: 'บันทึกเงินมัดจำสำเร็จ',
      data: deposit
    });

  } catch (error) {
    console.error('Create deposit receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการบันทึกเงินมัดจำ',
      error: error.message
    });
  }
};

// Get credit approved list
exports.getCreditApproved = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = 'approved',
      customerName,
      branchCode
    } = req.query;

    // Build query
    const query = {
      approval_status: status,
      sale_type: 'installment'
    };

    if (branchCode) query.branch_code = branchCode;

    // Execute query
    const approvals = await QuickSale.find(query)
      .populate('customer_id', 'fullname phone id_card credit_limit')
      .populate('approved_by', 'name')
      .sort({ approval_date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Filter by customer name if provided
    let filteredApprovals = approvals;
    if (customerName) {
      filteredApprovals = approvals.filter(approval =>
        approval.customer_id?.fullname?.toLowerCase().includes(customerName.toLowerCase())
      );
    }

    // Get total count
    const totalCount = await QuickSale.countDocuments(query);

    res.json({
      success: true,
      data: filteredApprovals,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        pages: Math.ceil(totalCount / limit),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get credit approved error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเครดิตที่อนุมัติ',
      error: error.message
    });
  }
};

// Sync installment data with loan module
exports.syncInstallmentData = async (req, res) => {
  try {
    const { installmentOrderId } = req.params;

    // Get installment order
    const installmentOrder = await InstallmentOrder.findById(installmentOrderId)
      .populate('customer_id');

    if (!installmentOrder) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลใบสั่งซื้อผ่อนชำระ'
      });
    }

    // Check if contract exists
    let contract = await Contract.findOne({ installment_order_id: installmentOrderId });

    if (!contract) {
      // Create new contract if not exists
      const loanDetails = calculateInstallmentDetails(
        installmentOrder.total_amount,
        installmentOrder.interest_rate || 0,
        installmentOrder.installment_months,
        installmentOrder.down_payment
      );

      contract = new Contract({
        contract_number: `CNT-${Date.now()}`,
        customer_id: installmentOrder.customer_id._id,
        installment_order_id: installmentOrderId,
        branch_code: installmentOrder.branch_code,
        contract_date: new Date(),
        contract_type: 'installment',
        status: 'active',
        principal_amount: installmentOrder.total_amount,
        down_payment: installmentOrder.down_payment || 0,
        remaining_principal: loanDetails.remainingPrincipal,
        interest_rate: installmentOrder.interest_rate || 0,
        monthly_payment: loanDetails.monthlyPayment,
        total_payment: loanDetails.totalPayment,
        total_interest: loanDetails.totalInterest,
        installment_months: installmentOrder.installment_months,
        first_payment_date: installmentOrder.first_payment_date,
        created_by: req.user._id
      });

      await contract.save();
    } else {
      // Update existing contract
      contract.status = installmentOrder.status === 'completed' ? 'closed' : 'active';
      contract.remaining_principal = installmentOrder.remaining_amount || 0;
      contract.last_payment_date = installmentOrder.last_payment_date;
      contract.updated_by = req.user._id;
      contract.updated_at = new Date();

      await contract.save();
    }

    res.json({
      success: true,
      message: 'ซิงค์ข้อมูลสำเร็จ',
      data: contract
    });

  } catch (error) {
    console.error('Sync installment data error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการซิงค์ข้อมูล',
      error: error.message
    });
  }
};

module.exports = exports;