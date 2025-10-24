// routes/documentNumberRoutes.js
// API สำหรับสร้างเลขที่เอกสาร Receipt และ Tax Invoice แบบต่อเนื่อง
const express = require('express');
const router = express.Router();
const { generateDocumentNumber, getDocumentCountToday } = require('../utils/documentNumberGenerator');

/**
 * POST /api/generate-document-number
 * สร้างเลขที่เอกสารแบบต่อเนื่อง
 */
router.post('/generate-document-number', async (req, res) => {
  try {
    console.log('📄 Document Number Generation API called');
    console.log('📋 Request body:', req.body);

    const { hasVatItems, branchCode = '680731' } = req.body;

    // ตรวจสอบ input
    if (typeof hasVatItems !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'hasVatItems must be a boolean'
      });
    }

    // สร้างเลขที่เอกสาร
    const documentNumber = await generateDocumentNumber(hasVatItems, branchCode);

    // ดึงจำนวนเอกสารทั้งหมดในวันนี้เพื่อ verification
    const prefix = hasVatItems ? 'TX-' : 'RE-';
    const todayCount = await getDocumentCountToday(prefix, branchCode);

    console.log('✅ Document number generated successfully:', {
      documentNumber,
      hasVatItems,
      branchCode,
      documentType: hasVatItems ? 'Tax Invoice' : 'Receipt',
      todayCount
    });

    res.json({
      success: true,
      documentNumber,
      metadata: {
        hasVatItems,
        branchCode,
        documentType: hasVatItems ? 'Tax Invoice' : 'Receipt',
        prefix,
        todayCount,
        isSequential: true,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error generating document number:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to generate document number',
      details: error.message
    });
  }
});

/**
 * GET /api/document-count-today/:prefix/:branchCode?
 * ตรวจสอบจำนวนเอกสารที่สร้างในวันนี้
 */
router.get('/document-count-today/:prefix/:branchCode?', async (req, res) => {
  try {
    const { prefix, branchCode = '680731' } = req.params;

    // ตรวจสอบ prefix
    if (!['RE-', 'TX-'].includes(prefix)) {
      return res.status(400).json({
        success: false,
        error: 'Prefix must be RE- or TX-'
      });
    }

    const count = await getDocumentCountToday(prefix, branchCode);

    res.json({
      success: true,
      count,
      prefix,
      branchCode,
      date: new Date().toISOString().split('T')[0]
    });

  } catch (error) {
    console.error('❌ Error getting document count:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to get document count',
      details: error.message
    });
  }
});

/**
 * POST /api/reset-document-counter
 * รีเซ็ตตัวนับเอกสาร (สำหรับ admin เท่านั้น)
 */
router.post('/reset-document-counter', async (req, res) => {
  try {
    const { prefix, branchCode = '680731', confirmReset } = req.body;

    if (!confirmReset) {
      return res.status(400).json({
        success: false,
        error: 'confirmReset is required for safety'
      });
    }

    // ตรวจสอบ prefix
    if (!['RE-', 'TX-'].includes(prefix)) {
      return res.status(400).json({
        success: false,
        error: 'Prefix must be RE- or TX-'
      });
    }

    const Counter = require('../models/POS/Counter');

    // สร้าง counter key สำหรับวันนี้
    const today = new Date();
    const year = (today.getFullYear() + 543).toString().slice(-2);
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateKey = `${year}${month}${day}`;

    const counterKey = `${prefix.toLowerCase().replace('-', '')}_${branchCode}_${dateKey}`;

    // รีเซ็ตตัวนับ
    await Counter.findOneAndUpdate(
      { key: counterKey, reference_value: branchCode },
      { seq: 0 },
      { upsert: true }
    );

    console.log('⚠️ Document counter reset:', {
      prefix,
      branchCode,
      counterKey,
      resetBy: req.user?.email || 'Unknown',
      resetAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Document counter reset successfully',
      prefix,
      branchCode,
      counterKey
    });

  } catch (error) {
    console.error('❌ Error resetting document counter:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to reset document counter',
      details: error.message
    });
  }
});

module.exports = router;
