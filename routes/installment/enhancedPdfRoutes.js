/**
 * @file enhancedPdfRoutes.js
 * @description Routes สำหรับสร้าง PDF เอกสารต่างๆ ด้วยข้อมูลจาก step1-4 ที่ครบถ้วน
 * @version 1.0.0
 * @date 2025-01-27
 */

const express = require('express');
const router = express.Router();
const InstallmentDocumentController = require('../../controllers/pdf/InstallmentDocumentController');
const InstallmentPDFController = require('../../controllers/pdf/InstallmentPDFController');
const authenticateToken = require('../../middlewares/authJWT');
const validateInstallmentData = require('../../middlewares/validateInstallmentData');

// === MIDDLEWARE สำหรับ validation ข้อมูล ===
const validateStepData = (req, res, next) => {
  const { body } = req;

  // Log ข้อมูลที่ได้รับ
  console.log('📋 Received data for PDF generation:', {
    hasStep1Data: !!(body.selectedProducts || body.productType),
    hasStep2Data: !!(body.firstName || body.customerName),
    hasStep3Data: !!(body.paymentSchedule || body.customInstallmentCount),
    hasStep4Data: !!(body.contractTerms || body.contractNumber)
  });

  // ตรวจสอบข้อมูลขั้นพื้นฐาน
  if (!body.selectedProducts && !body.productName) {
    return res.status(400).json({
      success: false,
      message: 'ไม่พบข้อมูลสินค้า (Step 1)',
      missingData: 'selectedProducts'
    });
  }

  if (!body.firstName && !body.customerName) {
    return res.status(400).json({
      success: false,
      message: 'ไม่พบข้อมูลลูกค้า (Step 2)',
      missingData: 'customerInfo'
    });
  }

  next();
};

// === CONTRACT DOCUMENTS ===

/**
 * สร้างสัญญาผ่อนชำระแบบครบถ้วน
 * POST /api/installment/pdf/contract
 */
router.post('/contract', authenticateToken, validateStepData, async (req, res) => {
  try {
    console.log('📄 Creating installment contract with complete data...');
    await InstallmentDocumentController.generateInstallmentContract(req, res);
  } catch (error) {
    console.error('❌ Error in contract generation route:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างสัญญา',
      error: error.message
    });
  }
});

/**
 * สร้างใบเสนอราคาแบบครบถ้วน
 * POST /api/installment/pdf/quotation
 */
router.post('/quotation', authenticateToken, validateStepData, async (req, res) => {
  try {
    console.log('📋 Creating enhanced quotation with step1-3 data...');
    await InstallmentDocumentController.generateQuotation(req, res);
  } catch (error) {
    console.error('❌ Error in quotation generation route:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างใบเสนอราคา',
      error: error.message
    });
  }
});

/**
 * สร้างตารางการผ่อนชำระ
 * POST /api/installment/pdf/payment-schedule
 */
router.post('/payment-schedule', authenticateToken, validateStepData, async (req, res) => {
  try {
    console.log('📅 Creating payment schedule...');
    await InstallmentDocumentController.generatePaymentSchedule(req, res);
  } catch (error) {
    console.error('❌ Error in payment schedule generation route:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างตารางการผ่อนชำระ',
      error: error.message
    });
  }
});

// === ENHANCED PDF GENERATION ===

/**
 * สร้าง PDF แบบเดิมแต่มีข้อมูลเพิ่มเติม
 * POST /api/installment/pdf/enhanced-invoice
 */
router.post('/enhanced-invoice', authenticateToken, validateStepData, async (req, res) => {
  try {
    console.log('🧾 Creating enhanced invoice...');
    await InstallmentPDFController.generateEnhancedInvoice(req, res);
  } catch (error) {
    console.error('❌ Error in enhanced invoice generation:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างใบกำกับภาษี',
      error: error.message
    });
  }
});

/**
 * สร้าง A4 PDF พร้อมข้อมูลจาก step1-4
 * POST /api/installment/pdf/enhanced-a4
 */
router.post('/enhanced-a4', authenticateToken, validateStepData, async (req, res) => {
  try {
    console.log('📄 Creating enhanced A4 document...');
    await InstallmentPDFController.generateEnhancedA4Document(req, res);
  } catch (error) {
    console.error('❌ Error in enhanced A4 generation:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างเอกสาร A4',
      error: error.message
    });
  }
});

// === BATCH DOCUMENT GENERATION ===

