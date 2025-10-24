/**
 * Installment Routes - API endpoints for installment system
 * เชื่อมต่อกับ installmentController สำหรับระบบผ่อนชำระ
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const installmentController = require('../controllers/installmentController');
const authenticateToken = require('../middlewares/authJWT');

// Import PDF Controllers
const QuotationPdfController = require('../controllers/QuotationPdfController');
const TaxInvoiceController = require('../controllers/TaxInvoiceController');

// Import models for tax system
const InstallmentOrder = require('../models/Installment/InstallmentOrder');
const TaxInvoice = require('../models/TaxInvoice');
const InstallmentCustomer = require('../models/Installment/InstallmentCustomer');

// Helper function for Thai date formatting
function formatThaiDate(dateInput) {
  if (!dateInput) return '-';
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '-';

    const day = date.getDate();
    const month = date.toLocaleDateString('th-TH', {month: 'long'});
    const thaiYear = date.getFullYear() + 543;

    return `${day} ${month} ${thaiYear}`;
  } catch (e) {
    return '-';
  }
}

// Simple test endpoint
router.get('/test-route', (req, res) => {
  res.json({
    success: true,
    message: 'Installment routes are working',
    timestamp: new Date().toISOString(),
    availableRoutes: [
      'GET /api/installment/bad-debt/criteria',
      'POST /api/installment/bad-debt/criteria',
      'GET /api/installment/customers',
      'GET /api/installment/bad-debt/export'
    ]
  });
});
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'InstallmentRoutes is working!',
    timestamp: new Date().toISOString()
  });
});

// =============================================
// MAIN INSTALLMENT CRUD ROUTES
// =============================================

// สร้างสัญญาผ่อนชำระใหม่
// Temporarily disable auth for testing - REMOVE IN PRODUCTION
router.post('/create', installmentController.createInstallment);

// ตัดสต๊อกหลังจากสัญญาสร้างสำเร็จ
// router.post('/deduct-stock/:orderId', authenticateToken, installmentController.deductStockAfterContractSuccess);

// ดึงรายการสัญญาผ่อนชำระทั้งหมด (ต้องอยู่ก่อน /:id)
router.get('/list', authenticateToken, installmentController.getInstallmentList);

/**
 * GET /api/installment/customers
 * ดึงข้อมูลลูกค้าผ่อนทั้งหมด
 */
router.get('/customers', authenticateToken, installmentController.getInstallmentCustomers);

// อัพเดทข้อมูลสัญญาผ่อนชำระ (ต้องไว้ก่อน /:id route)
router.put('/:id', authenticateToken, installmentController.updateInstallment);

// =============================================
// 🔥 BAD DEBT INTEGRATION ROUTES
// =============================================

/**
 * POST /api/installment/complete-step4/:installmentId
 * Complete Step4 process and automatically create debt record
 * อนุมัติสัญญาและสร้างระบบติดตามหนี้อัตโนมัติ
 */
router.post('/complete-step4/:installmentId', authenticateToken, installmentController.completeStep4AndCreateDebtRecord);

/**
 * GET /api/installment/bad-debt/contracts
 * Get contracts formatted for bad debt management display
 * ดึงข้อมูลสัญญาสำหรับแสดงในระบบจัดการหนี้สูญ
 */
router.get('/bad-debt/contracts', authenticateToken, installmentController.getContractsForBadDebtDisplay);

/**
 * POST /api/installment/convert-to-debt/:installmentId
 * Convert specific installment contract to debt record
 * แปลงสัญญาผ่อนชำระเฉพาะใบให้เป็นข้อมูลหนี้สูญ
 */
router.post('/convert-to-debt/:installmentId', authenticateToken, async (req, res) => {
  try {
    const { installmentId } = req.params;
    const { userId } = req.body;

    const installmentOrder = await InstallmentOrder.findById(installmentId);
    if (!installmentOrder) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบสัญญาผ่อนชำระ'
      });
    }

    const debtRecord = await installmentController.convertInstallmentToDebtRecord(installmentOrder, { userId });

    res.json({
      success: true,
      message: 'แปลงสัญญาเป็นข้อมูลหนี้สูญเรียบร้อย',
      data: debtRecord
    });

  } catch (error) {
    console.error('❌ Error converting installment to debt:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถแปลงสัญญาเป็นข้อมูลหนี้สูญได้',
      error: error.message
    });
  }
});

/**
 * GET /api/installment/payment-schedule/:installmentId
 * Generate payment schedule from contract terms
 * สร้างตารางการชำระเงินจากเงื่อนไขสัญญา
 */
router.get('/payment-schedule/:installmentId', authenticateToken, async (req, res) => {
  try {
    const { installmentId } = req.params;

    const installmentOrder = await InstallmentOrder.findById(installmentId);
    if (!installmentOrder) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบสัญญาผ่อนชำระ'
      });
    }

    const paymentSchedule = await installmentController.generatePaymentScheduleFromContract(installmentOrder);

    res.json({
      success: true,
      message: 'สร้างตารางการชำระเงินเรียบร้อย',
      data: {
        contractNumber: installmentOrder.contractNo,
        customerName: `${installmentOrder.customer_info?.firstName || ''} ${installmentOrder.customer_info?.lastName || ''}`.trim(),
        paymentSchedule: paymentSchedule,
        summary: {
          totalInstallments: installmentOrder.installmentCount || 0,
          monthlyPayment: installmentOrder.monthlyPayment || 0,
          paidInstallments: paymentSchedule.filter(p => p.status === 'paid').length,
          overdueInstallments: paymentSchedule.filter(p => p.status === 'overdue').length
        }
      }
    });

  } catch (error) {
    console.error('❌ Error generating payment schedule:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถสร้างตารางการชำระเงินได้',
      error: error.message
    });
  }
});

/**
 * GET /api/installment/debt-analysis/:installmentId
 * Get comprehensive debt analysis for specific contract
 * วิเคราะห์หนี้แบบละเอียดสำหรับสัญญาเฉพาะ
 */
router.get('/debt-analysis/:installmentId', authenticateToken, async (req, res) => {
  try {
    const { installmentId } = req.params;

    const installmentOrder = await InstallmentOrder.findById(installmentId);
    if (!installmentOrder) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบสัญญาผ่อนชำระ'
      });
    }

    // สร้างการวิเคราะห์หนี้แบบครบถ้วน
    const debtRecord = await installmentController.convertInstallmentToDebtRecord(installmentOrder);
    const paymentSchedule = await installmentController.generatePaymentScheduleFromContract(installmentOrder);

    // คำนวณสถิติเพิ่มเติม
    const totalOverdue = paymentSchedule.filter(p => p.status === 'overdue').length;
    const totalPaid = paymentSchedule.filter(p => p.status === 'paid').length;
    const paymentHistory = installmentOrder.payments || [];

    res.json({
      success: true,
      message: 'วิเคราะห์หนี้เรียบร้อย',
      data: {
        contractInfo: {
          contractNumber: installmentOrder.contractNo,
          status: installmentOrder.status,
          createdDate: installmentOrder.createdAt,
          branchCode: installmentOrder.branch_code
        },
        debtAnalysis: debtRecord,
        paymentSchedule: paymentSchedule,
        statistics: {
          totalInstallments: installmentOrder.installmentCount || 0,
          paidInstallments: totalPaid,
          overdueInstallments: totalOverdue,
          paymentRate: installmentOrder.installmentCount > 0 ? (totalPaid / installmentOrder.installmentCount * 100).toFixed(2) : 0,
          lastPaymentDate: debtRecord.agingAnalysis.lastPaymentDate,
          nextDueDate: debtRecord.agingAnalysis.nextDueDate
        },
        recommendations: {
          immediate: debtRecord.badDebtClassification.recommendations,
          followUp: this.generateFollowUpRecommendations(debtRecord.agingAnalysis.daysPastDue, debtRecord.currentBalance)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error in debt analysis:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถวิเคราะห์หนี้ได้',
      error: error.message
    });
  }
});

// Helper function for follow-up recommendations
function generateFollowUpRecommendations(daysPastDue, remainingAmount) {
  const recommendations = [];

  if (daysPastDue > 90) {
    recommendations.push('กำหนดการติดตามรายสัปดาห์');
    recommendations.push('พิจารณาการเจรจาการผ่อนผันชำระ');
  } else if (daysPastDue > 30) {
    recommendations.push('กำหนดการติดตามรายเดือน');
    recommendations.push('ส่งการแจ้งเตือนทาง SMS/Email');
  }

  if (remainingAmount > 100000) {
    recommendations.push('แต่งตั้งทีมติดตามพิเศษ');
  }

  return recommendations;
}

// =============================================
// EXISTING ROUTES
// =============================================

// Simple deposits endpoint
router.get('/deposits', async (req, res) => {
  try {
    console.log('💰 GET /api/installment/deposits - fetching from deposit-receipts');

    const { page = 1, limit = 10, search, status, branch, date } = req.query;

    // Build query parameters for deposit-receipts API
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    if (branch) params.append('branchCode', branch);
    if (date) params.append('date', date);
    params.append('limit', limit);
    params.append('page', page);

    // เก็บผลลัพธ์จาก internal API call
    let depositData = [];
    let totalCount = 0;
    let statistics = {
      totalAmount: 0,
      totalCount: 0,
      pendingCount: 0,
      todayAmount: 0
    };

    try {
      // ใช้ axios แทน node-fetch และเรียกผ่าน localhost
      const axios = require('axios');

      // ลองเรียกโดยไม่ใช้ authorization ก่อน
      let apiUrl = `http://127.0.0.1:3000/api/deposit-receipts?${params.toString()}`;
      console.log('🔗 Calling API:', apiUrl);

      const response = await axios.get(apiUrl, {
        headers: {
          'Content-Type': 'application/json'
          // ลบ Authorization ออกก่อนเพื่อทดสอบ
        }
      });

      console.log('✅ API Response status:', response.status);
      console.log('📄 API Response data keys:', Object.keys(response.data));
      console.log('📄 Raw API response data type:', typeof response.data.data);
      console.log('📄 Raw API response success:', response.data.success);
      console.log('📄 Raw API response data length:', response.data.data ? response.data.data.length : 'undefined');

      if (response.data && response.data.success && response.data.data) {
        console.log(`✅ Found ${response.data.data.length} deposit receipts`);
        console.log('🔍 First receipt sample:', JSON.stringify(response.data.data[0], null, 2));

        // แปลงข้อมูลจาก deposit-receipts format เป็น deposits format
        depositData = response.data.data.map((receipt, index) => {
          console.log(`🔍 Processing receipt ${index + 1}:`, receipt.receiptNumber || receipt._id);
          console.log(`🔍 Receipt structure:`, Object.keys(receipt));

          // Handle different customer name formats
          let customerName = 'ไม่ระบุ';
          if (receipt.customer && receipt.customer.name) {
            customerName = receipt.customer.name;
          } else if (receipt.customerName) {
            customerName = receipt.customerName;
          } else if (receipt.customer) {
            const { firstName, lastName, prefix } = receipt.customer;
            if (firstName || lastName) {
              customerName = `${prefix || ''} ${firstName || ''} ${lastName || ''}`.trim();
            }
          }

          // Handle product information
          let productName = 'ไม่ระบุ';
          let productId = null;
          if (receipt.product && receipt.product.name) {
            productName = receipt.product.name;
            productId = receipt.productId || receipt.product._id;
          } else if (receipt.productName) {
            productName = receipt.productName;
            productId = receipt.productId;
          }

          // Handle deposit amount from different possible fields
          let depositAmount = 0;
          if (receipt.amounts && receipt.amounts.depositAmount) {
            depositAmount = receipt.amounts.depositAmount;
          } else if (receipt.depositAmount) {
            depositAmount = receipt.depositAmount;
          } else if (receipt.paymentAmount) {
            depositAmount = receipt.paymentAmount;
          }

          // Handle branch information
          let branchName = 'ไม่ระบุ';
          let branchId = null;
          if (receipt.branch && receipt.branch.name) {
            branchName = receipt.branch.name;
            branchId = receipt.branch.code || receipt.branch_code;
          } else if (receipt.branch_code) {
            branchId = receipt.branch_code;
            branchName = getBranchName(receipt.branch_code);
          }

          return {
            _id: receipt._id,
            receiptNumber: receipt.receiptNumber,
            contractNo: receipt.receiptNumber, // Using receiptNumber as contract reference
            dateCreated: receipt.depositDate || receipt.receiptDate || receipt.createdAt,
            customerId: receipt.customer?.taxId || receipt.customerTaxId,
            customerName: customerName,
            customerPhone: receipt.customer?.phone || receipt.customerPhone || '',
            customerAddress: receipt.customer?.address?.fullAddress || receipt.customerAddress || '',
            productId: productId,
            productName: productName,
            productPrice: receipt.product?.price || receipt.productPrice || 0,
            depositAmount: depositAmount,
            totalAmount: receipt.amounts?.totalAmount || receipt.totalAmount || receipt.product?.price || receipt.productPrice || 0,
            remainingAmount: receipt.amounts?.remainingAmount || receipt.remainingAmount || 0,
            paymentMethod: receipt.paymentMethod || receipt.paymentType || 'cash',
            paymentDate: receipt.depositDate || receipt.paymentDate || receipt.receiptDate,
            branchId: branchId,
            branchName: branchName,
            status: receipt.status || 'active',
            saleType: receipt.saleType || 'cash',
            depositType: receipt.depositType || 'online',
            expiryDate: receipt.expiryDate,
            notes: receipt.notes || '',
            createdAt: receipt.createdAt,
            updatedAt: receipt.updatedAt
          };
        });

        totalCount = response.data.pagination?.totalDocs || response.data.total || depositData.length;

        // คำนวณสถิติจากข้อมูลจริง
        const totalAmount = depositData.reduce((sum, item) => sum + (item.depositAmount || 0), 0);
        const pendingCount = depositData.filter(item =>
          item.status === 'pending' || item.status === 'draft'
        ).length;
        const activeCount = depositData.filter(item =>
          item.status === 'active'
        ).length;

        // เงินมัดจำวันนี้
        const today = new Date().toISOString().split('T')[0];
        const todayAmount = depositData
          .filter(item => {
            const itemDate = item.dateCreated || item.paymentDate;
            return itemDate && itemDate.split('T')[0] === today;
          })
          .reduce((sum, item) => sum + (item.depositAmount || 0), 0);

        // ใช้สถิติจาก API ถ้ามี หรือคำนวณเอง
        if (response.data.statistics) {
          statistics = {
            totalAmount: response.data.statistics.totalAmount || totalAmount,
            totalCount: response.data.statistics.totalCount || totalCount,
            pendingCount: response.data.statistics.pendingCount || pendingCount,
            activeCount: response.data.statistics.completedCount || activeCount,
            todayAmount: todayAmount
          };
        } else {
          statistics = {
            totalAmount,
            totalCount,
            pendingCount,
            activeCount,
            todayAmount
          };
        }

        console.log('📊 Statistics calculated:', statistics);
      } else {
        console.log('ℹ️ No data found in response');
      }
    } catch (fetchError) {
      console.error('⚠️ Could not fetch from deposit-receipts API:', fetchError.message);
      if (fetchError.response) {
        console.error('❌ Response status:', fetchError.response.status);
        console.error('❌ Response data:', fetchError.response.data);
      }
      // ใช้ข้อมูล mock หากไม่สามารถเรียก API ได้
    }

    res.json({
      success: true,
      data: depositData,
      total: totalCount,
      page: parseInt(page),
      limit: parseInt(limit),
      statistics: statistics,
      message: `ดึงข้อมูลเงินมัดจำสำเร็จ ${depositData.length} รายการ`
    });

  } catch (error) {
    console.error('❌ Error getting deposits:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเงินมัดจำ: ' + error.message
    });
  }
});

// Import security middleware
const {
  financialOperationsLimiter,
  generalInstallmentLimiter,
  sanitizeInput,
  validateContractData,
  validatePaymentData,
  validateRefundData,
  validateLatePaymentData,
  validatePaymentScheduleData,
  validateCancellationData,
  handleValidationErrors,
  securityHeaders,
  auditFinancialOperation
} = require('../middlewares/installmentSecurity');

// Models
const InstallmentPayment = require('../models/Installment/InstallmentPayment');

// ฟังก์ชันช่วยสำหรับแปลงรหัสสาขาเป็นชื่อสาขา
function getBranchName(branchCode) {
  const branches = {
    '00000': 'สำนักงานใหญ่',
    '00001': 'สาขาหาดใหญ่',
    '00002': 'สาขาพัทลุง',
    '00003': 'สาขาสตูล',
    '00004': 'สาขานครศรีธรรมราช',
    '00005': 'สาขาสุไหง-โกลก'
  };
  return branches[branchCode] || `สาขา ${branchCode}`;
}

/**
 * Process boxset stock deduction for installment contracts
 * @param {Object} item - Boxset item to process
 * @param {String} branchCode - Branch code
 * @param {String} contractNumber - Contract number
 * @param {String} source - Source of the operation
 * @returns {Object} - Processing result
 */
