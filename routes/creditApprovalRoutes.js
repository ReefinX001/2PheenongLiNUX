/**
 * Credit Approval Routes - API endpoints for credit approval management
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/authJWT');
const InstallmentOrder = require('../models/Installment/InstallmentOrder');
const Customer = require('../models/Customer/Customer');

/**
 * GET /api/credit-approval/pending
 * Get list of pending credit applications
 */
router.get('/pending', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Getting pending credit applications...');

    const {
      page = 1,
      limit = 20,
      priority = 'all',
      branchCode,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query for pending approvals
    let query = {
      deleted_at: null,
      status: { $in: ['pending_approval', 'submitted', 'under_review'] }
    };

    if (branchCode) {
      query.branch_code = branchCode;
    }

    // Add priority filter if specified
    if (priority !== 'all') {
      if (priority === 'high') {
        query.totalAmount = { $gte: 100000 }; // High value contracts
      } else if (priority === 'urgent') {
        const urgentDate = new Date();
        urgentDate.setDate(urgentDate.getDate() - 3); // Older than 3 days
        query.createdAt = { $lte: urgentDate };
      }
    }

    const sortField = {};
    sortField[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get pending applications with customer details
    const [pendingApplications, totalCount] = await Promise.all([
      InstallmentOrder.find(query)
        .populate('customer', 'individual.firstName individual.lastName individual.phone individual.idCard corporate.companyName corporate.corporatePhone corporate.taxId customerType creditInfo')
        .sort(sortField)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      InstallmentOrder.countDocuments(query)
    ]);

    // Format the results
    const formattedApplications = pendingApplications.map(application => {
      const customer = application.customer;
      const daysPending = Math.floor((new Date() - new Date(application.createdAt)) / (1000 * 60 * 60 * 24));

      // Calculate priority based on amount and days pending
      let priority = 'normal';
      if (application.totalAmount >= 200000) priority = 'high';
      else if (application.totalAmount >= 100000) priority = 'medium';
      if (daysPending >= 5) priority = 'urgent';

      // Calculate risk score
      let riskScore = 50; // Base score
      if (customer?.creditInfo?.creditScore) {
        riskScore = customer.creditInfo.creditScore;
      } else {
        // Simple risk assessment based on available data
        const totalAmount = application.totalAmount || 0;
        const downPayment = application.downPayment || 0;
        const downPaymentPercentage = totalAmount > 0 ? (downPayment / totalAmount) * 100 : 0;

        // Adjust risk based on down payment
        if (downPaymentPercentage >= 30) riskScore += 20;
        else if (downPaymentPercentage >= 20) riskScore += 10;
        else if (downPaymentPercentage < 10) riskScore -= 20;

        // Adjust for loan amount
        if (totalAmount >= 500000) riskScore -= 10;
        else if (totalAmount <= 50000) riskScore += 15;
      }

      return {
        id: application._id,
        contractNo: application.contractNo,
        applicationDate: application.createdAt,
        customerName: customer ?
          (customer.customerType === 'individual'
            ? `${customer.individual?.firstName || ''} ${customer.individual?.lastName || ''}`.trim()
            : customer.corporate?.companyName || 'บริษัท')
          : 'ไม่ระบุ',
        customerPhone: customer ?
          (customer.customerType === 'individual'
            ? customer.individual?.phone
            : customer.corporate?.corporatePhone)
          : null,
        customerIdCard: customer ?
          (customer.customerType === 'individual'
            ? customer.individual?.idCard
            : customer.corporate?.taxId)
          : null,
        customerType: customer?.customerType || 'individual',
        requestedAmount: application.totalAmount || 0,
        downPayment: application.downPayment || 0,
        downPaymentPercentage: application.totalAmount > 0
          ? Math.round(((application.downPayment || 0) / application.totalAmount) * 100)
          : 0,
        monthlyPayment: application.monthlyPayment || 0,
        installmentCount: application.installmentCount || 12,
        interestRate: application.interestRate || 0,
        items: application.items || [],
        productName: application.items?.[0]?.name || 'ไม่ระบุ',
        status: application.status,
        priority: priority,
        daysPending: daysPending,
        riskScore: Math.min(100, Math.max(0, riskScore)), // Keep between 0-100
        riskLevel: riskScore >= 70 ? 'ต่ำ' : riskScore >= 50 ? 'ปานกลาง' : 'สูง',
        branchCode: application.branch_code,
        submittedBy: application.createdBy,
        notes: application.approvalNotes || [],
        documents: {
          hasIdCard: customer?.documents?.some(doc => doc.type === 'id_card') || false,
          hasIncomeProof: customer?.documents?.some(doc => doc.type === 'income_proof') || false,
          hasAddressProof: customer?.documents?.some(doc => doc.type === 'address_proof') || false,
          documentCount: customer?.documents?.length || 0
        },
        creditInfo: customer?.creditInfo || {},
        // Additional fields for approval decision
        recommendedAction: riskScore >= 70 ? 'approve' : riskScore >= 50 ? 'review' : 'reject',
        maxApprovedAmount: Math.round((application.totalAmount || 0) * (riskScore / 100)),
        updatedAt: application.updatedAt
      };
    });

    // Calculate summary statistics
    const summary = {
      totalPending: totalCount,
      highPriority: formattedApplications.filter(app => app.priority === 'high' || app.priority === 'urgent').length,
      averageAmount: formattedApplications.length > 0
        ? Math.round(formattedApplications.reduce((sum, app) => sum + app.requestedAmount, 0) / formattedApplications.length)
        : 0,
      totalRequestedAmount: formattedApplications.reduce((sum, app) => sum + app.requestedAmount, 0),
      averageDaysPending: formattedApplications.length > 0
        ? Math.round(formattedApplications.reduce((sum, app) => sum + app.daysPending, 0) / formattedApplications.length)
        : 0,
      riskDistribution: {
        ต่ำ: formattedApplications.filter(app => app.riskLevel === 'ต่ำ').length,
        ปานกลาง: formattedApplications.filter(app => app.riskLevel === 'ปานกลาง').length,
        สูง: formattedApplications.filter(app => app.riskLevel === 'สูง').length
      },
      recommendedActions: {
        approve: formattedApplications.filter(app => app.recommendedAction === 'approve').length,
        review: formattedApplications.filter(app => app.recommendedAction === 'review').length,
        reject: formattedApplications.filter(app => app.recommendedAction === 'reject').length
      }
    };

    res.json({
      success: true,
      data: formattedApplications,
      summary,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit))
      },
      filters: {
        priority,
        branchCode,
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    console.error('❌ Error fetching pending credit applications:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงรายการคำขออนุมัติเครดิต',
      error: error.message
    });
  }
});