/**
 * สร้างเอกสารหลายฉบับพร้อมกัน
 * POST /api/installment/pdf/batch-generate
 */
router.post('/batch-generate', authenticateToken, validateStepData, async (req, res) => {
  try {
    console.log('📦 Generating batch documents...');

    const { documentTypes } = req.body;
    const results = [];

    // สร้างเอกสารตามที่ร้องขอ
    for (const docType of documentTypes) {
      let result;

      switch (docType) {
        case 'contract':
          result = await InstallmentDocumentController.generateInstallmentContract(req, { json: (data) => data });
          break;
        case 'quotation':
          result = await InstallmentDocumentController.generateQuotation(req, { json: (data) => data });
          break;
        case 'payment-schedule':
          result = await InstallmentDocumentController.generatePaymentSchedule(req, { json: (data) => data });
          break;
        default:
          result = { success: false, message: `Unknown document type: ${docType}` };
      }

      results.push({ documentType: docType, ...result });
    }

    res.json({
      success: true,
      message: 'สร้างเอกสารครบถ้วนแล้ว',
      results: results
    });

  } catch (error) {
    console.error('❌ Error in batch generation:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างเอกสารแบบ batch',
      error: error.message
    });
  }
});

// === DATA INTEGRATION UTILITIES ===

/**
 * ตรวจสอบข้อมูลที่ขาดหายไป
 * POST /api/installment/pdf/validate-data
 */
router.post('/validate-data', (req, res) => {
  try {
    const { body } = req;
    const missingData = [];

    // ตรวจสอบข้อมูล Step 1
    if (!body.selectedProducts) missingData.push('selectedProducts (Step 1)');
    if (!body.productType) missingData.push('productType (Step 1)');
    if (!body.downAmount) missingData.push('downAmount (Step 1)');

    // ตรวจสอบข้อมูล Step 2
    if (!body.firstName) missingData.push('firstName (Step 2)');
    if (!body.houseNo) missingData.push('houseNo (Step 2)');
    if (!body.phone) missingData.push('phone (Step 2)');

    // ตรวจสอบข้อมูล Step 3
    if (!body.customInstallmentCount) missingData.push('customInstallmentCount (Step 3)');
    if (!body.paymentSchedule) missingData.push('paymentSchedule (Step 3)');

    // ตรวจสอบข้อมูล Step 4
    if (!body.contractTerms) missingData.push('contractTerms (Step 4)');

    res.json({
      success: true,
      isComplete: missingData.length === 0,
      missingData: missingData,
      availableData: Object.keys(body),
      message: missingData.length === 0 ? 'ข้อมูลครบถ้วน' : `ขาดข้อมูล ${missingData.length} รายการ`
    });

  } catch (error) {
    console.error('❌ Error in data validation:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล',
      error: error.message
    });
  }
});

/**
 * รวบรวมข้อมูลจาก localStorage และ sessionStorage
 * GET /api/installment/pdf/collect-step-data
 */
router.get('/collect-step-data', (req, res) => {
  res.json({
    success: true,
    message: 'ใช้ JavaScript ใน frontend เพื่อรวบรวมข้อมูล',
    instructions: {
      step1: 'localStorage.getItem("cartData") หรือ "selectedProducts"',
      step2: 'localStorage.getItem("customerData") หรือ "customerFormData"',
      step3: 'localStorage.getItem("paymentPlan") หรือ "installmentData"',
      step4: 'localStorage.getItem("contractData") หรือ "finalContractData"'
    },
    sampleCode: `
      // รวบรวมข้อมูลจากทุก step
      const collectStepData = () => {
        return {
          // Step 1 data
          ...JSON.parse(localStorage.getItem('cartData') || '{}'),
          ...JSON.parse(localStorage.getItem('selectedProducts') || '{}'),
          
          // Step 2 data  
          ...JSON.parse(localStorage.getItem('customerData') || '{}'),
          ...JSON.parse(localStorage.getItem('customerFormData') || '{}'),
          
          // Step 3 data
          ...JSON.parse(localStorage.getItem('paymentPlan') || '{}'),
          ...JSON.parse(localStorage.getItem('installmentData') || '{}'),
          
          // Step 4 data
          ...JSON.parse(localStorage.getItem('contractData') || '{}'),
          ...JSON.parse(localStorage.getItem('finalContractData') || '{}')
        };
      };
    `
  });
});

module.exports = router;