async function processBoxsetStock(item, branchCode, contractNumber, source) {
  try {
    console.log(`🎁 Processing boxset stock deduction: ${item.name}`);

    const BranchStock = require('../models/POS/BranchStock');
    const BranchStockHistory = require('../models/POS/BranchStockHistory');
    const Boxset = require('../models/POS/Boxset');

    // Find the boxset in BranchStock
    let stockItem;
    if (item.boxsetId) {
      stockItem = await BranchStock.findOne({
        boxsetId: item.boxsetId,
        branch_code: branchCode,
        verified: true,
        stock_value: { $gt: 0 }
      });
    } else {
      stockItem = await BranchStock.findOne({
        _id: item.id || item.productId,
        branch_code: branchCode,
        productType: 'boxset',
        verified: true,
        stock_value: { $gt: 0 }
      });
    }

    if (!stockItem) {
      return {
        success: false,
        productId: item.id || item.productId,
        productName: item.name,
        error: 'ไม่พบ Boxset ในสต็อกหรือสต็อกไม่เพียงพอ',
        stockBefore: 0,
        stockAfter: 0
      };
    }

    const quantityToDeduct = item.quantity || 1;
    if (stockItem.stock_value < quantityToDeduct) {
      return {
        success: false,
        productId: stockItem._id,
        productName: item.name,
        error: `Boxset มีสต็อกไม่เพียงพอ (ต้องการ ${quantityToDeduct} มี ${stockItem.stock_value})`,
        stockBefore: stockItem.stock_value,
        stockAfter: stockItem.stock_value
      };
    }

    // Get boxset details
    const boxset = await Boxset.findById(stockItem.boxsetId);
    if (!boxset) {
      return {
        success: false,
        productId: stockItem._id,
        productName: item.name,
        error: 'ไม่พบข้อมูล Boxset',
        stockBefore: stockItem.stock_value,
        stockAfter: stockItem.stock_value
      };
    }

    const stockBefore = stockItem.stock_value;
    const stockAfter = stockBefore - quantityToDeduct;

    // Update boxset stock
    await BranchStock.findByIdAndUpdate(
      stockItem._id,
      {
        stock_value: stockAfter,
        updated_at: new Date()
      }
    );

    // Update boxset document
    await Boxset.findByIdAndUpdate(
      boxset._id,
      {
        stock_value: stockAfter,
        status: stockAfter === 0 ? 'sold' : 'active',
        updatedAt: new Date()
      }
    );

    // If boxset is sold, add to sales history
    if (stockAfter === 0) {
      await Boxset.findByIdAndUpdate(
        boxset._id,
        {
          $push: {
            salesHistory: {
              soldAt: new Date(),
              saleType: 'installment',
              contractNumber: contractNumber,
              totalAmount: item.totalPrice || boxset.boxsetPrice,
              customerInfo: {
                name: item.customerName || 'ลูกค้าผ่อน',
                phone: item.customerPhone || '',
                email: item.customerEmail || ''
              }
            }
          }
        }
      );
    }

    // Create stock history record for boxset
    const historyData = {
      product_id: stockItem._id,
      product_name: item.name,
      branch_code: branchCode,
      change_type: 'OUT',
      quantity_before: stockBefore,
      quantity_after: stockAfter,
      quantity_changed: quantityToDeduct,
      price_per_unit: boxset.boxsetPrice,
      cost_per_unit: boxset.totalCost,
      total_amount: (boxset.boxsetPrice * quantityToDeduct),
      total_cost: (boxset.totalCost * quantityToDeduct),
      reason: 'ขายแบบผ่อน (Boxset)',
      reference_id: contractNumber,
      reference_type: 'installment_contract',
      performed_by: item.performedBy,
      performed_at: new Date(),
      details: {
        contractNumber: contractNumber,
        source: source,
        boxsetId: boxset._id.toString(),
        boxsetProducts: boxset.products,
        action: 'boxset_installment_sale'
      }
    };

    const history = new BranchStockHistory(historyData);
    await history.save();

    console.log(`✅ Boxset stock updated: ${item.name} (${stockBefore} → ${stockAfter})`);

    return {
      success: true,
      productId: stockItem._id,
      productName: item.name,
      productType: 'boxset',
      stockBefore: stockBefore,
      stockAfter: stockAfter,
      quantityDeducted: quantityToDeduct,
      boxsetInfo: {
        boxsetId: boxset._id,
        totalCost: boxset.totalCost,
        boxsetPrice: boxset.boxsetPrice,
        products: boxset.products
      }
    };

  } catch (error) {
    console.error(`❌ Error processing boxset ${item.name}:`, error);
    return {
      success: false,
      productId: item.id || item.productId,
      productName: item.name,
      error: `เกิดข้อผิดพลาด: ${error.message}`,
      stockBefore: 0,
      stockAfter: 0
    };
  }
}

// ========== MAIN INSTALLMENT CREATION ==========

/**
 * POST /api/installment
 * สร้างสัญญาผ่อนใหม่
 */
router.post('/',
  securityHeaders,
  sanitizeInput,
  authenticateToken,
  generalInstallmentLimiter,
  validateContractData,
  handleValidationErrors,
  async (req, res) => {
  try {
    console.log('📋 Creating new installment contract...');
    return await installmentController.createInstallment(req, res);
  } catch (error) {
    console.error('❌ Error in installment creation route:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างสัญญาผ่อน: ' + error.message
    });
  }
});

// 🔧 TEMPORARY TESTING NOTE:
// Authentication has been temporarily disabled for several routes to enable testing
// without requiring user login. Re-enable authentication before production deployment!

// ========== EMAIL SENDING ==========

/**
 * POST /api/installment/send-email
 * ส่งเอกสารทาง Email ให้ลูกค้า
 */
router.post('/send-email',
  securityHeaders,
  sanitizeInput,
  authenticateToken,
  generalInstallmentLimiter,
  async (req, res) => {
  try {
    const { recipient, subject, body, attachmentUrls } = req.body;
    console.log('📧 Sending installment documents email to:', recipient.email);

    // Validate input
    if (!recipient || !recipient.email) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุอีเมลผู้รับ'
      });
    }

    if (!attachmentUrls || attachmentUrls.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ไม่มีเอกสารให้ส่ง'
      });
    }

    // Import email service
    const emailService = require('../services/emailService');

    // Prepare email data
    const emailData = {
      to: recipient.email,
      toName: recipient.name || 'ลูกค้า',
      subject: subject || 'เอกสารสัญญาผ่อนชำระ',
      body: body || 'เอกสารสัญญาผ่อนชำระของท่าน',
      attachmentUrls: attachmentUrls,
      from: process.env.EMAIL_FROM || 'noreply@pattani-installment.com',
      fromName: process.env.COMPANY_NAME || 'ระบบผ่อน Pattani'
    };

    // Send email
    const result = await emailService.sendInstallmentDocuments(emailData);

    console.log('✅ Email sent successfully:', result);

    return res.json({
      success: true,
      message: 'ส่งเอกสารทาง Email เรียบร้อยแล้ว',
      data: result
    });

  } catch (error) {
    console.error('❌ Error sending email:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการส่ง Email: ' + error.message
    });
  }
});

/**
 * POST /api/installment/update-stock
 * อัพเดทสต็อกหลังจากสร้างสัญญาผ่อน
 */
router.post('/update-stock', async (req, res) => {
  try {
    console.log('📦 Stock update request received:', req.body);

    const {
      contractNumber,
      branchCode,
      items = [],
      timestamp,
      source = 'installment_contract'
    } = req.body;

    if (!contractNumber) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุเลขที่สัญญา'
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบรายการสินค้าที่ต้องตัดสต็อก'
      });
    }

    // Import required models
    const BranchStock = require('../models/POS/BranchStock');
    const BranchStockHistory = require('../models/POS/BranchStockHistory');
    const Boxset = require('../models/POS/Boxset');

    const stockUpdateResults = [];
    const currentBranch = branchCode || 'MAIN';

    console.log(`📦 Processing ${items.length} items for branch: ${currentBranch}`);

    for (const item of items) {
      try {
        console.log(`📦 Processing item: ${item.name} (ID: ${item.id || item.productId})`);

        // Check if item is a boxset
        if (item.productType === 'boxset' || item.stockType === 'boxset') {
          console.log(`🎁 Processing boxset: ${item.name}`);

          // Handle boxset stock deduction
          const result = await processBoxsetStock(item, currentBranch, contractNumber, source);
          stockUpdateResults.push(result);
          continue;
        }

        let stockQuery = {};

        // Build query based on item data
        if (item.imei && item.imei.trim() !== '') {
          // IMEI-based item
          stockQuery = {
            branch_code: currentBranch,
            imei: item.imei,
            quantity: { $gt: 0 }
          };
        } else if (item.id || item.productId) {
          // Product ID-based item
          const productId = item.id || item.productId;
          stockQuery = {
            branch_code: currentBranch,
            product: productId,
            quantity: { $gt: 0 }
          };
        } else {
          console.warn(`⚠️ Skipping item ${item.name} - no ID or IMEI`);
          stockUpdateResults.push({
            item: item.name,
            success: false,
            message: 'ไม่มี ID หรือ IMEI'
          });
          continue;
        }

        console.log('📦 Stock query:', stockQuery);

        // Find stock
        const stockRecord = await BranchStock.findOne(stockQuery);

        if (!stockRecord) {
          console.warn(`⚠️ No stock found for item: ${item.name}`);
          stockUpdateResults.push({
            item: item.name,
            success: false,
            message: 'ไม่พบสต็อก'
          });
          continue;
        }

        const requestedQty = parseInt(item.quantity) || 1;

        if (stockRecord.quantity < requestedQty) {
          console.warn(`⚠️ Insufficient stock for ${item.name}. Available: ${stockRecord.quantity}, Requested: ${requestedQty}`);
          stockUpdateResults.push({
            item: item.name,
            success: false,
            message: `สต็อกไม่เพียงพอ (มี ${stockRecord.quantity} ต้องการ ${requestedQty})`
          });
          continue;
        }

        // Update stock quantity
        const newQuantity = stockRecord.quantity - requestedQty;

        await BranchStock.findByIdAndUpdate(
          stockRecord._id,
          {
            quantity: newQuantity,
            updated_at: new Date()
          }
        );

        // Create stock history record
        const historyRecord = new BranchStockHistory({
          product: stockRecord.product,
          branch_code: currentBranch,
          transaction_type: 'sale',
          quantity_before: stockRecord.quantity,
          quantity_change: -requestedQty,
          quantity_after: newQuantity,
          reference_type: 'installment_contract',
          reference_id: contractNumber,
          imei: item.imei || '',
          notes: `ตัดสต็อกจากสัญญาผ่อน ${contractNumber}`,
          created_by: 'system',
          created_at: new Date()
        });

        await historyRecord.save();

        console.log(`✅ Stock updated successfully for ${item.name}: ${stockRecord.quantity} → ${newQuantity}`);

        stockUpdateResults.push({
          item: item.name,
          success: true,
          previousQuantity: stockRecord.quantity,
          newQuantity: newQuantity,
          quantityDeducted: requestedQty
        });

      } catch (itemError) {
        console.error(`❌ Error updating stock for ${item.name}:`, itemError);
        stockUpdateResults.push({
          item: item.name,
          success: false,
          message: itemError.message
        });
      }
    }

    // Check if any updates failed
    const failed = stockUpdateResults.filter(result => !result.success);
    const successful = stockUpdateResults.filter(result => result.success);

    console.log(`📦 Stock update completed: ${successful.length} success, ${failed.length} failed`);

    if (failed.length > 0) {
      return res.status(207).json({
        success: false,
        message: `บางรายการตัดสต็อกไม่สำเร็จ`,
        results: stockUpdateResults,
        summary: {
          total: items.length,
          successful: successful.length,
          failed: failed.length
        }
      });
    }

    return res.json({
      success: true,
      message: 'ตัดสต็อกสำเร็จทั้งหมด',
      results: stockUpdateResults,
      summary: {
        total: items.length,
        successful: successful.length,
        failed: failed.length
      }
    });

  } catch (error) {
    console.error('❌ Error in stock update:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตัดสต็อก: ' + error.message
    });
  }
});

/**
 * POST /api/installment/send-email
 * ส่งเอกสารทาง Email ให้ลูกค้า
 */
router.post('/send-email', async (req, res) => {
  try {
    console.log('📧 Email send request received:', req.body);

    const {
      email,
      customerName,
      contractNumber,
      documents = ['quotation', 'invoice', 'receipt'],
      message,
      branchCode
    } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุอีเมลผู้รับ'
      });
    }

    if (!contractNumber) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุเลขที่สัญญา'
      });
    }

    // ส่งอีเมลผ่าน emailService
    const emailService = require('../services/emailService');

    const emailData = {
      to: email,
      customerName: customerName || 'ลูกค้า',
      contractNumber: contractNumber,
      documents: documents,
      customMessage: message || '',
      branchCode: branchCode || 'PATTANI'
    };

    const result = await emailService.sendInstallmentDocuments(emailData);

    console.log('✅ Email sent successfully:', result);

    return res.json({
      success: true,
      message: 'ส่งอีเมลเรียบร้อยแล้ว',
      emailAddress: email,
      contractNumber: contractNumber,
      sentDocuments: documents,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Email send error:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการส่งอีเมล',
      error: error.message
    });
  }
});

// ========== INSTALLMENT CONTRACT MANAGEMENT ==========

/**
 * POST /api/installment
 * สร้างสัญญาผ่อนชำระใหม่
 * รับข้อมูลจาก 4-step frontend และส่งไปยัง installmentController.createInstallment
 * 🔧 TEMPORARILY DISABLED AUTHENTICATION FOR TESTING
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('📥 POST /api/installment - Creating new installment contract');
    console.log('📋 Request body keys:', Object.keys(req.body));

    // Validate required fields
    const { customer, items, plan_type, down_payment, installment_count } = req.body;

    if (!customer || !items || !plan_type || !down_payment || !installment_count) {
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ครบถ้วน กรุณาตรวจสอบข้อมูลลูกค้า สินค้า และแผนการชำระ'
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาเลือกสินค้าอย่างน้อย 1 รายการ'
      });
    }

    // Add user info to request (check multiple possible field names)
    req.body.salesperson_id = req.user?.userId || req.user?._id || req.user?.id || 'GUEST';
    req.body.salesperson_name = req.user?.name || req.user?.username || 'พนักงาน';

    // Call installmentController.createInstallment
    await installmentController.createInstallment(req, res);

  } catch (error) {
    console.error('❌ Error in POST /api/installment:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างสัญญาผ่อนชำระ: ' + error.message
    });
  }
});

/**
 * GET /api/installment/debug/:branchCode
 * Debug endpoint to check branch stock data
 */
router.get('/debug/:branchCode', authenticateToken, async (req, res) => {
  try {
    const { branchCode } = req.params;
    const BranchStock = require('../models/POS/BranchStock');
    const Branch = require('../models/Account/Branch');

    // Check if branch exists
    const branch = await Branch.findOne({ branch_code: branchCode }).lean();

    // Get all products for this branch
    const allProducts = await BranchStock.find({ branch_code: branchCode }).lean();
    const productsWithStock = await BranchStock.find({
      branch_code: branchCode,
      stock_value: { $gt: 0 }
    }).lean();

    // Check different purchaseType patterns
    const installmentProducts = await BranchStock.find({
      branch_code: branchCode,
      stock_value: { $gt: 0 },
      purchaseType: { $in: ['installment'] }
    }).lean();

    const purchaseTypeStats = await BranchStock.aggregate([
      { $match: { branch_code: branchCode } },
      { $group: {
        _id: '$purchaseType',
        count: { $sum: 1 },
        examples: { $push: { name: '$name', stock: '$stock_value' } }
      }}
    ]);

    res.json({
      success: true,
      debug: {
        branchCode,
        branchExists: !!branch,
        branchInfo: branch ? { name: branch.name, _id: branch._id } : null,
        counts: {
          totalProducts: allProducts.length,
          productsWithStock: productsWithStock.length,
          installmentProducts: installmentProducts.length
        },
        purchaseTypeStats,
        sampleProducts: allProducts.slice(0, 3).map(p => ({
          _id: p._id,
          name: p.name,
          stock_value: p.stock_value,
          purchaseType: p.purchaseType,
          price: p.price
        }))
      }
    });

  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/installment/products/search
 * ค้นหาสินค้าโดยใช้ IMEI หรือ productId
 * รองรับ q=VALUE&type=imei สำหรับค้นหาด้วย IMEI
 */
router.get('/products/search', authenticateToken, async (req, res) => {
  try {
    const { q, type } = req.query;
    console.log(`📥 GET /api/installment/products/search?q=${q}&type=${type}`);

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุคำค้นหา'
      });
    }

    const BranchStock = require('../models/POS/BranchStock');
    let searchQuery = {};

    if (type === 'imei' && q) {
      // ค้นหาด้วย IMEI
      searchQuery = {
        $or: [
          { imei: q },
          { imei: { $regex: q, $options: 'i' } }
        ],
        stock_value: { $gt: 0 }
      };
      console.log(`🔍 Searching by IMEI: ${q}`);
    } else {
      // ค้นหาด้วย productId หรือชื่อสินค้า
      const isObjectId = mongoose.Types.ObjectId.isValid(q);
      if (isObjectId) {
        searchQuery = {
          _id: new mongoose.Types.ObjectId(q),
          stock_value: { $gt: 0 }
        };
        console.log(`🔍 Searching by ObjectId: ${q}`);
      } else {
        searchQuery = {
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { imei: { $regex: q, $options: 'i' } }
          ],
          stock_value: { $gt: 0 }
        };
        console.log(`🔍 Searching by name/IMEI pattern: ${q}`);
      }
    }

    const products = await BranchStock.find(searchQuery).limit(50).lean();

    console.log(`✅ Found ${products.length} products for search query: ${q}`);

    // Transform products with proper data structure
    const transformedProducts = products.map(product => ({
      _id: product._id,
      id: product.imei || product._id.toString(), // Use IMEI as primary ID
      name: product.name || 'ไม่มีชื่อสินค้า',
      price: product.price || 0,
      stock_value: product.stock_value || 0,
      imei: product.imei || '',
      image: product.image || '',
      brand: product.brand || '',
      branchStockId: product._id, // สำหรับการตัดสต๊อก
      productId: product.productId || product._id.toString(),
      purchaseType: product.purchaseType || ['installment'],
      stockType: product.stockType || 'imei'
    }));

    res.json({
      success: true,
      data: transformedProducts,
      count: transformedProducts.length,
      searchParams: { q, type }
    });

  } catch (error) {
    console.error('❌ Error searching products:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการค้นหาสินค้า: ' + error.message
    });
  }
});

/**
 * GET /api/installment/products/:branchCode
 * ดึงรายการสินค้าที่สามารถขายแบบผ่อนได้ในสาขาที่ระบุ
 */
