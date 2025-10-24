/**
 * Bad Debt Routes - API endpoints for bad debt management
 * จัดการ API สำหรับข้อมูลหนี้สูญ
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/authJWT');
const BadDebtController = require('../controllers/badDebtController');

// Import models for legacy routes
const InstallmentOrder = require('../models/Installment/InstallmentOrder');
const InstallmentPayment = require('../models/Installment/InstallmentPayment');

// New comprehensive routes using BadDebtController

/**
 * GET /api/bad-debt/list
 * Get list of bad debts with pagination and filtering
 */
router.get('/list', authenticateToken, BadDebtController.getList);

/**
 * 🔥 NEW: GET /api/bad-debt/integrated-list
 * Get integrated bad debt list including installment contracts
 * รายการหนี้สูญแบบรวม (รวมสัญญาผ่อนชำระ)
 */
router.get('/integrated-list', authenticateToken, BadDebtController.getIntegratedList);

/**
 * GET /api/bad-debt/statistics
 * Get comprehensive bad debt statistics and analysis
 */
router.get('/statistics', authenticateToken, BadDebtController.getStatistics);

/**
 * GET /api/bad-debt/aged-analysis
 * Get aged receivables analysis
 */
router.get('/aged-analysis', authenticateToken, BadDebtController.getAgedAnalysis);

/**
 * GET /api/bad-debt/criteria
 * Get bad debt classification criteria
 */
router.get('/criteria', authenticateToken, BadDebtController.getCriteria);

/**
 * POST /api/bad-debt/criteria
 * Update bad debt classification criteria
 */
router.post('/criteria', authenticateToken, BadDebtController.updateCriteria);

/**
 * GET /api/bad-debt/export
 * Export bad debt report in various formats
 */
router.get('/export', authenticateToken, BadDebtController.exportReport);

// Legacy routes for backward compatibility

/**
 * GET /api/bad-debt/stats
 * ดึงสถิติหนี้สูญทั่วไป (legacy route - use /statistics instead)
 */
router.get('/stats', /* authenticateToken, */ async (req, res) => {
  try {
    console.log('📊 Getting bad debt statistics...');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // ดึงข้อมูลสัญญาทั้งหมด
    const totalContracts = await InstallmentOrder.countDocuments({});
    const monthlyContracts = await InstallmentOrder.countDocuments({
      createdAt: { $gte: startOfMonth }
    });
    const yearlyContracts = await InstallmentOrder.countDocuments({
      createdAt: { $gte: startOfYear }
    });

    // คำนวณหนี้ค้างชำระ
    const overdueContracts = await InstallmentOrder.find({
      status: { $in: ['ongoing', 'overdue'] }
    }).lean();

    const overdueAmount = overdueContracts.reduce((total, contract) => {
      const remaining = (contract.finalTotalAmount || contract.totalAmount || 0) - (contract.paidAmount || 0);
      return total + Math.max(0, remaining);
    }, 0);

    // คำนวณหนี้สูญจริง (สัญญาที่ยกเลิกหรือไม่สามารถเก็บได้)
    const badDebtContracts = await InstallmentOrder.find({
      status: 'cancelled'
    }).lean();

    const badDebtAmount = badDebtContracts.reduce((total, contract) => {
      return total + (contract.finalTotalAmount || contract.totalAmount || 0);
    }, 0);

    // สถิติการชำระเงิน
    const totalPayments = await InstallmentPayment.countDocuments({
      status: 'completed'
    });
    const monthlyPayments = await InstallmentPayment.countDocuments({
      status: 'completed',
      paymentDate: { $gte: startOfMonth }
    });

    // คำนวณอัตราการเก็บเงิน
    const totalAmount = overdueAmount + badDebtAmount;
    const collectionRate = totalAmount > 0 ?
      ((totalAmount - badDebtAmount) / totalAmount) * 100 : 100;

    // สถิติตามอายุหนี้
    const aging30 = await InstallmentOrder.countDocuments({
      status: 'overdue',
      updatedAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
    });

    const aging60 = await InstallmentOrder.countDocuments({
      status: 'overdue',
      updatedAt: {
        $gte: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
        $lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      }
    });

    const aging90Plus = await InstallmentOrder.countDocuments({
      status: 'overdue',
      updatedAt: { $lt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) }
    });

    const stats = {
      overview: {
        totalContracts,
        monthlyContracts,
        yearlyContracts,
        overdueContracts: overdueContracts.length,
        badDebtContracts: badDebtContracts.length
      },
      amounts: {
        overdueAmount: Math.round(overdueAmount),
        badDebtAmount: Math.round(badDebtAmount),
        totalAtRisk: Math.round(overdueAmount + badDebtAmount),
        collectionRate: Math.round(collectionRate * 100) / 100
      },
      payments: {
        totalPayments,
        monthlyPayments,
        paymentRate: totalContracts > 0 ?
          Math.round((totalPayments / totalContracts) * 100) / 100 : 0
      },
      aging: {
        '30days': aging30,
        '60days': aging60,
        '90plus': aging90Plus
      },
      trends: {
        monthly: {
          contracts: monthlyContracts,
          payments: monthlyPayments
        }
      }
    };

    console.log('✅ Bad debt statistics retrieved successfully');

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting bad debt stats:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงสถิติหนี้สูญ: ' + error.message
    });
  }
});