/**
 * POST /api/credit-approval/:id/approve
 * Approve a credit application
 */
router.post('/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      approvedAmount,
      approvedTerms,
      interestRate,
      conditions,
      notes
    } = req.body;

    console.log(`✅ Approving credit application ${id}`);

    const application = await InstallmentOrder.findById(id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบคำขออนุมัติที่ระบุ'
      });
    }

    if (application.status !== 'pending_approval' && application.status !== 'under_review') {
      return res.status(400).json({
        success: false,
        message: 'สถานะของคำขออนุมัติไม่ถูกต้อง'
      });
    }

    // Update application with approval details
    const approvalData = {
      status: 'approved',
      approvalDate: new Date(),
      approvedBy: req.user?.id,
      approvalNotes: [
        ...(application.approvalNotes || []),
        {
          action: 'approved',
          notes: notes || '',
          userId: req.user?.id,
          timestamp: new Date()
        }
      ],
      updatedAt: new Date()
    };

    // Update amounts if different from requested
    if (approvedAmount && approvedAmount !== application.totalAmount) {
      approvalData.approvedAmount = approvedAmount;
      approvalData.totalAmount = approvedAmount;
      // Recalculate monthly payment if needed
      if (approvedTerms) {
        approvalData.installmentCount = approvedTerms;
        approvalData.monthlyPayment = Math.round(approvedAmount / approvedTerms);
      }
    }

    if (interestRate) {
      approvalData.interestRate = interestRate;
      // Recalculate with interest if needed
      const principal = approvedAmount || application.totalAmount;
      const months = approvedTerms || application.installmentCount;
      const monthlyInterest = interestRate / 100 / 12;
      const monthlyPaymentWithInterest = Math.round(
        principal * (monthlyInterest * Math.pow(1 + monthlyInterest, months)) /
        (Math.pow(1 + monthlyInterest, months) - 1)
      );
      approvalData.monthlyPayment = monthlyPaymentWithInterest;
      approvalData.finalTotalAmount = monthlyPaymentWithInterest * months;
    }

    if (conditions && conditions.length > 0) {
      approvalData.approvalConditions = conditions;
    }

    await InstallmentOrder.findByIdAndUpdate(id, approvalData);

    console.log(`✅ Credit application ${application.contractNo} approved successfully`);

    res.json({
      success: true,
      message: 'อนุมัติคำขอเครดิตเรียบร้อยแล้ว',
      data: {
        applicationId: id,
        contractNo: application.contractNo,
        approvedAmount: approvedAmount || application.totalAmount,
        approvalDate: new Date(),
        status: 'approved'
      }
    });

  } catch (error) {
    console.error('❌ Error approving credit application:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอนุมัติคำขอเครดิต',
      error: error.message
    });
  }
});