router.get('/products/:branchCode', authenticateToken, async (req, res) => {
  try {
    const { branchCode } = req.params;
    console.log(`📥 GET /api/installment/products/${branchCode}`);

    // Use BranchStock API to get installment products
    const BranchStock = require('../models/POS/BranchStock');

    // First, check if branch has any products at all
    const allProducts = await BranchStock.find({
      branch_code: branchCode
    }).lean();

    console.log(`📊 Total products in branch ${branchCode}: ${allProducts.length}`);

    // Then filter for installment products with stock
    const query = {
      branch_code: branchCode,
      stock_value: { $gt: 0 }
    };

    // Try multiple query approaches to find installment products
    let products = await BranchStock.find({
      ...query,
      purchaseType: { $in: ['installment'] }
    }).lean();

    // If no products found with strict installment filter, try broader search
    if (products.length === 0) {
      console.log(`⚠️ No strict installment products found, trying broader search...`);

      // Try products that include installment in array
      products = await BranchStock.find({
        ...query,
        $or: [
          { purchaseType: 'installment' },
          { purchaseType: { $elemMatch: { $eq: 'installment' } } },
          { purchaseType: { $exists: false } }, // Include products without purchaseType set
        ]
      }).lean();
    }

    // If still no products, get all products with stock for debugging
    if (products.length === 0) {
      console.log(`⚠️ No installment products found, checking all products with stock...`);
      const productsWithStock = await BranchStock.find(query).lean();
      console.log(`📊 Products with stock: ${productsWithStock.length}`);

      if (productsWithStock.length > 0) {
        console.log(`📋 Sample product structure:`, {
          _id: productsWithStock[0]._id,
          name: productsWithStock[0].name,
          purchaseType: productsWithStock[0].purchaseType,
          stock_value: productsWithStock[0].stock_value
        });
      }
    }

    console.log(`✅ Found ${products.length} installment products for branch ${branchCode}`);

    // Transform products to ensure required fields
    const transformedProducts = products.map(product => ({
      _id: product._id,
      name: product.name || 'ไม่มีชื่อสินค้า',
      price: product.price || 0,
      stock_value: product.stock_value || 0,
      imei: product.imei || '',
      image: product.image || '',
      brand: product.brand || '',
      purchaseType: product.purchaseType || ['installment'],
      downAmount: product.downAmount || 0,
      downInstallment: product.downInstallment || 0,
      downInstallmentCount: product.downInstallmentCount || 0,
      creditThreshold: product.creditThreshold || 0,
      payUseInstallment: product.payUseInstallment || 0,
      payUseInstallmentCount: product.payUseInstallmentCount || 0,
      pricePayOff: product.pricePayOff || 0,
      docFee: product.docFee || 0,
      productType: product.productType || 'mobile',
      stockType: product.stockType || 'imei',
      taxType: product.taxType || 'included',
      taxRate: product.taxRate || 7
    }));

    res.json({
      success: true,
      data: transformedProducts,
      count: transformedProducts.length,
      debug: {
        branchCode,
        totalProducts: allProducts.length,
        productsWithStock: (await BranchStock.find({ branch_code: branchCode, stock_value: { $gt: 0 } }).lean()).length,
        installmentProducts: transformedProducts.length
      }
    });

  } catch (error) {
    console.error('❌ Error getting installment products:', error);
    console.error('❌ Error stack:', error.stack);

    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสินค้าผ่อน',
      error: error.message,
      debug: {
        branchCode: req.params.branchCode,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/installment/history
 * ดึงประวัติสัญญาผ่อนชำระ
 */
router.get('/history', async (req, res) => {
  try {
    console.log('📥 GET /api/installment/history');
    console.log('📝 Query parameters:', req.query);

    // เรียกใช้ controller โดยตรง
    if (installmentController && typeof installmentController.getInstallmentHistory === 'function') {
      console.log('✅ Calling installmentController.getInstallmentHistory');
      await installmentController.getInstallmentHistory(req, res);
    } else {
      console.log('⚠️ installmentController.getInstallmentHistory not available');

      // สร้าง mock data สำหรับ testing
      const mockData = [
        {
          _id: '67890abcdef',
          contractNo: 'INST25680001',
          customerName: 'ทดสอบ ระบบ',
          customerPhone: '081-234-5678',
          productName: 'iPhone 15 Pro',
          totalAmount: 45000,
          monthlyPayment: 1875,
          installmentCount: 24,
          paidCount: 5,
          status: 'active',
          dueDate: new Date(),
          createdAt: new Date()
        }
      ];

      res.json({
        success: true,
        data: mockData,
        message: 'ข้อมูลทดสอบระบบ'
      });
    }

  } catch (error) {
    console.error('❌ Error getting installment history:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงประวัติ: ' + error.message
    });
  }
});

/**
 * GET /api/installment/contract/:contractId
 * ดึงรายละเอียดสัญญาผ่อนชำระ
 */
router.get('/contract/:contractId', authenticateToken, async (req, res) => {
  try {
    const { contractId } = req.params;
    console.log(`📥 GET /api/installment/contract/${contractId}`);

    // Use existing method from installmentController
    req.params.id = contractId;
    await installmentController.getInstallmentReceiptById(req, res);

  } catch (error) {
    console.error('❌ Error getting contract details:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสัญญา: ' + error.message
    });
  }
});

/**
 * POST /api/installment/payment
 * ชำระเงินงวด
 */
router.post('/payment', authenticateToken, async (req, res) => {
  try {
    console.log('📥 POST /api/installment/payment - Processing installment payment');

    // Use existing method from installmentController
    await installmentController.payInstallment(req, res);

  } catch (error) {
    console.error('❌ Error processing payment:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการชำระเงิน: ' + error.message
    });
  }
});

// ========== DOCUMENT GENERATION ==========

/**
 * GET /api/installment/documents/quotation/:quotationNo
 * สร้างและดาวน์โหลดใบเสนอราคา
 */
router.get('/documents/quotation/:quotationNo', async (req, res) => {
  try {
    const { quotationNo } = req.params;
    console.log(`📄 GET /api/installment/documents/quotation/${quotationNo}`);

    // ค้นหาสัญญาจากหมายเลขใบเสนอราคา (รองรับทั้ง _id, contractNo, และ quotationNumber)
    let contract;

    // ลองค้นหาด้วย _id ก่อน (ถ้าเป็น ObjectId format)
    if (mongoose.Types.ObjectId.isValid(quotationNo)) {
      contract = await InstallmentOrder.findById(quotationNo).populate('customer');
    }

    // ถ้าไม่เจอ ลองค้นหาด้วย fields อื่น
    if (!contract) {
      contract = await InstallmentOrder.findOne({
        $or: [
          { contractNo: quotationNo },
          { quotationNumber: quotationNo }
        ]
      }).populate('customer');
    }

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: `ไม่พบสัญญาหมายเลข ${quotationNo}`
      });
    }

    // ใช้ QuotationPdfController สร้าง PDF
    const pdfBuffer = await QuotationPdfController.createQuotationPdf(contract);

    // Set headers สำหรับ PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="quotation_${quotationNo}.pdf"`);

    // ส่ง PDF buffer
    res.send(pdfBuffer);

  } catch (error) {
    console.error('❌ Error generating quotation PDF:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างใบเสนอราคา: ' + error.message
    });
  }
});

/**
 * GET /api/installment/documents/invoice/:invoiceNo
 * สร้างและดาวน์โหลดใบแจ้งหนี้
 */
router.get('/documents/invoice/:invoiceNo', async (req, res) => {
  try {
    const { invoiceNo } = req.params;
    console.log(`📄 GET /api/installment/documents/invoice/${invoiceNo}`);

    // ค้นหาสัญญาจากหมายเลขใบแจ้งหนี้ (รองรับทั้ง _id และ invoiceNumber)
    let contract;

    // ลองค้นหาด้วย _id ก่อน (ถ้าเป็น ObjectId format)
    if (mongoose.Types.ObjectId.isValid(invoiceNo)) {
      contract = await InstallmentOrder.findById(invoiceNo).populate('customer');
    }

    // ถ้าไม่เจอ ลองค้นหาด้วย invoiceNumber
    if (!contract) {
      contract = await InstallmentOrder.findOne({
        invoiceNumber: invoiceNo
      }).populate('customer');
    }

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: `ไม่พบสัญญาหมายเลข ${invoiceNo}`
      });
    }

    // สร้าง Invoice PDF โดยใช้ QuotationPdfController (เนื่องจาก TaxInvoiceController ไม่มี PDF method)
    const pdfBuffer = await QuotationPdfController.createQuotationPdf(contract);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice_${invoiceNo}.pdf"`);

    // ส่ง PDF buffer
    res.send(pdfBuffer);

  } catch (error) {
    console.error('❌ Error generating invoice PDF:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างใบแจ้งหนี้: ' + error.message
    });
  }
});

/**
 * GET /api/installment/documents/receipt/:contractNo
 * สร้างและดาวน์โหลดใบเสร็จรับเงิน
 */
router.get('/documents/receipt/:contractNo', async (req, res) => {
  try {
    const { contractNo } = req.params;
    console.log(`📄 GET /api/installment/documents/receipt/${contractNo}`);

    // ค้นหาสัญญาจากหมายเลขสัญญา (รองรับทั้ง _id และ contractNo)
    let contract;

    // ลองค้นหาด้วย _id ก่อน (ถ้าเป็น ObjectId format)
    if (mongoose.Types.ObjectId.isValid(contractNo)) {
      contract = await InstallmentOrder.findById(contractNo).populate('customer');
    }

    // ถ้าไม่เจอ ลองค้นหาด้วย contractNo
    if (!contract) {
      contract = await InstallmentOrder.findOne({
        contractNo: contractNo
      }).populate('customer');
    }

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: `ไม่พบสัญญาหมายเลข ${contractNo}`
      });
    }

    // สร้างข้อมูลใบเสร็จรับเงิน
    const receiptData = {
      // ข้อมูลบริษัท
      company: {
        name: 'บริษัท 2 พี่น้อง โมบาย จำกัด',
        branch: 'สาขาปัตตานี',
        branchCode: 'PATTANI',
        location: 'ปัตตานี',
        taxId: '0945566000616',
        phone: '09-2427-0769'
      },

      // ข้อมูลลูกค้า
      customer: contract.customer || {
        name: 'ไม่ระบุ',
        taxId: 'ไม่ระบุ',
        phone: 'ไม่ระบุ',
        address: '-'
      },

      // ข้อมูลเอกสาร
      receiptNumber: `RE-${contractNo.replace('INST-', '')}`,
      issueDate: formatThaiDate(new Date()),
      paymentMethod: 'เงินสด',
      salesperson: {
        name: 'พนักงานขาย',
        signature: null
      },

      // รายการสินค้า
      items: contract.items.map(item => ({
        description: `${item.name} (IMEI: ${item.imei})`,
        amount: item.downAmount || 0
      })),

      // สรุปยอด
      summary: {
        subtotal: contract.items.reduce((sum, item) => sum + (item.downAmount || 0), 0),
        documentFee: 500,
        total: contract.items.reduce((sum, item) => sum + (item.downAmount || 0), 0) + 500
      },

      // ใช้สำหรับ PDF generation
      documentType: 'receipt',
      contractNo: contract.contractNo,
      createdAt: contract.createdAt
    };

    // สร้าง Receipt PDF โดยใช้ QuotationPdfController กับข้อมูลที่ปรับแล้ว
    const pdfBuffer = await QuotationPdfController.createQuotationPdf(receiptData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt_${contractNo}.pdf"`);

    // ส่ง PDF buffer
    res.send(pdfBuffer);

  } catch (error) {
    console.error('❌ Error generating receipt PDF:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างใบเสร็จ: ' + error.message
    });
  }
});

/**
 * GET /api/installment/documents/tax-invoice/:contractNo
 * สร้างและดาวน์โหลดใบกำกับภาษี
 */
router.get('/documents/tax-invoice/:contractNo', async (req, res) => {
  try {
    const { contractNo } = req.params;
    console.log(`📄 GET /api/installment/documents/tax-invoice/${contractNo}`);

    // ค้นหาสัญญาจากหมายเลขสัญญา (รองรับทั้ง _id และ contractNo)
    let contract;

    // ลองค้นหาด้วย _id ก่อน (ถ้าเป็น ObjectId format)
    if (mongoose.Types.ObjectId.isValid(contractNo)) {
      contract = await InstallmentOrder.findById(contractNo).populate('customer');
    }

    // ถ้าไม่เจอ ลองค้นหาด้วย contractNo
    if (!contract) {
      contract = await InstallmentOrder.findOne({
        contractNo: contractNo
      }).populate('customer');
    }

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: `ไม่พบสัญญาหมายเลข ${contractNo}`
      });
    }

    // สร้าง Tax Invoice PDF โดยใช้ QuotationPdfController (เนื่องจาก TaxInvoiceController ไม่มี PDF method)
    const pdfBuffer = await QuotationPdfController.createQuotationPdf(contract);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="tax_invoice_${contractNo}.pdf"`);

    // ส่ง PDF buffer
    res.send(pdfBuffer);

  } catch (error) {
    console.error('❌ Error generating tax invoice PDF:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างใบกำกับภาษี: ' + error.message
    });
  }
});

/**
 * GET /api/installment/documents/delivery/:contractNo
 * สร้างและดาวน์โหลดใบส่งของ
 */
router.get('/documents/delivery/:contractNo', async (req, res) => {
  try {
    const { contractNo } = req.params;
    console.log(`📄 GET /api/installment/documents/delivery/${contractNo}`);

    // ค้นหาสัญญาจากหมายเลขสัญญา (รองรับทั้ง _id และ contractNo)
    let contract;

    // ลองค้นหาด้วย _id ก่อน (ถ้าเป็น ObjectId format)
    if (mongoose.Types.ObjectId.isValid(contractNo)) {
      contract = await InstallmentOrder.findById(contractNo).populate('customer');
    }

    // ถ้าไม่เจอ ลองค้นหาด้วย contractNo
    if (!contract) {
      contract = await InstallmentOrder.findOne({
        contractNo: contractNo
      }).populate('customer');
    }

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: `ไม่พบสัญญาหมายเลข ${contractNo}`
      });
    }

    // สร้าง Delivery Note PDF โดยใช้ QuotationPdfController
    const pdfBuffer = await QuotationPdfController.createQuotationPdf(contract);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="delivery_${contractNo}.pdf"`);

    // ส่ง PDF buffer
    res.send(pdfBuffer);

  } catch (error) {
    console.error('❌ Error generating delivery note PDF:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างใบส่งของ: ' + error.message
    });
  }
});

// ========== CUSTOMER MANAGEMENT ==========

/**
 * GET /api/installment/customers/search
 * ค้นหาลูกค้าจากเลขบัตรประชาชนหรือเบอร์โทร
 */
router.get('/customers/search', authenticateToken, async (req, res) => {
  try {
    const { q, type } = req.query;
    console.log(`📥 GET /api/installment/customers/search?q=${q}&type=${type}`);

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุคำค้นหา'
      });
    }

    // Use existing method from installmentController
    await installmentController.searchInstallmentByTaxId(req, res);

  } catch (error) {
    console.error('❌ Error searching customers:', error);
      res.status(500).json({
        success: false,
      message: 'เกิดข้อผิดพลาดในการค้นหาลูกค้า: ' + error.message
    });
  }
});

/**
 * GET /api/installment/customers/:customerId
 * ดึงรายละเอียดลูกค้า
 */
router.get('/customers/:customerId', authenticateToken, async (req, res) => {
  try {
    const { customerId } = req.params;
    console.log(`📥 GET /api/installment/customers/${customerId}`);

    // Use existing method from installmentController
    await installmentController.getCustomerDetail(req, res);

  } catch (error) {
    console.error('❌ Error getting customer details:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลลูกค้า: ' + error.message
    });
  }
});

// ========== REPORTING ==========

/**
 * GET /api/installment/reports/tax-summary
 * สรุปภาษีขาย (อ่านอย่างเดียว) – รองรับ frontend tax page
 */
router.get('/reports/tax-summary', async (req, res) => {
  try {
    const VAT_RATE = 0.07;
    const { month, year } = req.query; // optional filter จาก UI ถ้ามี

    const dateFilter = {};
    if (year && month) {
      const y = parseInt(year, 10);
      const m = parseInt(month, 10) - 1; // 0-based
      const start = new Date(y, m, 1, 0, 0, 0, 0);
      const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
      dateFilter.createdAt = { $gte: start, $lte: end };
    }

    // ดึงสัญญา (ยืดหยุ่น field ชื่อแตกต่างกัน)
    const orders = await InstallmentOrder.find(dateFilter)
      .select('contractNumber contractNo customer_info customer customerInfo items totalAmount finalTotalAmount createdAt nextDueDate status taxPaymentDate updatedAt')
      .lean();

    const taxData = (orders || []).map((o) => {
      const contractNo =
        o.contractNumber || o.contractNo || o._id?.toString() || 'ไม่ระบุ';

      // ชื่อลูกค้า: ลองหลายแหล่ง
      const customer =
        (o.customer_info &&
          `${o.customer_info.first_name || ''} ${o.customer_info.last_name || ''}`.trim()) ||
        (o.customerInfo &&
          `${o.customerInfo.firstName || ''} ${o.customerInfo.lastName || ''}`.trim()) ||
        (o.customer && typeof o.customer === 'object' &&
          `${o.customer.firstName || ''} ${o.customer.lastName || ''}`.trim()) ||
        o.customer?.name ||
        'ไม่ระบุ';

      // สินค้า: เอาตัวแรกถ้ามี
      const firstItem = Array.isArray(o.items) && o.items.length > 0 ? o.items[0] : null;
      const product = firstItem?.description || firstItem?.name || firstItem?.productName || 'สินค้าผ่อนชำระ';

      const contractValue = Number(o.finalTotalAmount || o.totalAmount || 0) || 0;
      // ภาษีแบบ "ราคารวมภาษี" → ดึง VAT ออก
      const taxAmount = contractValue > 0 ? Math.round(contractValue * VAT_RATE / (1 + VAT_RATE) * 100) / 100 : 0;

      const dueDate = o.nextDueDate || o.createdAt || new Date();

      let status = 'pending';
      if (o.taxPaymentDate) {
        status = 'paid';
      } else if (dueDate && new Date(dueDate) < new Date()) {
        status = 'overdue';
      }

      return {
        contractNo,
        customer,
        product,
        contractValue,
        taxAmount,
        dueDate: dueDate.toISOString().split('T')[0],
        status,
        paymentDate: o.taxPaymentDate || null
      };
    });

    return res.json({
      success: true,
      taxData
    });
  } catch (err) {
    console.error('❌ Error in /reports/tax-summary:', err);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงสรุปภาษีขาย'
    });
  }
});

