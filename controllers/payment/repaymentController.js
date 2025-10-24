const mongoose = require('mongoose');
const InstallmentOrder = require('../models/Installment/InstallmentOrder');
const InstallmentPayment = require('../models/Installment/InstallmentPayment');
const Customer = require('../models/Customer/Customer');

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    // Get total active contracts count
    const totalContracts = await InstallmentOrder.countDocuments({
      status: { $in: ['ongoing', 'active', 'approved'] },
      deleted_at: null
    });

    // Get monthly payments for current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Calculate total monthly payments received
    const monthlyPayments = await InstallmentPayment.aggregate([
      {
        $match: {
          paymentDate: { $gte: startOfMonth, $lt: endOfMonth },
          status: 'PAID'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amountPaid' }
        }
      }
    ]);

    // Get overdue contracts
    const overdueContracts = await InstallmentOrder.countDocuments({
      status: { $in: ['ongoing', 'active'] },
      dueDate: { $lt: now },
      deleted_at: null
    });

    // Calculate on-time payment rate
    const totalPayments = await InstallmentPayment.countDocuments({
      paymentDate: { $gte: startOfMonth, $lt: endOfMonth }
    });

    const onTimePayments = await InstallmentPayment.countDocuments({
      paymentDate: { $gte: startOfMonth, $lt: endOfMonth },
      $expr: { $lte: ['$paymentDate', '$dueDate'] }
    });

    const onTimeRate = totalPayments > 0 ? Math.round((onTimePayments / totalPayments) * 100) : 100;

    // Get previous month stats for growth calculation
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

    const prevMonthContracts = await InstallmentOrder.countDocuments({
      createdAt: { $gte: prevMonth, $lt: prevMonthEnd },
      deleted_at: null
    });

    const prevMonthPayments = await InstallmentPayment.aggregate([
      {
        $match: {
          paymentDate: { $gte: prevMonth, $lt: prevMonthEnd },
          status: 'PAID'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amountPaid' }
        }
      }
    ]);

    const currentMonthPaymentTotal = monthlyPayments[0]?.total || 0;
    const prevMonthPaymentTotal = prevMonthPayments[0]?.total || 0;

    const contractsGrowth = prevMonthContracts > 0
      ? Math.round(((totalContracts - prevMonthContracts) / prevMonthContracts) * 100)
      : 0;

    const paymentsGrowth = prevMonthPaymentTotal > 0
      ? Math.round(((currentMonthPaymentTotal - prevMonthPaymentTotal) / prevMonthPaymentTotal) * 100)
      : 0;

    const stats = {
      totalContracts,
      monthlyPayments: currentMonthPaymentTotal,
      overdueContracts,
      onTimeRate,
      contractsGrowth,
      paymentsGrowth
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'ไม่สามารถโหลดสถิติได้'
    });
  }
};