/**
 * POST /api/credit-approval/:id/reject
 * Reject a credit application
 */
router.post('/:id/reject', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, notes } = req.body;

    console.log(`❌ Rejecting credit application ${id}`);

    const application = await InstallmentOrder.findById(id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบคำขออนุมัติที่ระบุ'
      });
    }

    // Update application with rejection details
    const rejectionData = {
      status: 'rejected',
      rejectionDate: new Date(),
      rejectedBy: req.user?.id,
      rejectionReason: reason,
      approvalNotes: [
        ...(application.approvalNotes || []),
        {
          action: 'rejected',
          reason: reason,
          notes: notes || '',
          userId: req.user?.id,
          timestamp: new Date()
        }
      ],
      updatedAt: new Date()
    };

    await InstallmentOrder.findByIdAndUpdate(id, rejectionData);

    console.log(`❌ Credit application ${application.contractNo} rejected`);

    res.json({
      success: true,
      message: 'ปฏิเสธคำขอเครดิตเรียบร้อยแล้ว',
      data: {
        applicationId: id,
        contractNo: application.contractNo,
        rejectionReason: reason,
        rejectionDate: new Date(),
        status: 'rejected'
      }
    });

  } catch (error) {
    console.error('❌ Error rejecting credit application:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการปฏิเสธคำขอเครดิต',
      error: error.message
    });
  }
});

/**
 * POST /api/credit-approval/:id/request-more-info
 * Request additional information for a credit application
 */
router.post('/:id/request-more-info', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { requiredDocuments, notes } = req.body;

    console.log(`📋 Requesting more info for credit application ${id}`);

    const application = await InstallmentOrder.findById(id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบคำขออนุมัติที่ระบุ'
      });
    }

    // Update application status
    const updateData = {
      status: 'pending_documents',
      approvalNotes: [
        ...(application.approvalNotes || []),
        {
          action: 'request_more_info',
          requiredDocuments: requiredDocuments || [],
          notes: notes || '',
          userId: req.user?.id,
          timestamp: new Date()
        }
      ],
      requiredDocuments: requiredDocuments || [],
      updatedAt: new Date()
    };

    await InstallmentOrder.findByIdAndUpdate(id, updateData);

    res.json({
      success: true,
      message: 'ส่งคำขอเอกสารเพิ่มเติมเรียบร้อยแล้ว',
      data: {
        applicationId: id,
        contractNo: application.contractNo,
        requiredDocuments: requiredDocuments || [],
        requestDate: new Date(),
        status: 'pending_documents'
      }
    });

  } catch (error) {
    console.error('❌ Error requesting more info:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการขอเอกสารเพิ่มเติม',
      error: error.message
    });
  }
});

/**
 * GET /api/credit-approval/statistics
 * Get credit approval statistics
 */
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    const { period = 'monthly', year, month } = req.query;

    const currentDate = new Date();
    let startDate, endDate;

    // Calculate date range
    if (period === 'yearly') {
      const targetYear = year ? parseInt(year) : currentDate.getFullYear();
      startDate = new Date(targetYear, 0, 1);
      endDate = new Date(targetYear + 1, 0, 1);
    } else {
      const targetYear = year ? parseInt(year) : currentDate.getFullYear();
      const targetMonth = month ? parseInt(month) - 1 : currentDate.getMonth();
      startDate = new Date(targetYear, targetMonth, 1);
      endDate = new Date(targetYear, targetMonth + 1, 1);
    }

    const applications = await InstallmentOrder.find({
      createdAt: { $gte: startDate, $lt: endDate }
    }).lean();

    const stats = {
      period: period,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: new Date(endDate.getTime() - 1).toISOString().split('T')[0]
      },
      totals: {
        totalApplications: applications.length,
        approved: applications.filter(app => app.status === 'approved').length,
        rejected: applications.filter(app => app.status === 'rejected').length,
        pending: applications.filter(app => ['pending_approval', 'under_review', 'pending_documents'].includes(app.status)).length,
        totalRequestedAmount: applications.reduce((sum, app) => sum + (app.totalAmount || 0), 0),
        totalApprovedAmount: applications.filter(app => app.status === 'approved').reduce((sum, app) => sum + (app.approvedAmount || app.totalAmount || 0), 0)
      },
      rates: {
        approvalRate: applications.length > 0
          ? Math.round((applications.filter(app => app.status === 'approved').length / applications.length) * 100)
          : 0,
        rejectionRate: applications.length > 0
          ? Math.round((applications.filter(app => app.status === 'rejected').length / applications.length) * 100)
          : 0,
        averageProcessingDays: 0 // Would need to calculate based on approval/rejection dates
      }
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Error getting approval statistics:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงสstatisticsิติการอนุมัติ',
      error: error.message
    });
  }
});

module.exports = router;