// alias สำรองให้ตรงกับ fallback ของ frontend
router.get('/tax-reports', async (req, res) => {
  req.url = '/reports/tax-summary';
  return router.handle(req, res);
});

// Alias routes for Bad Debt Criteria compatibility with frontend
// Frontend calls /api/loan/bad-debt/criteria, redirect to existing /bad-debt/criteria
router.get('/reports/bad-debt-criteria', async (req, res) => {
  req.url = '/bad-debt/criteria';
  return router.handle(req, res);
});

router.post('/reports/bad-debt-criteria', async (req, res) => {
  req.url = '/bad-debt/criteria';
  return router.handle(req, res);
});

// Frontend calls /api/loan/dashboard/debtors, redirect to existing /reports/debtors
router.get('/dashboard/debtors', async (req, res) => {
  req.url = '/reports/debtors';
  return router.handle(req, res);
});

/**
 * GET /api/installment/reports/debtors
 * รายงานลูกหนี้ค้างชำระ
 */
router.get('/reports/debtors', authenticateToken, async (req, res) => {
  try {
    console.log('📥 GET /api/installment/reports/debtors');

    // Use existing method from installmentController
    await installmentController.getDebtors(req, res);

  } catch (error) {
    console.error('❌ Error getting debtors report:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างรายงาน: ' + error.message
    });
  }
});

/**
 * GET /api/installment/reports/repayment-stats
 * สถิติการชำระเงิน
 */
router.get('/reports/repayment-stats', async (req, res) => {
  try {
    console.log('📥 GET /api/installment/reports/repayment-stats');

    // ✅ Fallback response สำหรับ development
    try {
      if (installmentController && installmentController.getRepaymentStats) {
        await installmentController.getRepaymentStats(req, res);
      } else {
        throw new Error('Controller method not available');
      }
    } catch (controllerError) {
      console.log('⚠️ Controller method not available, using fallback response');
      res.json({
        success: true,
        data: {
          totalContracts: 0,
          monthlyPayments: 0,
          overdueContracts: 0,
          onTimeRate: 0,
          contractsGrowth: 0,
          paymentsGrowth: 0
        },
        message: 'ไม่พบข้อมูลสถิติการชำระเงิน'
      });
    }

  } catch (error) {
    console.error('❌ Error getting repayment stats:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงสถิติ: ' + error.message
    });
  }
});

// ========== VALIDATION ENDPOINTS ==========

/**
 * POST /api/installment/validate
 * ตรวจสอบข้อมูลก่อนสร้างสัญญา (ไม่บันทึกจริง)
 */
router.post('/validate', authenticateToken, async (req, res) => {
  try {
    console.log('📥 POST /api/installment/validate - Validating installment data');

    const { customer, items, plan_type, down_payment, installment_count } = req.body;
    const errors = [];

    // Validate customer data
    if (!customer) {
      errors.push('ไม่พบข้อมูลลูกค้า');
    } else {
      if (!customer.first_name) errors.push('กรุณากรอกชื่อลูกค้า');
      if (!customer.last_name) errors.push('กรุณากรอกนามสกุลลูกค้า');
      if (!customer.phone_number) errors.push('กรุณากรอกเบอร์โทรศัพท์');
      if (!customer.tax_id || customer.tax_id.length !== 13) errors.push('กรุณากรอกเลขบัตรประชาชน 13 หลัก');
    }

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      errors.push('กรุณาเลือกสินค้าอย่างน้อย 1 รายการ');
    } else {
      items.forEach((item, index) => {
        if (!item.product) errors.push(`สินค้าลำดับที่ ${index + 1}: ไม่พบรหัสสินค้า`);
        if (!item.price || item.price <= 0) errors.push(`สินค้าลำดับที่ ${index + 1}: ราคาไม่ถูกต้อง`);
        if (!item.quantity || item.quantity <= 0) errors.push(`สินค้าลำดับที่ ${index + 1}: จำนวนไม่ถูกต้อง`);
      });
    }

    // Validate payment plan
    if (!plan_type) errors.push('กรุณาเลือกประเภทแผนการชำระ');
    if (!down_payment || down_payment <= 0) errors.push('กรุณาระบุจำนวนเงินดาวน์');
    if (!installment_count || installment_count <= 0) errors.push('กรุณาระบุจำนวนงวด');

    // Calculate totals for validation
    const subTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const minDownPayment = subTotal * 0.1; // Minimum 10%

    if (down_payment < minDownPayment) {
      errors.push(`เงินดาวน์ต้องไม่น้อยกว่า ${minDownPayment.toLocaleString()} บาท (10% ของยอดสินค้า)`);
    }

    if (installment_count > 36) {
      errors.push('จำนวนงวดต้องไม่เกิน 36 งวด');
    }

    const isValid = errors.length === 0;

    res.json({
      success: isValid,
      valid: isValid,
      errors: errors,
      data: isValid ? {
        subTotal,
        minDownPayment,
        calculatedInstallmentAmount: ((subTotal - down_payment + (req.body.doc_fee || 0)) / installment_count)
      } : null
    });

  } catch (error) {
    console.error('❌ Error validating installment data:', error);
      res.status(500).json({
        success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล: ' + error.message
    });
  }
});

// ========== UTILITY ENDPOINTS ==========

/**
 * GET /api/installment/next-contract-number
 * ดึงเลขสัญญาถัดไป
 */
router.get('/next-contract-number', authenticateToken, async (req, res) => {
  try {
    console.log('📥 GET /api/installment/next-contract-number');

    // Use existing function from installmentController
    const getNextContractNo = require('../controllers/installmentController').getNextContractNo ||
      (() => `C${Date.now()}`); // Fallback

    const nextContractNo = await getNextContractNo();

    res.json({
      success: true,
      contractNo: nextContractNo
    });

  } catch (error) {
    console.error('❌ Error getting next contract number:', error);
      res.status(500).json({
        success: false,
      message: 'เกิดข้อผิดพลาด: ' + error.message
    });
  }
});

/**
 * GET /api/installment/level1
 * ดึงข้อมูล Level 1 (Categories) สำหรับสินค้าผ่อน
 */
router.get('/level1', authenticateToken, async (req, res) => {
  try {
    console.log('📥 GET /api/installment/level1');

    // Use existing method from installmentController
    await installmentController.getLevel1(req, res);

  } catch (error) {
    console.error('❌ Error getting level1 data:', error);
      res.status(500).json({
        success: false,
      message: 'เกิดข้อผิดพลาด: ' + error.message
    });
  }
});

/**
 * GET /api/installment/level2/:parentKey
 * ดึงข้อมูล Level 2 สำหรับสินค้าผ่อน
 */
router.get('/level2/:parentKey', authenticateToken, async (req, res) => {
  try {
    const { parentKey } = req.params;
    console.log(`📥 GET /api/installment/level2/${parentKey}`);

    // Use existing method from installmentController
    await installmentController.getLevel2(req, res);

  } catch (error) {
    console.error('❌ Error getting level2 data:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาด: ' + error.message
    });
  }
});

/**
 * POST /api/installment/down-payment-receipt
 * พิมพ์ใบเสร็จรับเงิน (ค่าดาวน์)
 */
router.post('/down-payment-receipt', authenticateToken, async (req, res) => {
  try {
    const { receiptData } = req.body;
    console.log('📄 Creating down payment receipt PDF...');

    if (!receiptData) {
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลใบเสร็จไม่ครบถ้วน'
      });
    }

    // Import A4PDFController
    const A4PDFController = require('../controllers/pdf/A4PDFController');

    // สร้าง PDF ใบเสร็จรับเงิน
    const pdfResult = await A4PDFController.printReceipt(receiptData);

    if (!pdfResult || !pdfResult.buffer) {
      return res.status(500).json({
        success: false,
        message: 'ไม่สามารถสร้าง PDF ได้'
      });
    }

    // ส่ง PDF กลับ
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${pdfResult.fileName || 'down-payment-receipt.pdf'}"`,
      'Content-Length': pdfResult.buffer.length
    });

    res.send(pdfResult.buffer);

  } catch (error) {
    console.error('❌ Error creating down payment receipt:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างใบเสร็จรับเงิน: ' + error.message
    });
  }
});

/**
 * POST /api/installment/down-payment-tax-invoice
 * พิมพ์ใบกำกับภาษี (ค่าดาวน์)
 */
router.post('/down-payment-tax-invoice', authenticateToken, async (req, res) => {
  try {
    const { taxInvoiceData } = req.body;
    console.log('📄 Creating down payment tax invoice PDF...');

    if (!taxInvoiceData) {
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลใบกำกับภาษีไม่ครบถ้วน'
      });
    }

    // Import A4PDFController
    const A4PDFController = require('../controllers/pdf/A4PDFController');

    // สร้าง PDF ใบกำกับภาษี
    const pdfResult = await A4PDFController.printReceipt({
      ...taxInvoiceData,
      type: 'tax_invoice',
      vatIncluded: true
    });

    if (!pdfResult || !pdfResult.buffer) {
      return res.status(500).json({
        success: false,
        message: 'ไม่สามารถสร้าง PDF ได้'
      });
    }

    // ส่ง PDF กลับ
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${pdfResult.fileName || 'down-payment-tax-invoice.pdf'}"`,
      'Content-Length': pdfResult.buffer.length
    });

    res.send(pdfResult.buffer);

  } catch (error) {
    console.error('❌ Error creating down payment tax invoice:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างใบกำกับภาษี: ' + error.message
    });
  }
});

/**
 * POST /api/installment/documents/quotation
 * สร้างใบเสนอราคา
 */
router.post('/documents/quotation',
  securityHeaders,
  sanitizeInput,
  authenticateToken,
  generalInstallmentLimiter,
  async (req, res) => {
  try {
    const { data } = req.body;
    console.log('📄 Creating quotation document...');

    // Import QuotationPdfController
    const QuotationPdfController = require('../controllers/QuotationPdfController');

    // สร้าง order data สำหรับ PDF
    const orderData = {
      _id: data.contractData._id || new Date().getTime(),
      contractNumber: data.contractData.contract_number,
      quotationNumber: data.contractData.quotation_id || `QUO-${Date.now()}`,
      customerInfo: data.customer,
      items: data.items,
      totalAmount: data.items.reduce((sum, item) => sum + (item.sale_price * item.quantity), 0),
      downPayment: data.payment.downPayment,
      installmentAmount: data.payment.installmentAmount,
      installmentCount: data.payment.installmentCount,
      docFee: data.payment.docFee,
      createdAt: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      branch: data.branch
    };

    // สร้าง PDF
    const pdfResult = await QuotationPdfController.createQuotationPdf(orderData);

    // บันทึกไฟล์ (optional - สำหรับ reference)
    const fs = require('fs');
    const path = require('path');
    const fileName = `quotation_${orderData.quotationNumber}_${Date.now()}.pdf`;
    const filePath = path.join(__dirname, '../uploads/pdfs', fileName);

    // สร้างโฟลเดอร์ถ้ายังไม่มี
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, pdfResult.buffer);

    res.json({
      success: true,
      message: 'สร้างใบเสนอราคาสำเร็จ',
      downloadUrl: `/api/installment/documents/quotation/${orderData.quotationNumber}`,
      fileName: fileName
    });

  } catch (error) {
    console.error('❌ Error creating quotation:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างใบเสนอราคา: ' + error.message
    });
  }
});

/**
 * POST /api/installment/documents/invoice
 * สร้างใบแจ้งหนี้ (เฉพาะเงินดาวน์)
 */
router.post('/documents/invoice',
  securityHeaders,
  sanitizeInput,
  authenticateToken,
  generalInstallmentLimiter,
  async (req, res) => {
  try {
    const { data } = req.body;
    console.log('📄 Creating invoice document...');

    // Import InvoicePdfController
    const InvoicePdfController = require('../controllers/InvoicePdfController');

    // สร้าง order data สำหรับ PDF (เฉพาะเงินดาวน์)
    const orderData = {
      _id: data.contractData._id || new Date().getTime(),
      contractNumber: data.contractData.contract_number,
      invoiceNumber: data.contractData.invoice_id || `INV-${Date.now()}`,
      customerInfo: data.customer,
      items: data.items.map(item => ({
        ...item,
        // คำนวณเฉพาะส่วนของเงินดาวน์
        sale_price: (item.sale_price * item.quantity * data.payment.downPayment) /
                   data.items.reduce((sum, i) => sum + (i.sale_price * i.quantity), 0)
      })),
      totalAmount: data.payment.downPayment + (data.payment.docFee || 0),
      downPaymentOnly: true,
      docFee: data.payment.docFee,
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
      createdAt: new Date(),
      branch: data.branch
    };

    // สร้าง PDF
    const pdfResult = await InvoicePdfController.createInvoicePdf(orderData);

    // บันทึกไฟล์
    const fs = require('fs');
    const path = require('path');
    const fileName = `invoice_${orderData.invoiceNumber}_${Date.now()}.pdf`;
    const filePath = path.join(__dirname, '../uploads/pdfs', fileName);

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, pdfResult.buffer);

    res.json({
      success: true,
      message: 'สร้างใบแจ้งหนี้สำเร็จ',
      downloadUrl: `/api/installment/documents/invoice/${orderData.invoiceNumber}`,
      fileName: fileName
    });

  } catch (error) {
    console.error('❌ Error creating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างใบแจ้งหนี้: ' + error.message
    });
  }
});

/**
 * POST /api/installment/documents/receipt
 * สร้างใบเสร็จรับเงิน (เฉพาะเงินดาวน์)
 */
router.post('/documents/receipt',
  securityHeaders,
  sanitizeInput,
  authenticateToken,
  generalInstallmentLimiter,
  async (req, res) => {
  try {
    const { data } = req.body;
    console.log('📄 Creating receipt document...');

    // Import A4PDFController
    const A4PDFController = require('../controllers/pdf/A4PDFController');

    // สร้าง receipt data
    const receiptData = {
      _id: data.contractData._id || new Date().getTime(),
      documentNumber: `RCT-${data.contractData.contract_number}`,
      contractNumber: data.contractData.contract_number,
      customerInfo: data.customer,
      items: [
        {
          description: 'เงินดาวน์การผ่อนชำระ',
          amount: data.payment.downPayment,
          quantity: 1
        }
      ],
      totalAmount: data.payment.downPayment + (data.payment.docFee || 0),
      downPayment: data.payment.downPayment,
      docFee: data.payment.docFee || 0,
      paymentMethod: data.payment.paymentMethod || 'cash',
      receiptType: 'down_payment',
      createdAt: new Date(),
      branch: data.branch
    };

    // เพิ่มค่าธรรมเนียมเอกสารถ้ามี
    if (receiptData.docFee > 0) {
      receiptData.items.push({
        description: 'ค่าธรรมเนียมเอกสาร',
        amount: receiptData.docFee,
        quantity: 1
      });
    }

    // สร้าง PDF
    const pdfResult = await A4PDFController.printReceipt(receiptData);

    // บันทึกไฟล์
    const fs = require('fs');
    const path = require('path');
    const fileName = `receipt_${receiptData.documentNumber}_${Date.now()}.pdf`;
    const filePath = path.join(__dirname, '../uploads/pdfs', fileName);

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, pdfResult.buffer);

    res.json({
      success: true,
      message: 'สร้างใบเสร็จรับเงินสำเร็จ',
      downloadUrl: `/api/installment/documents/receipt/${receiptData.contractNumber}`,
      fileName: fileName
    });

  } catch (error) {
    console.error('❌ Error creating receipt:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างใบเสร็จ: ' + error.message
    });
  }
});

/**
 * POST /api/installment/documents/quotation
 * สร้างใบเสนอราคา
 */
router.post('/documents/quotation',
  securityHeaders,
  sanitizeInput,
  authenticateToken,
  generalInstallmentLimiter,
  async (req, res) => {
  try {
    const { data } = req.body;
    console.log('📄 Creating quotation document...');

    const QuotationPdfController = require('../controllers/QuotationPdfController');

    // เตรียมข้อมูลสำหรับใบเสนอราคา
    const quotationData = {
      _id: data.contractData._id || new Date().getTime(),
      quotationNumber: `QUO-${data.contractData.contract_number}`,
      contractNumber: data.contractData.contract_number,
      customerInfo: data.customer,
      items: data.items,
      totalAmount: data.items.reduce((sum, item) => sum + (item.sale_price * item.quantity), 0),
      downPayment: data.payment.downPayment,
      installmentAmount: data.payment.installmentAmount,
      installmentCount: data.payment.installmentCount,
      docFee: data.payment.docFee || 0,
      quotationType: 'installment',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 วัน
      createdAt: new Date(),
      branch: data.branch
    };

    // สร้าง PDF
    const pdfResult = await QuotationPdfController.createQuotationPdf(quotationData);

    // บันทึกไฟล์
    const fs = require('fs');
    const path = require('path');
    const fileName = `quotation_${quotationData.quotationNumber}_${Date.now()}.pdf`;
    const filePath = path.join(__dirname, '../uploads/pdfs', fileName);

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, pdfResult.buffer);

    res.json({
      success: true,
      message: 'สร้างใบเสนอราคาสำเร็จ',
      downloadUrl: `/uploads/pdfs/${fileName}`,
      fileName: fileName
    });

  } catch (error) {
    console.error('❌ Error creating quotation:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างใบเสนอราคา: ' + error.message
    });
  }
});