// Get contracts list
exports.getContracts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Build query
    const query = {
      deleted_at: null,
      status: { $in: ['ongoing', 'active', 'approved', 'completed'] }
    };

    // Add search filters if provided
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { contractNo: searchRegex },
        { 'customer_info.firstName': searchRegex },
        { 'customer_info.lastName': searchRegex },
        { 'customer_info.phone': searchRegex }
      ];
    }

    if (req.query.type) {
      query.planType = req.query.type;
    }

    // Get contracts with customer data
    const contracts = await InstallmentOrder.find(query).lean()
      .populate('customer', 'individual.firstName individual.lastName individual.phone individual.email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Transform data for frontend
    const transformedContracts = contracts.map(contract => {
      // Get customer name from populated data or customer_info
      let customerName = '';
      if (contract.customer && contract.customer.individual) {
        customerName = `${contract.customer.individual.firstName || ''} ${contract.customer.individual.lastName || ''}`.trim();
      } else if (contract.customer_info) {
        customerName = `${contract.customer_info.firstName || ''} ${contract.customer_info.lastName || ''}`.trim();
      }

      // Get customer phone
      let customerPhone = '';
      if (contract.customer && contract.customer.individual) {
        customerPhone = contract.customer.individual.phone || '';
      } else if (contract.customer_info) {
        customerPhone = contract.customer_info.phone || '';
      }

      // Calculate payment progress
      const totalAmount = contract.finalTotalAmount || contract.totalAmount || 0;
      const paidAmount = contract.paidAmount || 0;
      const remainingAmount = totalAmount - paidAmount;
      const progressPercent = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

      // Determine contract type based on planType and installmentType
      let type = 'INSTALLMENT'; // Default
      if (contract.planType === 'plan1') type = 'INSTALLMENT';
      else if (contract.planType === 'plan2') type = 'SAVINGS';
      else if (contract.planType === 'plan3') type = 'PAYOFF';

      // Determine status
      let status = 'current';
      if (contract.status === 'completed') {
        status = 'completed';
      } else if (contract.dueDate && new Date(contract.dueDate) < new Date()) {
        status = 'overdue';
      } else if (paidAmount > 0 && progressPercent < 100) {
        status = 'current';
      }

      // Get product info
      const productName = contract.items && contract.items[0] ? contract.items[0].name : 'ไม่ระบุสินค้า';
      const productDescription = contract.items && contract.items[0] ? contract.items[0].imei || '' : '';

      return {
        _id: contract._id,
        contractNumber: contract.contractNo || `AUTO-${contract._id.toString().slice(-6)}`,
        customerName,
        customerPhone,
        productName,
        productDescription,
        type,
        status,
        totalAmount,
        paidAmount,
        remainingAmount,
        monthlyAmount: contract.monthlyPayment || 0,
        totalInstallments: contract.installmentCount || 0,
        paidInstallments: Math.floor(paidAmount / (contract.monthlyPayment || 1)),
        dueDate: contract.dueDate,
        createdAt: contract.createdAt,
        planType: contract.planType
      };
    });

    // Get total count for pagination
    const totalCount = await InstallmentOrder.countDocuments(query);

    res.json({
      success: true,
      data: transformedContracts,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Error getting contracts:', error);
    res.status(500).json({
      success: false,
      error: 'ไม่สามารถโหลดรายการสัญญาได้'
    });
  }
};

// Get specific contract by ID
exports.getContractById = async (req, res) => {
  try {
    const contractId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(contractId)) {
      return res.status(400).json({
        success: false,
        error: 'รหัสสัญญาไม่ถูกต้อง'
      });
    }

    const contract = await InstallmentOrder.findById(contractId).lean()
      .populate('customer', 'individual.firstName individual.lastName individual.phone individual.email individual.address individual.taxId')
      .lean();

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบสัญญาที่ระบุ'
      });
    }

    // Get installment payments for this contract
    const installmentPayments = await InstallmentPayment.find({
      installmentOrder: contractId
    }).sort({ installmentNumber: 1 }).lean();

    // Transform contract data
    let customerName = '';
    let customerPhone = '';
    let customerIdCard = '';
    let customerAddress = '';

    if (contract.customer && contract.customer.individual) {
      const individual = contract.customer.individual;
      customerName = `${individual.firstName || ''} ${individual.lastName || ''}`.trim();
      customerPhone = individual.phone || '';
      customerIdCard = individual.taxId || '';

      if (individual.address) {
        customerAddress = `${individual.address.houseNo || ''} ${individual.address.moo ? 'หมู่ ' + individual.address.moo : ''} ${individual.address.subDistrict || ''} ${individual.address.district || ''} ${individual.address.province || ''} ${individual.address.zipcode || ''}`.trim();
      }
    } else if (contract.customer_info) {
      customerName = `${contract.customer_info.firstName || ''} ${contract.customer_info.lastName || ''}`.trim();
      customerPhone = contract.customer_info.phone || '';
      customerIdCard = contract.customer_info.taxId || '';

      if (contract.customer_info.address) {
        const addr = contract.customer_info.address;
        customerAddress = `${addr.houseNo || ''} ${addr.moo ? 'หมู่ ' + addr.moo : ''} ${addr.subDistrict || ''} ${addr.district || ''} ${addr.province || ''} ${addr.zipcode || ''}`.trim();
      }
    }

    const totalAmount = contract.finalTotalAmount || contract.totalAmount || 0;
    const paidAmount = contract.paidAmount || 0;

    const transformedContract = {
      _id: contract._id,
      contractNumber: contract.contractNo || `AUTO-${contract._id.toString().slice(-6)}`,
      customerName,
      customerPhone,
      customerIdCard,
      customerAddress,
      type: contract.planType === 'plan1' ? 'INSTALLMENT' : contract.planType === 'plan2' ? 'SAVINGS' : 'PAYOFF',
      status: contract.status,
      totalAmount,
      paidAmount,
      remainingAmount: totalAmount - paidAmount,
      downPayment: contract.downPayment || 0,
      financeAmount: totalAmount - (contract.downPayment || 0),
      monthlyAmount: contract.monthlyPayment || 0,
      totalInstallments: contract.installmentCount || 0,
      paidInstallments: Math.floor(paidAmount / (contract.monthlyPayment || 1)),
      startDate: contract.createdAt,
      endDate: contract.dueDate,
      products: contract.items || [],
      installments: installmentPayments.map(payment => ({
        installmentNumber: payment.installmentNumber,
        dueDate: payment.dueDate,
        amount: payment.amountDue,
        paidAmount: payment.amountPaid,
        paidDate: payment.paymentDate,
        isPaid: payment.status === 'PAID',
        paymentMethod: payment.paymentMethod,
        status: payment.status
      }))
    };

    res.json({
      success: true,
      data: transformedContract
    });

  } catch (error) {
    console.error('Error getting contract by ID:', error);
    res.status(500).json({
      success: false,
      error: 'ไม่สามารถโหลดข้อมูลสัญญาได้'
    });
  }
};