/**
 * GET /api/bad-debt/analysis
 * วิเคราะห์หนี้สูญแบบละเอียด (legacy route - use /aged-analysis instead)
 */
router.get('/analysis', /* authenticateToken, */ async (req, res) => {
  try {
    console.log('📈 Getting detailed bad debt analysis...');

    const { period = 'monthly', limit = 10 } = req.query;

    // ดึงข้อมูลหนี้เสี่ยง
    const riskContracts = await InstallmentOrder.find({
      status: { $in: ['overdue', 'ongoing'] }
    })
    .populate('customer_id', 'individual')
    .sort({ updatedAt: 1 })
    .limit(parseInt(limit))
    .lean();

    const analysis = riskContracts.map(contract => {
      const customer = contract.customer_id;
      const customerName = customer ?
        `${customer.individual?.firstName || ''} ${customer.individual?.lastName || ''}`.trim() :
        'ไม่ระบุ';

      const totalAmount = contract.finalTotalAmount || contract.totalAmount || 0;
      const paidAmount = contract.paidAmount || 0;
      const remainingAmount = totalAmount - paidAmount;

      // คำนวณอายุหนี้
      const daysSinceUpdate = Math.floor((new Date() - new Date(contract.updatedAt)) / (1000 * 60 * 60 * 24));

      let riskLevel = 'low';
      if (daysSinceUpdate > 90) riskLevel = 'high';
      else if (daysSinceUpdate > 60) riskLevel = 'medium';
      else if (daysSinceUpdate > 30) riskLevel = 'warning';

      return {
        contractNumber: contract.contractNumber,
        customerName,
        totalAmount,
        paidAmount,
        remainingAmount,
        daysSinceUpdate,
        riskLevel,
        status: contract.status,
        lastPaymentDate: contract.lastPaymentDate || contract.updatedAt
      };
    });

    res.json({
      success: true,
      data: {
        analysis,
        summary: {
          totalContracts: riskContracts.length,
          totalAtRisk: analysis.reduce((sum, item) => sum + item.remainingAmount, 0),
          highRisk: analysis.filter(item => item.riskLevel === 'high').length,
          mediumRisk: analysis.filter(item => item.riskLevel === 'medium').length
        }
      }
    });

  } catch (error) {
    console.error('❌ Error getting bad debt analysis:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการวิเคราะห์หนี้สูญ: ' + error.message
    });
  }
});

module.exports = router;