/**
 * POST /api/installment/documents/invoice
 * สร้างใบแจ้งหนี้ (เฉพาะเงินดาวน์)
 */
router.post('/documents/invoice',
  securityHeaders,
  sanitizeInput,
  authenticateToken,
  generalInstallmentLimiter,
  async (req, res) => {
  try {
    const { data } = req.body;
    console.log('📄 Creating invoice document...');

    const InvoicePdfController = require('../controllers/InvoicePdfController');

    // เตรียมข้อมูลสำหรับใบแจ้งหนี้ (เฉพาะเงินดาวน์)
    const invoiceData = {
      _id: data.contractData._id || new Date().getTime(),
      invoiceNumber: `INV-${data.contractData.contract_number}`,
      contractNumber: data.contractData.contract_number,
      customerInfo: data.customer,
      items: [{
        name: 'เงินดาวน์การผ่อนชำระ',
        quantity: 1,
        price: data.payment.downPayment,
        amount: data.payment.downPayment
      }],
      subtotal: data.payment.downPayment,
      docFee: data.payment.docFee || 0,
      totalAmount: data.payment.downPayment + (data.payment.docFee || 0),
      invoiceType: 'down_payment',
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 วัน
      createdAt: new Date(),
      branch: data.branch
    };

    // สร้าง PDF
    const pdfResult = await InvoicePdfController.createInvoicePdf(invoiceData);

    // บันทึกไฟล์
    const fs = require('fs');
    const path = require('path');
    const fileName = `invoice_${invoiceData.invoiceNumber}_${Date.now()}.pdf`;
    const filePath = path.join(__dirname, '../uploads/pdfs', fileName);

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, pdfResult.buffer);

    res.json({
      success: true,
      message: 'สร้างใบแจ้งหนี้สำเร็จ',
      downloadUrl: `/uploads/pdfs/${fileName}`,
      fileName: fileName
    });

  } catch (error) {
    console.error('❌ Error creating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างใบแจ้งหนี้: ' + error.message
    });
  }
});

/**
 * POST /api/installment/documents/tax-invoice
 * สร้างใบกำกับภาษี (เฉพาะเงินดาวน์)
 */
router.post('/documents/tax-invoice',
  securityHeaders,
  sanitizeInput,
  authenticateToken,
  generalInstallmentLimiter,
  async (req, res) => {
  try {
    const { data } = req.body;
    console.log('📄 Creating tax invoice document...');

    // กรองเฉพาะสินค้าที่มีภาษี
    const vatItems = data.items.filter(item => item.has_vat || item.vat_rate > 0);

    if (vatItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ไม่มีสินค้าที่ต้องออกใบกำกับภาษี'
      });
    }

    // Import A4PDFController
    const A4PDFController = require('../controllers/pdf/A4PDFController');

    // คำนวณภาษีรวม
    const totalVat = vatItems.reduce((vat, item) => {
      const itemSubtotal = item.sale_price * item.quantity;
      const vatRate = item.vat_rate || 7;
      return vat + (itemSubtotal * vatRate / 100);
    }, 0);

    // สร้าง tax invoice data
    const taxInvoiceData = {
      _id: data.contractData._id || new Date().getTime(),
      documentNumber: `TAX-${data.contractData.contract_number}`,
      contractNumber: data.contractData.contract_number,
      customerInfo: data.customer,
      items: vatItems.map(item => ({
        ...item,
        // คำนวณส่วนของเงินดาวน์
        vatAmount: (item.sale_price * item.quantity * (item.vat_rate || 7)) / 100
      })),
      subtotal: data.payment.downPayment,
      vatAmount: totalVat,
      totalAmount: data.payment.downPayment + totalVat,
      taxInvoiceType: 'down_payment',
      vatRate: 7,
      createdAt: new Date(),
      branch: data.branch
    };

    // สร้าง PDF
    const pdfResult = await A4PDFController.printReceipt({
      ...taxInvoiceData,
      type: 'tax_invoice',
      vatIncluded: true
    });

    // บันทึกไฟล์
    const fs = require('fs');
    const path = require('path');
    const fileName = `tax_invoice_${taxInvoiceData.documentNumber}_${Date.now()}.pdf`;
    const filePath = path.join(__dirname, '../uploads/pdfs', fileName);

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, pdfResult.buffer);

    res.json({
      success: true,
      message: 'สร้างใบกำกับภาษีสำเร็จ',
      downloadUrl: `/api/installment/documents/tax-invoice/${taxInvoiceData.contractNumber}`,
      fileName: fileName
    });

  } catch (error) {
    console.error('❌ Error creating tax invoice:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างใบกำกับภาษี: ' + error.message
    });
  }
});

// ========== BAD DEBT MANAGEMENT ENDPOINTS ==========

/**
 * GET /api/installment/bad-debt/criteria
 * ดึงเกณฑ์หนี้สูญที่บันทึกไว้
 */
// Test endpoint without auth
router.get('/bad-debt/criteria-test', async (req, res) => {
  res.json({
    success: true,
    message: 'Bad debt criteria endpoint is reachable',
    timestamp: new Date().toISOString()
  });
});

router.get('/bad-debt/criteria', authenticateToken, async (req, res) => {
  try {
    console.log('📥 GET /api/installment/bad-debt/criteria');

    const BadDebtCriteria = require('../models/Installment/BadDebtCriteria');

    // ดึงเกณฑ์ล่าสุด
    let criteria = await BadDebtCriteria.findOne().sort({ createdAt: -1 });

    // ถ้าไม่มีข้อมูลในฐานข้อมูล ให้สร้างค่าเริ่มต้น
    if (!criteria) {
      criteria = await BadDebtCriteria.create({
        allowance: 5.00,
        doubtful: 2.00,
        badDebt: 1.00,
        repossession: 500,
        policyNotes: 'เกณฑ์การพิจารณาหนี้สงสัยจะสูญ:\n1. ค่าเผื่อหนี้สงสัยจะสูญ: ลูกหนี้ที่มีอายุหนี้ 60-90 วัน\n2. หนี้สงสัยจะสูญ: ลูกหนี้ที่มีอายุหนี้ 90-180 วัน\n3. หนี้สูญ: ลูกหนี้ที่มีอายุหนี้เกิน 180 วัน'
      });
    }

    res.json({
      success: true,
      data: criteria
    });

  } catch (error) {
    console.error('❌ Error getting bad debt criteria:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงเกณฑ์หนี้สูญ: ' + error.message
    });
  }
});

/**
 * POST /api/installment/bad-debt/criteria
 * บันทึกเกณฑ์หนี้สูญ
 */