// Record payment
exports.recordPayment = async (req, res) => {
  try {
    const {
      contractId,
      installmentNumber,
      amountPaid,
      paymentDate,
      paymentMethod,
      note
    } = req.body;

    if (!contractId || !installmentNumber || !amountPaid || !paymentDate) {
      return res.status(400).json({
        success: false,
        error: 'ข้อมูลไม่ครบถ้วน'
      });
    }

    // Check if contract exists
    const contract = await InstallmentOrder.findById(contractId).lean();
    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบสัญญาที่ระบุ'
      });
    }

    // Find or create installment payment record
    let installmentPayment = await InstallmentPayment.findOne({
      installmentOrder: contractId,
      installmentNumber: installmentNumber
    });

    if (!installmentPayment) {
      // Create new installment payment
      installmentPayment = new InstallmentPayment({
        customer_id: contract.customer,
        installmentOrder: contractId,
        installmentNumber: installmentNumber,
        amountDue: contract.monthlyPayment || amountPaid,
        amountPaid: 0,
        dueDate: new Date(paymentDate),
        status: 'PENDING'
      });
    }

    // Update payment information
    installmentPayment.amountPaid = amountPaid;
    installmentPayment.paymentDate = new Date(paymentDate);
    installmentPayment.paymentMethod = paymentMethod;
    installmentPayment.status = 'PAID';
    installmentPayment.notes = note;

    await installmentPayment.save();

    // Update contract paid amount
    const totalPaidAmount = await InstallmentPayment.aggregate([
      {
        $match: {
          installmentOrder: new mongoose.Types.ObjectId(contractId),
          status: 'PAID'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amountPaid' }
        }
      }
    ]);

    const newPaidAmount = totalPaidAmount[0]?.total || 0;

    // Update contract
    await InstallmentOrder.findByIdAndUpdate(contractId, {
      paidAmount: newPaidAmount,
      status: newPaidAmount >= (contract.finalTotalAmount || contract.totalAmount) ? 'completed' : 'ongoing',
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'บันทึกการชำระเรียบร้อย',
      data: {
        paymentId: installmentPayment._id,
        contractId,
        amountPaid,
        newTotalPaid: newPaidAmount
      }
    });

  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({
      success: false,
      error: 'ไม่สามารถบันทึกการชำระได้'
    });
  }
};

module.exports = exports;