router.post('/bad-debt/criteria', authenticateToken, async (req, res) => {
  try {
    console.log('📥 POST /api/installment/bad-debt/criteria');
    console.log('📝 Request body:', req.body);

    const { allowance, doubtful, badDebt, repossession, policyNotes } = req.body;

    const BadDebtCriteria = require('../models/Installment/BadDebtCriteria');

    // สร้างหรืออัพเดทเกณฑ์
    const criteria = await BadDebtCriteria.findOneAndUpdate(
      {},
      {
        allowance: parseFloat(allowance) || 5.00,
        doubtful: parseFloat(doubtful) || 2.00,
        badDebt: parseFloat(badDebt) || 1.00,
        repossession: parseFloat(repossession) || 500,
        policyNotes: policyNotes || '',
        updatedBy: req.user?.userId || req.user?.id || 'SYSTEM',
        updatedAt: new Date()
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    console.log('✅ Bad debt criteria saved:', criteria);

    res.json({
      success: true,
      message: 'บันทึกเกณฑ์หนี้สูญเรียบร้อยแล้ว',
      data: criteria
    });

  } catch (error) {
    console.error('❌ Error saving bad debt criteria:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการบันทึกเกณฑ์หนี้สูญ: ' + error.message
    });
  }
});

/**
 * GET /api/installment/bad-debt/export
 * ส่งออกข้อมูลหนี้สูญเป็น CSV
 */
router.get('/bad-debt/export', authenticateToken, async (req, res) => {
  try {
    console.log('📥 GET /api/installment/bad-debt/export');

    // ดึงข้อมูลสัญญาที่มีปัญหา
    const contracts = await InstallmentOrder.find({
      status: { $in: ['overdue', 'defaulted'] }
    }).lean();

    // สร้าง CSV header
    let csv = 'เลขที่สัญญา,ชื่อลูกค้า,เบอร์โทร,ยอดหนี้คงเหลือ,อายุหนี้(วัน),สถานะ,ค่าเผื่อหนี้สูญ\n';

    for (const contract of contracts) {
      // คำนวณอายุหนี้
      const lastPayment = await InstallmentPayment.findOne({
        contractNumber: contract.contractNumber
      }).sort({ paymentDate: -1 });

      const daysSinceLastPayment = lastPayment ?
        Math.floor((new Date() - new Date(lastPayment.paymentDate)) / (1000 * 60 * 60 * 24)) :
        Math.floor((new Date() - new Date(contract.createdAt)) / (1000 * 60 * 60 * 24));

      // จัดประเภท
      let status = 'ปกติ';
      let allowance = 0;

      if (daysSinceLastPayment > 180) {
        status = 'หนี้สูญ';
        allowance = contract.remainingAmount;
      } else if (daysSinceLastPayment > 90) {
        status = 'หนี้สงสัยจะสูญ';
        allowance = contract.remainingAmount * 0.5;
      } else if (daysSinceLastPayment > 60) {
        status = 'ค่าเผื่อหนี้สงสัยจะสูญ';
        allowance = contract.remainingAmount * 0.2;
      }

      const customerName = `${contract.customerInfo?.firstName || ''} ${contract.customerInfo?.lastName || ''}`.trim();
      const phone = contract.customerInfo?.phoneNumber || '';

      csv += `${contract.contractNumber},${customerName},${phone},${contract.remainingAmount},${daysSinceLastPayment},${status},${allowance}\n`;
    }

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="bad_debt_report_${new Date().toISOString().split('T')[0]}.csv"`);

    // Add BOM for Excel UTF-8 compatibility
    const BOM = '\uFEFF';
    res.send(BOM + csv);

  } catch (error) {
    console.error('❌ Error exporting bad debt data:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการส่งออกข้อมูล: ' + error.message
    });
  }
});

/**
 * GET /api/installment/payment-history
 * ดึงประวัติการชำระเงินผ่อนชำระจากฐานข้อมูล InstallmentPayment
 */
router.get('/payment-history', authenticateToken, async (req, res) => {
  try {
    console.log('📥 GET /api/installment/payment-history');
    console.log('Query params:', req.query);

    const { page = 1, limit = 10, branch, status, search, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query for InstallmentPayment collection
    // Include multiple valid payment statuses
    const query = {
      status: { $in: ['confirmed', 'paid', 'completed'] }
    };

    // Add filters
    if (branch) {
      query.branchCode = branch;
    }

    if (search) {
      query.$or = [
        { contractNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { paymentId: { $regex: search, $options: 'i' } }
      ];
    }

    if (startDate) {
      query.paymentDate = query.paymentDate || {};
      query.paymentDate.$gte = new Date(startDate);
    }

    if (endDate) {
      query.paymentDate = query.paymentDate || {};
      query.paymentDate.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    console.log('Database query:', query);

    // Get payments with pagination
    const payments = await InstallmentPayment.find(query)
      .populate('contractId', 'contractNumber customerName totalAmount')
      .populate('recordedBy', 'name')
      .sort({ paymentDate: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const totalRecords = await InstallmentPayment.countDocuments(query);

    console.log(`Found ${payments.length} payments from ${totalRecords} total`);

    // Transform data for frontend
    const transformedPayments = payments.map(payment => {
      // Get customer info from contract or payment
      const customerName = payment.customerName ||
                          payment.contractId?.customerName ||
                          'ไม่ระบุ';

      const contractNumber = payment.contractNumber ||
                           payment.contractId?.contractNumber ||
                           'ไม่ระบุ';

      return {
        _id: payment._id,
        paymentId: payment.paymentId,
        paymentDate: payment.paymentDate,
        contractNo: contractNumber,
        customerName: customerName,
        customerPhone: payment.customerPhone || 'ไม่ระบุ',
        installmentNo: payment.installmentNumber,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        receiptNumber: payment.receiptNumber || payment.paymentId,
        status: payment.status,
        branchCode: payment.branchCode,
        branchName: payment.branchName || 'ไม่ระบุ',
        recordedBy: payment.recordedBy?.name || payment.recordedByName,
        createdAt: payment.createdAt,
        // Additional payment details
        principalAmount: payment.principalAmount || 0,
        interestAmount: payment.interestAmount || 0,
        penaltyAmount: payment.penaltyAmount || 0,
        transferDetails: payment.transferDetails,
        mixedPayment: payment.mixedPayment,
        cashDetails: payment.cashDetails
      };
    });

    // Calculate statistics
    const totalAmount = transformedPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayPayments = transformedPayments.filter(payment => {
      const paymentDate = new Date(payment.paymentDate);
      return paymentDate >= today && paymentDate < tomorrow;
    }).length;

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthPayments = transformedPayments.filter(payment => {
      const paymentDate = new Date(payment.paymentDate);
      return paymentDate >= startOfMonth && paymentDate <= endOfMonth;
    }).length;

    res.json({
      success: true,
      data: transformedPayments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRecords / parseInt(limit)),
        totalRecords: totalRecords,
        recordsPerPage: parseInt(limit),
        hasNext: parseInt(page) * parseInt(limit) < totalRecords,
        hasPrev: parseInt(page) > 1
      },
      statistics: {
        totalTransactions: transformedPayments.length,
        totalAmount: totalAmount,
        todayPayments: todayPayments,
        monthPayments: monthPayments
      }
    });

  } catch (error) {
    console.error('❌ Error getting payment history:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงประวัติการชำระเงิน',
      error: error.message
    });
  }
});

/**
 * GET /api/installment/reports/dashboard-summary
 * สรุปข้อมูลสำหรับ dashboard
 */
router.get('/reports/dashboard-summary', async (req, res) => {
  try {
    console.log('📊 GET /api/installment/reports/dashboard-summary');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // ดึงข้อมูลสัญญาผ่อนชำระทั้งหมด
    const totalContracts = await InstallmentOrder.countDocuments({});
    const activeContracts = await InstallmentOrder.countDocuments({ status: 'ongoing' });
    const completedContracts = await InstallmentOrder.countDocuments({ status: 'completed' });

    // คำนวณยอดเงินรวม
    const totalValueResult = await InstallmentOrder.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalValue = totalValueResult[0]?.total || 0;

    // คำนวณยอดหนี้คงเหลือ
    const totalOutstandingResult = await InstallmentOrder.aggregate([
      { $match: { status: 'ongoing' } },
      { $group: { _id: null, total: { $sum: '$remainingAmount' } } }
    ]);
    const totalOutstanding = totalOutstandingResult[0]?.total || 0;

    // นับลูกหนี้ค้างชำระ
    const overdueContracts = await InstallmentOrder.countDocuments({
      status: 'ongoing',
      nextDueDate: { $lt: now }
    });

    // คำนวณยอดค้างชำระรวม
    const overdueAmountResult = await InstallmentOrder.aggregate([
      { $match: { status: 'ongoing', nextDueDate: { $lt: now } } },
      { $group: { _id: null, total: { $sum: '$monthlyPayment' } } }
    ]);
    const overdueAmountTotal = overdueAmountResult[0]?.total || 0;

    // แยกยอดค้างตามช่วงวัน
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const overdue_1_30_Result = await InstallmentOrder.aggregate([
      { $match: { status: 'ongoing', nextDueDate: { $gte: thirtyDaysAgo, $lt: now } } },
      { $group: { _id: null, total: { $sum: '$monthlyPayment' } } }
    ]);
    const overdueAmount_1_30 = overdue_1_30_Result[0]?.total || 0;

    const overdue_31_60_Result = await InstallmentOrder.aggregate([
      { $match: { status: 'ongoing', nextDueDate: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$monthlyPayment' } } }
    ]);
    const overdueAmount_31_60 = overdue_31_60_Result[0]?.total || 0;

    const overdue_60_plus_Result = await InstallmentOrder.aggregate([
      { $match: { status: 'ongoing', nextDueDate: { $lt: sixtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$monthlyPayment' } } }
    ]);
    const overdueAmount_60_plus = overdue_60_plus_Result[0]?.total || 0;

    // คำนวณยอดที่ยังไม่ถึงกำหนด
    const outstandingNotDue = totalOutstanding - overdueAmountTotal;

    // นับลูกหนี้ค้างตามจำนวนงวด
    const overdueDebtors_1_installment = await InstallmentOrder.countDocuments({
      status: 'ongoing',
      nextDueDate: { $lt: now },
      paidInstallments: 0
    });

    const overdueDebtors_2_installment = await InstallmentOrder.countDocuments({
      status: 'ongoing',
      nextDueDate: { $lt: now },
      paidInstallments: 1
    });

    const overdueDebtors_3plus_installment = await InstallmentOrder.countDocuments({
      status: 'ongoing',
      nextDueDate: { $lt: now },
      paidInstallments: { $gte: 2 }
    });

    // คำนวณ Top Debtors (ลูกหนี้ยอดสูงสุด 5 ราย)
    const topDebtorsResult = await InstallmentOrder.find({ status: 'ongoing' })
      .sort({ remainingAmount: -1 })
      .limit(5)
      .lean();

    const topDebtorsCount = topDebtorsResult.length;
    const topDebtorsAmount = topDebtorsResult.reduce((sum, debt) => sum + debt.remainingAmount, 0);

    // คำนวณอัตราการเก็บเงิน
    const collectionRate = activeContracts > 0 ?
      Math.round(((activeContracts - overdueContracts) / activeContracts) * 100) : 100;

    // คำนวณอัตราชำระตรงเวลา
    const onTimeRate = totalContracts > 0 ?
      Math.round((completedContracts / totalContracts) * 100) : 0;

    // คำนวณการเปลี่ยนแปลงจากเดือนก่อน (สำหรับการแสดงผล % change)
    const lastMonthValue = await InstallmentOrder.aggregate([
      { $match: { createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const lastMonthTotal = lastMonthValue[0]?.total || 0;
    const totalValueChange = lastMonthTotal > 0 ?
      Math.round(((totalValue - lastMonthTotal) / lastMonthTotal) * 100) : 0;

    const lastMonthContracts = await InstallmentOrder.countDocuments({
      createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
    });
    const totalRequestsChange = lastMonthContracts > 0 ?
      Math.round(((totalContracts - lastMonthContracts) / lastMonthContracts) * 100) : 0;

    res.json({
      success: true,
      data: {
        // ข้อมูลหลัก
        totalValue,
        totalValueChange,
        totalRequests: totalContracts,
        totalRequestsChange,
        overdueCount: overdueContracts,
        overdueChange: 0, // คำนวณจากเดือนก่อนได้
        onTimeRate,
        onTimeRateChange: 0,

        // ข้อมูลลูกหนี้
        totalOutstanding,
        outstandingDue: overdueAmountTotal,
        outstandingNotDue,
        overdueAmountTotal,
        overdueAmount_1_30,
        overdueAmount_31_60,
        overdueAmount_60_plus,
        totalDebtors: activeContracts,
        overdueDebtorsTotal: overdueContracts,
        overdueDebtors_1_installment,
        overdueDebtors_2_installment,
        overdueDebtors_3plus_installment,
        collectionRate,

        // Top Debtors
        topDebtorsCount,
        topDebtorsAmount
      }
    });

  } catch (error) {
    console.error('❌ Error getting dashboard summary:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสรุป: ' + error.message
    });
  }
});

// ✅ Temporary test endpoint without auth to debug route registration
router.get('/test-no-auth', (req, res) => {
  res.json({
    success: true,
    message: 'Installment routes are working - no auth required',
    endpoint: '/api/installment/test-no-auth',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/installment/dashboard/trends
 * แนวโน้มข้อมูลรายเดือน
 */
router.get('/dashboard/trends', authenticateToken, async (req, res) => {
  try {
    console.log('📈 GET /api/installment/dashboard/trends');

    const now = new Date();
    const months = [];
    const data = [];

    // ดึงข้อมูล 6 เดือนย้อนหลัง
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      months.push(monthStart.toLocaleDateString('th-TH', { month: 'short' }));

      const monthlyCount = await InstallmentOrder.countDocuments({
        createdAt: { $gte: monthStart, $lte: monthEnd }
      });

      data.push(monthlyCount);
    }

    res.json({
      success: true,
      data: {
        labels: months,
        datasets: [{
          label: 'สัญญาใหม่',
          data: data,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1
        }]
      }
    });

  } catch (error) {
    console.error('❌ Error getting trends:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแนวโน้ม: ' + error.message
    });
  }
});

/**
 * GET /api/installment/dashboard/status-distribution
 * การกระจายสถานะของสัญญา
 */
router.get('/dashboard/status-distribution', authenticateToken, async (req, res) => {
  try {
    console.log('📊 GET /api/installment/dashboard/status-distribution');

    const statusCounts = await InstallmentOrder.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const labels = [];
    const data = [];
    const colors = ['#10B981', '#F59E0B', '#EF4444', '#6B7280'];

    statusCounts.forEach((item, index) => {
      let label = 'ไม่ทราบสถานะ';
      switch(item._id) {
        case 'ongoing': label = 'กำลังดำเนิน'; break;
        case 'completed': label = 'เสร็จสิ้น'; break;
        case 'overdue': label = 'ค้างชำระ'; break;
        case 'cancelled': label = 'ยกเลิก'; break;
      }
      labels.push(label);
      data.push(item.count);
    });

    res.json({
      success: true,
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors
        }]
      }
    });

  } catch (error) {
    console.error('❌ Error getting status distribution:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถานะ: ' + error.message
    });
  }
});

/**
 * GET /api/installment/dashboard/proportions
 * สัดส่วนต่างๆ ของระบบ
 */
router.get('/dashboard/proportions', authenticateToken, async (req, res) => {
  try {
    console.log('📊 GET /api/installment/dashboard/proportions');

    const totalContracts = await InstallmentOrder.countDocuments({});
    const activeContracts = await InstallmentOrder.countDocuments({ status: 'ongoing' });

    res.json({
      success: true,
      data: {
        totalContracts,
        activeContracts,
        activePercentage: totalContracts > 0 ? Math.round((activeContracts / totalContracts) * 100) : 0
      }
    });

  } catch (error) {
    console.error('❌ Error getting proportions:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสัดส่วน: ' + error.message
    });
  }
});

/**
 * GET /api/installment/dashboard/recent-loans
 * รายการสัญญาล่าสุด
 */
router.get('/dashboard/recent-loans', authenticateToken, async (req, res) => {
  try {
    console.log('📋 GET /api/installment/dashboard/recent-loans');

    const recentLoans = await InstallmentOrder.find()
      .populate('customer', 'firstName lastName prefix phone')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // แปลงข้อมูลให้เหมาะกับ frontend
    const formattedLoans = recentLoans.map(loan => {
      let customerName = 'ไม่ระบุ';

      // พยายามดึงชื่อจาก populated customer field
      if (loan.customer && typeof loan.customer === 'object') {
        const { prefix, firstName, lastName } = loan.customer;
        customerName = `${prefix || ''} ${firstName || ''} ${lastName || ''}`.trim();
      }

      // หากไม่มีข้อมูลจาก customer field ให้ใช้ข้อมูลจาก customer_info
      if (customerName === 'ไม่ระบุ' || customerName === '') {
        if (loan.customer_info) {
          const { prefix, firstName, lastName } = loan.customer_info;
          customerName = `${prefix || ''} ${firstName || ''} ${lastName || ''}`.trim();
        }
      }

      // หากยังไม่มีชื่อ ให้ใช้ชื่อเริ่มต้น
      if (!customerName || customerName.trim() === '') {
        customerName = 'ไม่ระบุ';
      }

      return {
        order_number: loan.contractNo || loan.order_number || loan._id,
        customer_name: customerName,
        totalAmount: loan.finalTotalAmount || loan.totalAmount || 0,
        amountDue: loan.finalTotalAmount || loan.totalAmount || 0,
        term: loan.installmentCount || 0,
        installmentCount: loan.installmentCount || 0,
        status: loan.status || 'pending',
        remaining_installments: loan.installmentCount || 0
      };
    });

    res.json({
      success: true,
      data: formattedLoans
    });

  } catch (error) {
    console.error('❌ Error getting recent loans:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงรายการล่าสุด: ' + error.message
    });
  }
});

/**
 * GET /api/installment/dashboard/daily-stats
 * สถิติรายวัน
 */
router.get('/dashboard/daily-stats', authenticateToken, async (req, res) => {
  try {
    console.log('📅 GET /api/installment/dashboard/daily-stats');

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // สัญญาใหม่วันนี้
    const todayNewLoans = await InstallmentOrder.countDocuments({
      createdAt: { $gte: startOfDay, $lt: endOfDay }
    });

    // มูลค่าสัญญาใหม่วันนี้
    const todayNewLoansValueResult = await InstallmentOrder.aggregate([
      { $match: { createdAt: { $gte: startOfDay, $lt: endOfDay } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const todayNewLoansValue = todayNewLoansValueResult[0]?.total || 0;

    // การชำระเงินวันนี้
    const todayRepaymentsCount = await InstallmentPayment.countDocuments({
      paymentDate: { $gte: startOfDay, $lt: endOfDay }
    });

    // ยอดเงินที่ได้รับวันนี้
    const todayRepaymentsResult = await InstallmentPayment.aggregate([
      { $match: { paymentDate: { $gte: startOfDay, $lt: endOfDay } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const todayRepayments = todayRepaymentsResult[0]?.total || 0;

    // ค้างชำระวันนี้ (ครบกำหนดวันนี้แต่ยังไม่จ่าย)
    const todayOverdue = await InstallmentOrder.countDocuments({
      nextDueDate: { $gte: startOfDay, $lt: endOfDay },
      status: 'ongoing'
    });

    // มูลค่าค้างชำระวันนี้
    const todayOverdueValueResult = await InstallmentOrder.aggregate([
      { $match: {
          nextDueDate: { $gte: startOfDay, $lt: endOfDay },
          status: 'ongoing'
        }
      },
      { $group: { _id: null, total: { $sum: '$monthlyPayment' } } }
    ]);
    const todayOverdueValue = todayOverdueValueResult[0]?.total || 0;

    // ล็อคอุปกรณ์วันนี้ (สัญญาที่เปลี่ยนเป็น locked วันนี้)
    const todayLocked = await InstallmentOrder.countDocuments({
      status: 'locked',
      updatedAt: { $gte: startOfDay, $lt: endOfDay }
    });

    // นับวันที่ค้างชำระก่อนถูกล็อค
    const todayLockedContractsResult = await InstallmentOrder.find({
      status: 'locked',
      updatedAt: { $gte: startOfDay, $lt: endOfDay }
    }).lean();

    let totalOverdueDays = 0;
    for (const contract of todayLockedContractsResult) {
      if (contract.nextDueDate) {
        const daysDiff = Math.floor((today - contract.nextDueDate) / (1000 * 60 * 60 * 24));
        totalOverdueDays += Math.max(0, daysDiff);
      }
    }

    const todayLockedFromOverdue = todayLockedContractsResult.length > 0 ?
      Math.round(totalOverdueDays / todayLockedContractsResult.length) : 0;

    res.json({
      success: true,
      data: {
        todayNewLoans,
        todayNewLoansValue,
        todayRepayments,
        todayRepaymentsCount,
        todayOverdue,
        todayOverdueValue,
        todayLocked,
        todayLockedFromOverdue
      }
    });

  } catch (error) {
    console.error('❌ Error getting daily stats:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงสถิติรายวัน: ' + error.message
    });
  }
});

/**
 * GET /api/installment/dashboard/debt-trends
 * แนวโน้มยอดลูกหนี้ 6 เดือนย้อนหลัง
 */
router.get('/dashboard/debt-trends', authenticateToken, async (req, res) => {
  try {
    console.log('📈 GET /api/installment/dashboard/debt-trends');

    const now = new Date();
    const months = [];
    const debtData = [];
    const overdueData = [];

    // สร้างข้อมูล 6 เดือนย้อนหลัง
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      months.push(date.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' }));

      // ยอดหนี้รวมในเดือนนั้น
      const totalDebtResult = await InstallmentOrder.aggregate([
        {
          $match: {
            createdAt: { $lte: monthEnd },
            $or: [
              { status: 'ongoing' },
              {
                status: 'completed',
                updatedAt: { $gte: monthStart }
              }
            ]
          }
        },
        { $group: { _id: null, total: { $sum: '$remainingAmount' } } }
      ]);

      // ยอดค้างชำระในเดือนนั้น
      const overdueResult = await InstallmentOrder.aggregate([
        {
          $match: {
            status: 'ongoing',
            nextDueDate: { $lt: monthEnd },
            createdAt: { $lte: monthEnd }
          }
        },
        { $group: { _id: null, total: { $sum: '$monthlyPayment' } } }
      ]);

      debtData.push(totalDebtResult[0]?.total || 0);
      overdueData.push(overdueResult[0]?.total || 0);
    }

    res.json({
      success: true,
      data: {
        labels: months,
        datasets: [
          {
            label: 'ยอดทั้งหมด',
            data: debtData,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)'
          },
          {
            label: 'ยอดค้าง',
            data: overdueData,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)'
          }
        ]
      }
    });

  } catch (error) {
    console.error('❌ Error getting debt trends:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงแนวโน้มยอดหนี้: ' + error.message
    });
  }
});

/**
 * GET /api/installment/dashboard/branch-status
 * สถานะลูกหนี้ตามสาขา
 */
router.get('/dashboard/branch-status', authenticateToken, async (req, res) => {
  try {
    console.log('🏢 GET /api/installment/dashboard/branch-status');

    const User = require('../models/User');
    const Branch = require('../models/Branch');

    // ดึงข้อมูลสาขาทั้งหมด
    const branches = await Branch.find({}).lean();

    const branchData = [];

    for (const branch of branches) {
      // นับลูกหนี้ทั้งหมดในสาขา
      const totalDebtors = await InstallmentOrder.countDocuments({
        branchCode: branch.code,
        status: 'ongoing'
      });

      // นับลูกหนี้ค้างชำระ
      const now = new Date();
      const overdueDebtors = await InstallmentOrder.countDocuments({
        branchCode: branch.code,
        status: 'ongoing',
        nextDueDate: { $lt: now }
      });

      // คำนวณยอดค้างชำระ
      const overdueAmountResult = await InstallmentOrder.aggregate([
        {
          $match: {
            branchCode: branch.code,
            status: 'ongoing',
            nextDueDate: { $lt: now }
          }
        },
        { $group: { _id: null, total: { $sum: '$monthlyPayment' } } }
      ]);

      const overdueAmount = overdueAmountResult[0]?.total || 0;
      const paymentRate = totalDebtors > 0 ?
        Math.round(((totalDebtors - overdueDebtors) / totalDebtors) * 100) : 100;

      branchData.push({
        branchName: branch.name || 'ไม่ระบุ',
        branchCode: branch.code,
        totalDebtors,
        overdueAmount,
        paymentRate
      });
    }

    res.json({
      success: true,
      data: branchData
    });

  } catch (error) {
    console.error('❌ Error getting branch status:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงสถานะสาขา: ' + error.message
    });
  }
});

/**
 * GET /api/installment/dashboard/summary
 * สรุปข้อมูลหลักสำหรับ dashboard
 */
router.get('/dashboard/summary', authenticateToken, async (req, res) => {
  try {
    console.log('📊 GET /api/installment/dashboard/summary');

    // ดึงข้อมูลสัญญาผ่อนชำระทั้งหมด
    const totalContracts = await InstallmentOrder.countDocuments({});
    const activeContracts = await InstallmentOrder.countDocuments({ status: 'ongoing' });
    const completedContracts = await InstallmentOrder.countDocuments({ status: 'completed' });
    const overdueContracts = await InstallmentOrder.countDocuments({
      status: 'ongoing',
      nextDueDate: { $lt: new Date() }
    });

    // คำนวณยอดเงินทั้งหมด
    const totalAmountResult = await InstallmentOrder.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    // คำนวณยอดที่ชำระแล้ว
    const paidAmountResult = await InstallmentOrder.aggregate([
      { $group: { _id: null, total: { $sum: '$paidAmount' } } }
    ]);

    // คำนวณยอดค้างชำระ
    const overdueAmountResult = await InstallmentOrder.aggregate([
      {
        $match: {
          status: 'ongoing',
          nextDueDate: { $lt: new Date() }
        }
      },
      { $group: { _id: null, total: { $sum: '$monthlyPayment' } } }
    ]);

    const totalAmount = totalAmountResult[0]?.total || 0;
    const paidAmount = paidAmountResult[0]?.total || 0;
    const overdueAmount = overdueAmountResult[0]?.total || 0;
    const remainingAmount = totalAmount - paidAmount;

    res.json({
      success: true,
      data: {
        totalContracts,
        activeContracts,
        completedContracts,
        overdueContracts,
        totalAmount,
        paidAmount,
        remainingAmount,
        overdueAmount,
        // เพิ่มข้อมูลเปอร์เซ็นต์
        completionRate: totalContracts > 0 ? Math.round((completedContracts / totalContracts) * 100) : 0,
        collectionRate: totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0
      }
    });

  } catch (error) {
    console.error('❌ Error getting dashboard summary:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสรุป: ' + error.message
    });
  }
});

/**
 * GET /api/installment/notifications/unread-count
 * จำนวนการแจ้งเตือนที่ยังไม่ได้อ่าน
 */
router.get('/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    console.log('🔔 GET /api/installment/notifications/unread-count');

    // นับลูกหนี้ที่ค้างชำระ (ถือเป็นการแจ้งเตือน)
    const now = new Date();
    const overdueCount = await InstallmentOrder.countDocuments({
      status: 'ongoing',
      nextDueDate: { $lt: now }
    });

    // นับสัญญาที่ครบกำหนดในอีก 3 วัน
    const threeDaysLater = new Date();
    threeDaysLater.setDate(now.getDate() + 3);

    const upcomingDue = await InstallmentOrder.countDocuments({
      status: 'ongoing',
      nextDueDate: { $gte: now, $lte: threeDaysLater }
    });

    res.json({
      success: true,
      data: {
        unreadCount: overdueCount + upcomingDue,
        overdueCount,
        upcomingDue
      }
    });

  } catch (error) {
    console.error('❌ Error getting notification count:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงการแจ้งเตือน: ' + error.message
    });
  }
});

// ==================== NEW CONTRACT MANAGEMENT ROUTES ====================

/**
 * DELETE /api/installment/contract/:contractId
 * Cancel installment contract
 */
router.delete('/contract/:contractId',
  securityHeaders,
  sanitizeInput,
  authenticateToken,
  financialOperationsLimiter,
  auditFinancialOperation,
  validateCancellationData,
  handleValidationErrors,
  async (req, res) => {
    await installmentController.cancelContract(req, res);
  }
);

/**
 * PUT /api/installment/contract/:contractId
 * Update installment contract
 */
router.put('/contract/:contractId',
  securityHeaders,
  sanitizeInput,
  authenticateToken,
  generalInstallmentLimiter,
  auditFinancialOperation,
  async (req, res) => {
  try {
    const { contractId } = req.params;
    const updateData = req.body;

    // Validate required fields for contract update
    const allowedFields = [
      'customer_info', 'items', 'downPayment', 'monthlyPayment',
      'installmentCount', 'notes', 'guarantor'
    ];

    // Filter only allowed fields
    const filteredUpdate = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdate[key] = updateData[key];
      }
    });

    // Add update metadata
    filteredUpdate.updatedAt = new Date();
    filteredUpdate.updatedBy = req.user?.id;

    const updatedContract = await InstallmentOrder.findByIdAndUpdate(
      contractId,
      filteredUpdate,
      { new: true, runValidators: true }
    );

    if (!updatedContract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    res.json({
      success: true,
      message: 'Contract updated successfully',
      data: updatedContract
    });

  } catch (error) {
    console.error('Error updating contract:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update contract',
      error: error.message
    });
  }
});

/**
 * POST /api/installment/payment-schedule/:contractId
 * Generate payment schedule for contract
 */
router.post('/payment-schedule/:contractId',
  securityHeaders,
  sanitizeInput,
  authenticateToken,
  generalInstallmentLimiter,
  validatePaymentScheduleData,
  handleValidationErrors,
  async (req, res) => {
    await installmentController.generatePaymentSchedule(req, res);
  }
);

/**
 * POST /api/installment/late-payment/:contractId
 * Process late payment with penalties
 */
router.post('/late-payment/:contractId',
  securityHeaders,
  sanitizeInput,
  authenticateToken,
  financialOperationsLimiter,
  auditFinancialOperation,
  validateLatePaymentData,
  handleValidationErrors,
  async (req, res) => {
    await installmentController.processLatePayment(req, res);
  }
);

/**
 * POST /api/installment/refund/:contractId
 * Process refund for contract
 */
router.post('/refund/:contractId',
  securityHeaders,
  sanitizeInput,
  authenticateToken,
  financialOperationsLimiter,
  auditFinancialOperation,
  validateRefundData,
  handleValidationErrors,
  async (req, res) => {
    await installmentController.processRefund(req, res);
  }
);

/**
 * POST /api/installment/commission/:contractId
 * Calculate commission for contract
 */
router.post('/commission/:contractId',
  securityHeaders,
  sanitizeInput,
  authenticateToken,
  generalInstallmentLimiter,
  async (req, res) => {
    await installmentController.calculateCommission(req, res);
  }
);

/**
 * GET /api/installment/payment-reminders
 * Send payment reminders for upcoming due dates
 */
router.get('/payment-reminders',
  securityHeaders,
  authenticateToken,
  generalInstallmentLimiter,
  async (req, res) => {
    await installmentController.sendPaymentReminders(req, res);
  }
);

/**
 * GET /api/installment/overdue-notifications
 * Send overdue notifications for past due payments
 */
router.get('/overdue-notifications',
  securityHeaders,
  authenticateToken,
  generalInstallmentLimiter,
  async (req, res) => {
    await installmentController.sendOverdueNotifications(req, res);
  }
);

/**
 * GET /api/installment/contract/:contractId/schedule
 * Get payment schedule for specific contract
 */
router.get('/contract/:contractId/schedule',
  securityHeaders,
  sanitizeInput,
  authenticateToken,
  generalInstallmentLimiter,
  async (req, res) => {
  try {
    const { contractId } = req.params;

    const contract = await InstallmentOrder.findById(contractId)
      .select('paymentSchedule contractNo status')
      .lean();

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    res.json({
      success: true,
      data: {
        contractId,
        contractNo: contract.contractNo,
        status: contract.status,
        paymentSchedule: contract.paymentSchedule || []
      }
    });

  } catch (error) {
    console.error('Error getting payment schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment schedule',
      error: error.message
    });
  }
});

/**
 * GET /api/installment/contracts/overdue
 * Get all overdue contracts with summary
 */
router.get('/contracts/overdue',
  securityHeaders,
  authenticateToken,
  generalInstallmentLimiter,
  async (req, res) => {
  try {
    const currentDate = new Date();

    const overdueContracts = await InstallmentOrder.find({
      status: { $in: ['active', 'overdue'] },
      'paymentSchedule.status': 'pending',
      'paymentSchedule.dueDate': { $lt: currentDate }
    })
    .populate('customer', 'individual.firstName individual.lastName corporate.companyName')
    .select('contractNo customer_info paymentSchedule status totalAmount remainingBalance')
    .lean();

    // Calculate overdue summary for each contract
    const summary = overdueContracts.map(contract => {
      const overduePayments = contract.paymentSchedule.filter(
        p => p.status === 'pending' && new Date(p.dueDate) < currentDate
      );

      const totalOverdueAmount = overduePayments.reduce((sum, p) => sum + p.paymentAmount, 0);
      const oldestOverdue = overduePayments.length > 0 ?
        Math.floor((currentDate - new Date(Math.min(...overduePayments.map(p => new Date(p.dueDate))))) / (1000 * 60 * 60 * 24)) : 0;

      return {
        contractId: contract._id,
        contractNo: contract.contractNo,
        customerName: contract.customer_info?.firstName + ' ' + contract.customer_info?.lastName,
        status: contract.status,
        totalAmount: contract.totalAmount,
        remainingBalance: contract.remainingBalance,
        overduePaymentsCount: overduePayments.length,
        totalOverdueAmount,
        daysPastDue: oldestOverdue
      };
    });

    res.json({
      success: true,
      message: `Found ${overdueContracts.length} overdue contracts`,
      data: {
        count: overdueContracts.length,
        totalOverdueAmount: summary.reduce((sum, c) => sum + c.totalOverdueAmount, 0),
        contracts: summary
      }
    });

  } catch (error) {
    console.error('Error getting overdue contracts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get overdue contracts',
      error: error.message
    });
  }
});

/**
 * GET /api/installment/reports/tax-summary
 * สรุปรายงานภาษีขาย - Enhanced with tax invoice numbers, branch info, and customer tax IDs
 */
router.get('/reports/tax-summary', authenticateToken, async (req, res) => {
  try {
    console.log('📊 GET /api/installment/reports/tax-summary - Enhanced version');

    const { page = 1, limit = 10, branchCode, search, status: statusFilter } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query for filtering
    const query = { deleted_at: null };
    if (branchCode) {
      query.branchCode = branchCode;
    }
    if (search) {
      query.$or = [
        { contractNo: { $regex: search, $options: 'i' } },
        { 'customer_info.firstName': { $regex: search, $options: 'i' } },
        { 'customer_info.lastName': { $regex: search, $options: 'i' } }
      ];
    }

    // ดึงข้อมูลสัญญาทั้งหมดพร้อม populate ข้อมูลลูกค้า
    const contracts = await InstallmentOrder.find(query)
      .populate('customerId', 'first_name last_name tax_id phone_number')
      .lean();

    // Get total count for pagination
    const totalContracts = await InstallmentOrder.countDocuments(query);

    // ดึงข้อมูล Tax Invoice ที่เกี่ยวข้อง
    const contractNos = contracts.map(c => c.contractNo).filter(Boolean);
    const taxInvoices = await TaxInvoice.find({
      contractNo: { $in: contractNos }
    }).lean();

    // สร้าง mapping ของ contract กับ tax invoice
    const taxInvoiceMap = {};
    taxInvoices.forEach(invoice => {
      if (invoice.contractNo) {
        taxInvoiceMap[invoice.contractNo] = invoice;
      }
    });

    // คำนวณข้อมูลภาษี
    const taxData = await Promise.all(contracts.map(async contract => {
      const contractValue = contract.finalTotalAmount || contract.totalAmount || 0;
      const taxAmount = Math.round(contractValue * 0.07 / 1.07); // ภาษี VAT 7%
      const netAmount = contractValue - taxAmount;

      // กำหนดวันครบกำหนดชำระภาษี (30 วันหลังสร้างสัญญา)
      const dueDate = new Date(contract.createdAt);
      dueDate.setDate(dueDate.getDate() + 30);

      // กำหนดสถานะภาษี
      let status = 'pending';
      const today = new Date();
      if (contract.taxPaymentDate) {
        status = 'paid';
      } else if (dueDate < today) {
        status = 'overdue';
      }

      // ชื่อลูกค้าและข้อมูลลูกค้า
      let customerName = 'ไม่ระบุ';
      let customerTaxId = '';
      let customerPhone = '';

      // ลองหาข้อมูลลูกค้าจากหลายแหล่ง
      if (contract.customerId) {
        customerName = `${contract.customerId.first_name || ''} ${contract.customerId.last_name || ''}`.trim();
        customerTaxId = contract.customerId.tax_id || '';
        customerPhone = contract.customerId.phone_number || '';
      } else if (contract.customer_info) {
        const { prefix, firstName, lastName, taxId, phoneNumber } = contract.customer_info;
        customerName = `${prefix || ''} ${firstName || ''} ${lastName || ''}`.trim();
        customerTaxId = taxId || '';
        customerPhone = phoneNumber || '';
      }

      // ชื่อสินค้า
      let productName = 'ไม่ระบุ';
      if (contract.items && contract.items.length > 0) {
        productName = contract.items[0].productName || contract.items[0].name || 'ไม่ระบุ';
      }

      // ข้อมูล Tax Invoice
      const relatedTaxInvoice = taxInvoiceMap[contract.contractNo];
      const taxInvoiceNumber = relatedTaxInvoice?.taxInvoiceNumber || null;

      // ข้อมูลสาขา
      let branchInfo = {
        code: contract.branchCode || 'MAIN',
        name: 'สาขาหลัก',
        address: ''
      };

      // กำหนดชื่อสาขาตาม branchCode
      switch (contract.branchCode) {
        case 'PATTANI':
          branchInfo.name = 'สาขาปัตตานี';
          branchInfo.address = '148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000';
          break;
        case 'YALA':
          branchInfo.name = 'สาขายะลา';
          branchInfo.address = 'ยะลา';
          break;
        case 'NARATHIWAT':
          branchInfo.name = 'สาขานราธิวาส';
          branchInfo.address = 'นราธิวาส';
          break;
        default:
          branchInfo.name = 'สาขาหลัก';
          branchInfo.address = '148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000';
      }

      return {
        contractNo: contract.contractNo || contract._id,
        customer: customerName,
        customerTaxId: customerTaxId,
        customerPhone: customerPhone,
        product: productName,
        contractValue: contractValue,
        netAmount: netAmount,
        taxAmount: taxAmount,
        dueDate: dueDate.toISOString().split('T')[0],
        status: status,
        paymentDate: contract.taxPaymentDate || null,
        createdAt: contract.createdAt,
        taxInvoiceNumber: taxInvoiceNumber,
        branch: branchInfo,
        hasVat: true // ระบบผ่อนชำระมักมี VAT เสมอ
      };
    }));

    // Apply status filter if specified
    let filteredTaxData = taxData;
    if (statusFilter) {
      filteredTaxData = taxData.filter(item => item.status === statusFilter);
    }

    // Apply pagination to filtered data
    const paginatedData = filteredTaxData
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(skip, skip + parseInt(limit));

    // คำนวณสถิติรวมจากข้อมูลทั้งหมด (ไม่ใช่เฉพาะหน้าปัจจุบัน)
    let totalTax = 0;
    let pendingTax = 0;
    let overdueTax = 0;
    let paidTax = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    let paidCount = 0;

    filteredTaxData.forEach(item => {
      totalTax += item.taxAmount;

      if (item.status === 'pending') {
        pendingTax += item.taxAmount;
        pendingCount++;
      } else if (item.status === 'overdue') {
        overdueTax += item.taxAmount;
        overdueCount++;
      } else if (item.status === 'paid') {
        paidTax += item.taxAmount;
        paidCount++;
      }
    });

    // Pagination metadata
    const pagination = {
      currentPage: parseInt(page),
      totalPages: Math.ceil(filteredTaxData.length / parseInt(limit)),
      totalItems: filteredTaxData.length,
      itemsPerPage: parseInt(limit),
      hasNextPage: skip + parseInt(limit) < filteredTaxData.length,
      hasPrevPage: parseInt(page) > 1
    };

    res.json({
      success: true,
      data: {
        summary: {
          totalTax,
          pendingTax,
          overdueTax,
          paidTax,
          pendingCount,
          overdueCount,
          paidCount,
          totalContracts: filteredTaxData.length,
          totalVat: totalTax, // Alias for compatibility
          totalPaymentVat: paidTax, // Alias for compatibility
          contractCount: filteredTaxData.length, // Alias for compatibility
          paymentCount: paidCount // Alias for compatibility
        },
        details: paginatedData,
        pagination: pagination,
        filters: {
          branchCode: branchCode || null,
          search: search || null,
          status: statusFilter || null
        }
      },
      message: 'ดึงข้อมูลสรุปภาษีสำเร็จ'
    });

  } catch (error) {
    console.error('❌ Error getting tax summary:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลภาษี: ' + error.message
    });
  }
});

/**
 * GET /api/installment/reports/tax-summary/export
 * ส่งออกข้อมูลภาษีเป็น Excel file
 */
router.get('/reports/tax-summary/export', authenticateToken, async (req, res) => {
  try {
    console.log('📊 GET /api/installment/reports/tax-summary/export');

    const { branchCode, search, status: statusFilter, format = 'excel' } = req.query;

    // Build query for filtering (same as the main endpoint)
    const query = { deleted_at: null };
    if (branchCode) {
      query.branchCode = branchCode;
    }
    if (search) {
      query.$or = [
        { contractNo: { $regex: search, $options: 'i' } },
        { 'customer_info.firstName': { $regex: search, $options: 'i' } },
        { 'customer_info.lastName': { $regex: search, $options: 'i' } }
      ];
    }

    // ดึงข้อมูลสัญญาทั้งหมดที่ตรงตามเงื่อนไข
    const contracts = await InstallmentOrder.find(query)
      .populate('customerId', 'first_name last_name tax_id phone_number')
      .lean();

    // ดึงข้อมูล Tax Invoice ที่เกี่ยวข้อง
    const contractNos = contracts.map(c => c.contractNo).filter(Boolean);
    const taxInvoices = await TaxInvoice.find({
      contractNo: { $in: contractNos }
    }).lean();

    // สร้าง mapping ของ contract กับ tax invoice
    const taxInvoiceMap = {};
    taxInvoices.forEach(invoice => {
      if (invoice.contractNo) {
        taxInvoiceMap[invoice.contractNo] = invoice;
      }
    });

    // คำนวณข้อมูลภาษี (same logic as main endpoint)
    const taxData = contracts.map(contract => {
      const contractValue = contract.finalTotalAmount || contract.totalAmount || 0;
      const taxAmount = Math.round(contractValue * 0.07 / 1.07);
      const netAmount = contractValue - taxAmount;

      const dueDate = new Date(contract.createdAt);
      dueDate.setDate(dueDate.getDate() + 30);

      let status = 'pending';
      const today = new Date();
      if (contract.taxPaymentDate) {
        status = 'paid';
      } else if (dueDate < today) {
        status = 'overdue';
      }

      let customerName = 'ไม่ระบุ';
      let customerTaxId = '';
      let customerPhone = '';

      if (contract.customerId) {
        customerName = `${contract.customerId.first_name || ''} ${contract.customerId.last_name || ''}`.trim();
        customerTaxId = contract.customerId.tax_id || '';
        customerPhone = contract.customerId.phone_number || '';
      } else if (contract.customer_info) {
        const { prefix, firstName, lastName, taxId, phoneNumber } = contract.customer_info;
        customerName = `${prefix || ''} ${firstName || ''} ${lastName || ''}`.trim();
        customerTaxId = taxId || '';
        customerPhone = phoneNumber || '';
      }

      let productName = 'ไม่ระบุ';
      if (contract.items && contract.items.length > 0) {
        productName = contract.items[0].productName || contract.items[0].name || 'ไม่ระบุ';
      }

      const relatedTaxInvoice = taxInvoiceMap[contract.contractNo];
      const taxInvoiceNumber = relatedTaxInvoice?.taxInvoiceNumber || 'ยังไม่ออก';

      let branchName = 'สาขาหลัก';
      switch (contract.branchCode) {
        case 'PATTANI':
          branchName = 'สาขาปัตตานี';
          break;
        case 'YALA':
          branchName = 'สาขายะลา';
          break;
        case 'NARATHIWAT':
          branchName = 'สาขานราธิวาส';
          break;
      }

      return {
        contractNo: contract.contractNo || contract._id,
        customer: customerName,
        customerTaxId: customerTaxId,
        customerPhone: customerPhone,
        product: productName,
        contractValue: contractValue,
        netAmount: netAmount,
        taxAmount: taxAmount,
        dueDate: dueDate.toISOString().split('T')[0],
        status: status,
        paymentDate: contract.taxPaymentDate ? contract.taxPaymentDate.toISOString().split('T')[0] : '',
        taxInvoiceNumber: taxInvoiceNumber,
        branchName: branchName,
        branchCode: contract.branchCode || 'MAIN'
      };
    });

    // Apply status filter if specified
    let filteredData = taxData;
    if (statusFilter) {
      filteredData = taxData.filter(item => item.status === statusFilter);
    }

    if (format === 'csv') {
      // CSV Export
      let csv = 'หมายเลขสัญญา,ชื่อลูกค้า,เลขบัตรประชาชน,เบอร์โทร,สินค้า,มูลค่าสัญญา,มูลค่าก่อนภาษี,ภาษี7%,กำหนดชำระ,สถานะ,วันที่ชำระ,เลขที่ใบกำกับภาษี,สาขา\n';

      filteredData.forEach(item => {
        const statusText = item.status === 'paid' ? 'ชำระแล้ว' :
                          item.status === 'overdue' ? 'เกินกำหนด' : 'รอชำระ';

        csv += `"${item.contractNo}","${item.customer}","${item.customerTaxId}","${item.customerPhone}","${item.product}",${item.contractValue},${item.netAmount},${item.taxAmount},"${item.dueDate}","${statusText}","${item.paymentDate}","${item.taxInvoiceNumber}","${item.branchName}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="tax_summary_${new Date().toISOString().split('T')[0]}.csv"`);

      // Add BOM for Excel UTF-8 compatibility
      const BOM = '\uFEFF';
      res.send(BOM + csv);
    } else {
      // JSON Export (for Excel processing on frontend)
      res.json({
        success: true,
        data: {
          headers: [
            'หมายเลขสัญญา',
            'ชื่อลูกค้า',
            'เลขบัตรประชาชน',
            'เบอร์โทร',
            'สินค้า',
            'มูลค่าสัญญา',
            'มูลค่าก่อนภาษี',
            'ภาษี 7%',
            'กำหนดชำระ',
            'สถานะ',
            'วันที่ชำระ',
            'เลขที่ใบกำกับภาษี',
            'สาขา'
          ],
          rows: filteredData.map(item => [
            item.contractNo,
            item.customer,
            item.customerTaxId,
            item.customerPhone,
            item.product,
            item.contractValue,
            item.netAmount,
            item.taxAmount,
            item.dueDate,
            item.status === 'paid' ? 'ชำระแล้ว' :
            item.status === 'overdue' ? 'เกินกำหนด' : 'รอชำระ',
            item.paymentDate,
            item.taxInvoiceNumber,
            item.branchName
          ]),
          summary: {
            totalRecords: filteredData.length,
            totalTax: filteredData.reduce((sum, item) => sum + item.taxAmount, 0),
            exportDate: new Date().toISOString()
          }
        },
        message: 'ส่งออกข้อมูลภาษีสำเร็จ'
      });
    }

  } catch (error) {
    console.error('❌ Error exporting tax summary:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการส่งออกข้อมูล: ' + error.message
    });
  }
});

/**
 * POST /api/installment/tax-reports/:contractNo/payment
 * บันทึกการชำระภาษี
 */
router.post('/tax-reports/:contractNo/payment', authenticateToken, async (req, res) => {
  try {
    const { contractNo } = req.params;
    console.log(`💰 POST /api/installment/tax-reports/${contractNo}/payment`);

    const contract = await InstallmentOrder.findOne({
      contractNo: contractNo,
      deleted_at: null
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบสัญญาที่ระบุ'
      });
    }

    // อัพเดทวันที่ชำระภาษี
    contract.taxPaymentDate = new Date();
    await contract.save();

    res.json({
      success: true,
      message: 'บันทึกการชำระภาษีเรียบร้อยแล้ว',
      data: {
        contractNo: contract.contractNo,
        paymentDate: contract.taxPaymentDate
      }
    });

  } catch (error) {
    console.error('❌ Error recording tax payment:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการบันทึกการชำระภาษี: ' + error.message
    });
  }
});

/**
 * GET /api/installment/tax-reports
 * รายงานภาษีขาย (alias endpoint)
 */
router.get('/tax-reports', authenticateToken, async (req, res) => {
  try {
    console.log('📊 GET /api/installment/tax-reports (redirecting to tax-summary)');

    // เรียกใช้งาน tax-summary endpoint
    const taxSummaryRoute = router.stack.find(layer =>
      layer.route && layer.route.path === '/reports/tax-summary'
    );

    if (taxSummaryRoute) {
      return taxSummaryRoute.route.stack[0].handle(req, res);
    }

    // Fallback: redirect
    res.redirect('/api/installment/reports/tax-summary');

  } catch (error) {
    console.error('❌ Error in tax-reports endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลภาษี: ' + error.message
    });
  }
});

/**
 * POST /api/installment/deposits
 * สร้างใบรับเงินมัดจำใหม่
 */
router.post('/deposits', authenticateToken, async (req, res) => {
  try {
    console.log('💰 POST /api/installment/deposits');

    const {
      receiptNumber,
      dateCreated,
      customerId,
      productId,
      depositAmount,
      paymentMethod,
      branchId,
      status,
      notes
    } = req.body;

    // Validate required fields
    if (!customerId || !depositAmount || !branchId) {
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ครบถ้วน กรุณาระบุลูกค้า จำนวนเงิน และสาขา'
      });
    }

    // Create new installment order for deposit
    const newDeposit = new InstallmentOrder({
      contractNo: receiptNumber || `DEP${Date.now()}`,
      customer: customerId,
      downPayment: Math.max(0, parseFloat(depositAmount) || 0),
      paymentMethod: paymentMethod || 'cash',
      branchId: branchId,
      status: status || 'active',
      notes: notes || '',
      items: productId ? [{
        productId: productId,
        productName: 'สินค้ามัดจำ',
        quantity: 1,
        unitPrice: depositAmount,
        totalPrice: depositAmount
      }] : [],
      totalAmount: depositAmount,
      finalTotalAmount: depositAmount,
      createdAt: dateCreated ? new Date(dateCreated) : new Date(),
      createdBy: req.user.userId
    });

    await newDeposit.save();

    res.json({
      success: true,
      data: newDeposit,
      message: 'บันทึกใบรับเงินมัดจำเรียบร้อยแล้ว'
    });

  } catch (error) {
    console.error('❌ Error creating deposit:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการบันทึกเงินมัดจำ: ' + error.message
    });
  }
});

/**
 * PUT /api/installment/payment/:paymentId
 * แก้ไขข้อมูลการชำระเงิน
 */
router.put('/payment/:paymentId', authenticateToken, async (req, res) => {
  try {
    console.log('📝 PUT /api/installment/payment/:paymentId - Updating payment record');

    const { paymentId } = req.params;
    const { amount, paymentMethod, receiptNumber, notes } = req.body;

    // Find and update the payment record
    const updatedPayment = await InstallmentPayment.findByIdAndUpdate(
      paymentId,
      {
        amount: parseFloat(amount),
        paymentMethod: paymentMethod,
        receiptNumber: receiptNumber,
        notes: notes,
        updatedAt: new Date(),
        updatedBy: req.user.userId
      },
      { new: true }
    );

    if (!updatedPayment) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลการชำระเงิน'
      });
    }

    res.json({
      success: true,
      data: updatedPayment,
      message: 'แก้ไขข้อมูลการชำระเงินเรียบร้อยแล้ว'
    });

  } catch (error) {
    console.error('❌ Error updating payment:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลการชำระเงิน: ' + error.message
    });
  }
});

/**
 * PUT /api/installment/deposits/:id
 * แก้ไขข้อมูลเงินมัดจำ
 */
router.put('/deposits/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`💰 PUT /api/installment/deposits/${id}`);

    const {
      receiptNumber,
      dateCreated,
      customerId,
      productId,
      depositAmount,
      paymentMethod,
      branchId,
      status,
      notes
    } = req.body;

    const deposit = await InstallmentOrder.findById(id);
    if (!deposit) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลเงินมัดจำ'
      });
    }

    // Update fields
    if (receiptNumber) deposit.contractNo = receiptNumber;
    if (customerId) deposit.customer = customerId;
    if (depositAmount !== undefined) {
      deposit.downPayment = Math.max(0, parseFloat(depositAmount) || 0);
      deposit.totalAmount = deposit.downPayment;
      deposit.finalTotalAmount = deposit.downPayment;
    }
    if (paymentMethod) deposit.paymentMethod = paymentMethod;
    if (branchId) deposit.branchId = branchId;
    if (status) deposit.status = status;
    if (notes !== undefined) deposit.notes = notes;
    if (dateCreated) deposit.createdAt = new Date(dateCreated);

    // Update product info if provided
    if (productId && depositAmount) {
      deposit.items = [{
        productId: productId,
        productName: 'สินค้ามัดจำ',
        quantity: 1,
        unitPrice: depositAmount,
        totalPrice: depositAmount
      }];
    }

    deposit.updatedAt = new Date();
    deposit.updatedBy = req.user.userId;

    await deposit.save();

    res.json({
      success: true,
      data: deposit,
      message: 'แก้ไขข้อมูลเงินมัดจำเรียบร้อยแล้ว'
    });

  } catch (error) {
    console.error('❌ Error updating deposit:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการแก้ไขเงินมัดจำ: ' + error.message
    });
  }
});

/**
 * DELETE /api/installment/deposits/:id
 * ลบข้อมูลเงินมัดจำ (soft delete)
 */
router.delete('/deposits/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`💰 DELETE /api/installment/deposits/${id}`);

    const deposit = await InstallmentOrder.findById(id);
    if (!deposit) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลเงินมัดจำ'
      });
    }

    // Soft delete
    deposit.deleted_at = new Date();
    deposit.deletedBy = req.user.userId;
    await deposit.save();

    res.json({
      success: true,
      message: 'ลบข้อมูลเงินมัดจำเรียบร้อยแล้ว'
    });

  } catch (error) {
    console.error('❌ Error deleting deposit:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบเงินมัดจำ: ' + error.message
    });
  }
});

/**
 * GET /api/installment/deposits/generate-number
 * สร้างเลขที่ใบรับเงินมัดจำอัตโนมัติ
 */
router.get('/deposits/generate-number', authenticateToken, async (req, res) => {
  try {
    console.log('🔢 GET /api/installment/deposits/generate-number');

    // Generate unique deposit number
    const today = new Date();
    const year = today.getFullYear().toString().substr(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');

    // Count today's deposits
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const todayCount = await InstallmentOrder.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      downPayment: { $gt: 0 },
      deleted_at: null
    });

    const sequence = (todayCount + 1).toString().padStart(3, '0');
    const depositNumber = `DEP${year}${month}${day}${sequence}`;

    res.json({
      success: true,
      number: depositNumber,
      message: 'สร้างเลขที่ใบรับเงินมัดจำเรียบร้อยแล้ว'
    });

  } catch (error) {
    console.error('❌ Error generating deposit number:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างเลขที่ใบรับเงินมัดจำ: ' + error.message
    });
  }
});

/**
 * GET /api/installment/deposits/export
 * ส่งออกข้อมูลเงินมัดจำเป็น Excel
 */
router.get('/deposits/export', authenticateToken, async (req, res) => {
  try {
    console.log('📊 GET /api/installment/deposits/export');

    const { search, status, branch, date, format = 'excel' } = req.query;

    // Build query
    const query = { deleted_at: null, downPayment: { $gt: 0 } };

    if (search) {
      query.$or = [
        { contractNo: { $regex: search, $options: 'i' } },
        { 'customer_info.firstName': { $regex: search, $options: 'i' } },
        { 'customer_info.lastName': { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.status = status;
    if (branch) query.branchId = branch;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.createdAt = { $gte: startDate, $lt: endDate };
    }

    const deposits = await InstallmentOrder.find(query)
      .populate('customer', 'prefix firstName lastName')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // For now, return JSON data (Excel export can be implemented later)
    res.json({
      success: true,
      data: deposits,
      message: 'ส่งออกข้อมูลเงินมัดจำเรียบร้อยแล้ว'
    });

  } catch (error) {
    console.error('❌ Error exporting deposits:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการส่งออกข้อมูล: ' + error.message
    });
  }
});

/**
 * GET /api/installment/tax-summary
 * ดึงข้อมูลสรุปภาษีจากระบบผ่อน
 */
router.get('/tax-summary', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, branchCode } = req.query;

    // สร้าง query สำหรับค้นหา
    const query = { status: { $in: ['active', 'ongoing', 'completed'] } };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (branchCode) {
      query.branchCode = branchCode;
    }

    // ดึงข้อมูลสัญญาผ่อน
    const contracts = await InstallmentOrder.find(query)
      .populate('customer', 'prefix firstName lastName taxId')
      .lean();

    // คำนวณข้อมูลภาษี
    let totalSales = 0;
    let totalVat = 0;
    let totalWithVat = 0;
    let totalWithoutVat = 0;

    const taxDetails = contracts.map(contract => {
      // ดึงข้อมูลสินค้าจาก items array
      const productNames = contract.items?.map(item => item.name || item.productName || 'สินค้า').join(', ') || 'สินค้าผ่อนชำระ';

      const hasVat = contract.items?.some(item =>
        item.taxType && item.taxType !== 'ไม่มี VAT' && item.taxType !== 'ไม่มีภาษี'
      );

      const contractTotal = contract.totalAmount || contract.finalTotalAmount || 0;
      let vat = 0;
      let beforeVat = contractTotal;

      if (hasVat) {
        // คำนวณ VAT 7%
        beforeVat = contractTotal / 1.07;
        vat = contractTotal - beforeVat;
        totalWithVat += contractTotal;
        totalVat += vat;
      } else {
        totalWithoutVat += contractTotal;
      }

      totalSales += contractTotal;

      // จัดการชื่อลูกค้า - ถ้า customer ถูก populate แล้ว
      let customerName = 'ไม่ระบุ';
      if (contract.customer) {
        if (typeof contract.customer === 'object') {
          // Customer was populated
          customerName = `${contract.customer.prefix || ''}${contract.customer.firstName || ''} ${contract.customer.lastName || ''}`.trim();
        }
      } else if (contract.customer_info) {
        // ใช้ customer_info ถ้ามี
        customerName = `${contract.customer_info.prefix || ''}${contract.customer_info.firstName || ''} ${contract.customer_info.lastName || ''}`.trim();
      } else if (contract.customerName) {
        customerName = contract.customerName;
      }

      return {
        contractNumber: contract.contractNo || contract.contractNumber || contract._id,
        customerName: customerName,
        product: productNames,
        taxId: contract.customer?.taxId || contract.customer_info?.taxId || '-',
        date: contract.createdAt,
        amount: beforeVat,
        vat: vat,
        total: contractTotal,
        hasVat: hasVat,
        status: contract.status
      };
    });

    // ดึงข้อมูลการชำระเงินสำหรับภาษี
    const paymentQuery = { status: 'confirmed' };

    if (startDate && endDate) {
      paymentQuery.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (branchCode) {
      paymentQuery.branchCode = branchCode;
    }

    const payments = await InstallmentPayment.find(paymentQuery)
      .populate('contractId', 'contractNumber customerName')
      .lean();

    // คำนวณภาษีจากการชำระเงิน
    let totalPaymentReceived = 0;
    let totalPaymentVat = 0;

    payments.forEach(payment => {
      totalPaymentReceived += payment.amount || 0;
      // ประมาณการ VAT จากการชำระ (7%)
      if (payment.amount) {
        const estimatedVat = (payment.amount / 1.07) * 0.07;
        totalPaymentVat += estimatedVat;
      }
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalSales,
          totalVat,
          totalWithVat,
          totalWithoutVat,
          totalPaymentReceived,
          totalPaymentVat,
          contractCount: contracts.length,
          paymentCount: payments.length
        },
        details: taxDetails,
        payments: payments.map(p => ({
          paymentId: p.paymentId,
          contractNumber: p.contractId?.contractNumber || p.contractNumber,
          customerName: p.contractId?.customerName || p.customerName,
          paymentDate: p.paymentDate,
          amount: p.amount,
          estimatedVat: (p.amount / 1.07) * 0.07,
          paymentMethod: p.paymentMethod
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error fetching tax summary:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลภาษี: ' + error.message
    });
  }
});

/**
 * GET /api/installment/tax-report
 * รายงานภาษีขายจากระบบผ่อน
 */
router.get('/tax-report', authenticateToken, async (req, res) => {
  try {
    const { month, year, branchCode } = req.query;

    // สร้างช่วงวันที่สำหรับเดือนที่เลือก
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const query = {
      paymentDate: {
        $gte: startDate,
        $lte: endDate
      },
      status: 'confirmed'
    };

    if (branchCode) {
      query.branchCode = branchCode;
    }

    // ดึงข้อมูลการชำระเงินในเดือนนั้น
    const payments = await InstallmentPayment.find(query)
      .populate({
        path: 'contractId',
        select: 'contractNumber customerName items totalAmount',
        populate: {
          path: 'customer',
          select: 'taxId prefix firstName lastName'
        }
      })
      .sort({ paymentDate: 1 })
      .lean();

    // จัดกลุ่มตามวันที่และคำนวณภาษี
    const taxReport = {};
    let monthlyTotal = 0;
    let monthlyVat = 0;

    payments.forEach(payment => {
      const dateKey = new Date(payment.paymentDate).toISOString().split('T')[0];

      if (!taxReport[dateKey]) {
        taxReport[dateKey] = {
          date: dateKey,
          transactions: [],
          dailyTotal: 0,
          dailyVat: 0
        };
      }

      // ตรวจสอบว่ามี VAT หรือไม่
      const hasVat = payment.contractId?.items?.some(item =>
        item.taxType && item.taxType !== 'ไม่มี VAT' && item.taxType !== 'ไม่มีภาษี'
      );

      const amount = payment.amount || 0;
      let vat = 0;
      let beforeVat = amount;

      if (hasVat) {
        beforeVat = amount / 1.07;
        vat = amount - beforeVat;
      }

      const transaction = {
        paymentId: payment.paymentId,
        receiptNumber: payment.receiptNumber || payment.paymentId,
        contractNumber: payment.contractId?.contractNumber || payment.contractNumber,
        customerName: payment.contractId?.customer ?
          `${payment.contractId.customer.prefix || ''}${payment.contractId.customer.firstName || ''} ${payment.contractId.customer.lastName || ''}`.trim() :
          payment.customerName || 'ไม่ระบุ',
        taxId: payment.contractId?.customer?.taxId || '-',
        amount: beforeVat,
        vat: vat,
        total: amount,
        hasVat: hasVat
      };

      taxReport[dateKey].transactions.push(transaction);
      taxReport[dateKey].dailyTotal += amount;
      taxReport[dateKey].dailyVat += vat;

      monthlyTotal += amount;
      monthlyVat += vat;
    });

    res.json({
      success: true,
      data: {
        period: {
          month: month,
          year: year,
          monthName: new Date(year, month - 1, 1).toLocaleDateString('th-TH', { month: 'long' })
        },
        summary: {
          totalSales: monthlyTotal,
          totalVat: monthlyVat,
          totalBeforeVat: monthlyTotal - monthlyVat,
          transactionCount: payments.length
        },
        dailyReports: Object.values(taxReport)
      }
    });

  } catch (error) {
    console.error('❌ Error generating tax report:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างรายงานภาษี: ' + error.message
    });
  }
});

// ========== ID-BASED ROUTES (ต้องวางท้ายเพื่อไม่ให้ catch specific routes) ==========

// ดึงข้อมูลสัญญาผ่อนชำระตาม ID (ต้องวางไว้ท้ายสุดก่อน error handler)
router.get('/:id', authenticateToken, installmentController.getInstallmentById);

// ========== ERROR HANDLING (วางท้ายไฟล์เท่านั้น) ==========
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.originalUrl} not found`
  });
});

module.exports = router;
