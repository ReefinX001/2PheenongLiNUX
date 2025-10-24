/**
 * @file receiptValidationRoutes.js
 * @description Routes for validating Receipt data completeness
 * @version 1.0.0
 * @date 2025-01-31
 */

const express = require('express');
const router = express.Router();
const Receipt = require('../models/Receipt');

/**
 * POST /api/receipt/validate
 * Validate receipt data before saving to database
 */
router.post('/validate', async (req, res) => {
  try {
    console.log('🔍 Validating Receipt data...');
    const receiptData = req.body;

    // Validation results
    const validation = {
      isValid: true,
      missingFields: [],
      warnings: [],
      recommendations: [],
      completeness: {
        total: 0,
        present: 0,
        percentage: 0
      }
    };

    // Required fields check
    const requiredFields = [
      { field: 'receiptNumber', path: 'receiptNumber', description: 'หมายเลขใบเสร็จ' },
      { field: 'customer.name', path: 'customer.name', description: 'ชื่อลูกค้า' },
      { field: 'items', path: 'items', description: 'รายการสินค้า' },
      { field: 'summary', path: 'summary', description: 'สรุปการชำระ' }
    ];

    // Optional but recommended fields
    const recommendedFields = [
      { field: 'customer.taxId', path: 'customer.taxId', description: 'เลขประจำตัวผู้เสียภาษี' },
      { field: 'customer.phone', path: 'customer.phone', description: 'เบอร์โทรศัพท์' },
      { field: 'customer.address', path: 'customer.address', description: 'ที่อยู่' },
      { field: 'signatures.customer', path: 'signatures.customer', description: 'ลายเซ็นลูกค้า' },
      { field: 'signatures.salesperson', path: 'signatures.salesperson', description: 'ลายเซ็นพนักงาน' },
      { field: 'company', path: 'company', description: 'ข้อมูลบริษัท' },
      { field: 'branch', path: 'branch', description: 'ข้อมูลสาขา' }
    ];

    // All fields for completeness calculation
    const allFields = [...requiredFields, ...recommendedFields];
    validation.completeness.total = allFields.length;

    // Check required fields
    for (const field of requiredFields) {
      const value = getNestedValue(receiptData, field.path);
      if (!value || (Array.isArray(value) && value.length === 0)) {
        validation.isValid = false;
        validation.missingFields.push({
          field: field.field,
          description: field.description,
          severity: 'error'
        });
      } else {
        validation.completeness.present++;
      }
    }

    // Check recommended fields
    for (const field of recommendedFields) {
      const value = getNestedValue(receiptData, field.path);
      if (!value || (Array.isArray(value) && value.length === 0)) {
        validation.warnings.push({
          field: field.field,
          description: field.description,
          severity: 'warning',
          impact: 'ข้อมูลไม่สมบูรณ์ อาจส่งผลต่อการสร้าง PDF หรือการส่งอีเมล'
        });
      } else {
        validation.completeness.present++;
      }
    }

    // Calculate completeness percentage
    validation.completeness.percentage = Math.round(
      (validation.completeness.present / validation.completeness.total) * 100
    );

    // Additional validations
    validateCustomerData(receiptData.customer, validation);
    validateItemsData(receiptData.items, validation);
    validateSummaryData(receiptData.summary, validation);
    validateSignatures(receiptData.signatures, validation);

    // Recommendations based on analysis
    generateRecommendations(receiptData, validation);

    console.log('✅ Receipt data validation completed:', {
      isValid: validation.isValid,
      completeness: validation.completeness.percentage + '%',
      missingFields: validation.missingFields.length,
      warnings: validation.warnings.length
    });

    res.json({
      success: true,
      data: validation,
      summary: {
        status: validation.isValid ? 'valid' : 'invalid',
        completeness: validation.completeness.percentage,
        issues: validation.missingFields.length + validation.warnings.length
      }
    });

  } catch (error) {
    console.error('❌ Error validating receipt data:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล',
      details: error.message
    });
  }
});

/**
 * GET /api/receipt/schema
 * Get Receipt schema structure for frontend validation
 */
router.get('/schema', (req, res) => {
  try {
    const schema = {
      required: [
        'receiptNumber',
        'customer.name',
        'items',
        'summary'
      ],
      optional: [
        'documentType',
        'receiptType',
        'issueDate',
        'contractNo',
        'quotationNumber',
        'customer.taxId',
        'customer.phone',
        'customer.address',
        'signatures',
        'company',
        'branch'
      ],
      customerFields: [
        'name', 'fullName', 'prefix', 'first_name', 'last_name',
        'taxId', 'tax_id', 'phone', 'phone_number', 'email', 'address', 'age'
      ],
      itemFields: [
        'product', 'name', 'brand', 'imei', 'quantity', 'unitPrice',
        'totalPrice', 'downAmount', 'termCount', 'installmentAmount'
      ],
      summaryFields: [
        'subtotal', 'discount', 'beforeTax', 'tax', 'netTotal', 'total'
      ]
    };

    res.json({
      success: true,
      data: schema
    });

  } catch (error) {
    console.error('❌ Error getting receipt schema:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงโครงสร้างข้อมูล'
    });
  }
});

// Helper functions
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
}

function validateCustomerData(customer, validation) {
  if (!customer) return;

  // Check for either taxId or tax_id
  if (!customer.taxId && !customer.tax_id) {
    validation.recommendations.push({
      type: 'customer',
      message: 'ควรระบุเลขประจำตัวผู้เสียภาษีเพื่อความถูกต้องของเอกสาร'
    });
  }

  // Check for phone number in either format
  if (!customer.phone && !customer.phone_number) {
    validation.recommendations.push({
      type: 'customer',
      message: 'ควรระบุเบอร์โทรศัพท์เพื่อติดต่อลูกค้า'
    });
  }

  // Validate name completeness
  if (!customer.fullName && (!customer.first_name || !customer.last_name)) {
    validation.warnings.push({
      field: 'customer.name',
      description: 'ชื่อลูกค้าไม่สมบูรณ์',
      severity: 'warning'
    });
  }
}

function validateItemsData(items, validation) {
  if (!Array.isArray(items) || items.length === 0) {
    validation.missingFields.push({
      field: 'items',
      description: 'รายการสินค้าว่างเปล่า',
      severity: 'error'
    });
    return;
  }

  items.forEach((item, index) => {
    if (!item.name) {
      validation.warnings.push({
        field: `items[${index}].name`,
        description: `ชื่อสินค้าในรายการที่ ${index + 1} ไม่มีข้อมูล`,
        severity: 'warning'
      });
    }

    if (!item.quantity || item.quantity <= 0) {
      validation.warnings.push({
        field: `items[${index}].quantity`,
        description: `จำนวนสินค้าในรายการที่ ${index + 1} ไม่ถูกต้อง`,
        severity: 'warning'
      });
    }

    if (!item.unitPrice || item.unitPrice <= 0) {
      validation.warnings.push({
        field: `items[${index}].unitPrice`,
        description: `ราคาสินค้าในรายการที่ ${index + 1} ไม่ถูกต้อง`,
        severity: 'warning'
      });
    }
  });
}

function validateSummaryData(summary, validation) {
  if (!summary) return;

  if (summary.total !== summary.netTotal && summary.netTotal) {
    validation.warnings.push({
      field: 'summary.total',
      description: 'ยอดรวมไม่ตรงกับยอดสุทธิ',
      severity: 'warning'
    });
  }

  if (summary.tax && summary.tax > 0 && !summary.beforeTax) {
    validation.recommendations.push({
      type: 'summary',
      message: 'ควรระบุยอดก่อนภาษีเมื่อมีการคิดภาษี'
    });
  }
}

function validateSignatures(signatures, validation) {
  if (!signatures) return;

  if (!signatures.customer) {
    validation.recommendations.push({
      type: 'signatures',
      message: 'ควรมีลายเซ็นลูกค้าเพื่อยืนยันความถูกต้อง'
    });
  }

  if (!signatures.salesperson) {
    validation.recommendations.push({
      type: 'signatures',
      message: 'ควรมีลายเซ็นพนักงานขายเพื่อรับรองรายการ'
    });
  }
}

function generateRecommendations(receiptData, validation) {
  // Check PDF generation readiness
  if (validation.missingFields.length === 0) {
    validation.recommendations.push({
      type: 'pdf',
      message: '✅ ข้อมูลพร้อมสำหรับการสร้าง PDF'
    });
  } else {
    validation.recommendations.push({
      type: 'pdf',
      message: '⚠️ ข้อมูลอาจไม่เพียงพอสำหรับการสร้าง PDF ที่สมบูรณ์'
    });
  }

  // Check email readiness
  if (receiptData.customer?.email) {
    validation.recommendations.push({
      type: 'email',
      message: '✅ พร้อมส่งอีเมล (มีที่อยู่อีเมลลูกค้า)'
    });
  } else {
    validation.recommendations.push({
      type: 'email',
      message: '⚠️ ไม่สามารถส่งอีเมลได้ (ไม่มีที่อยู่อีเมลลูกค้า)'
    });
  }

  // Completeness recommendations
  if (validation.completeness.percentage >= 90) {
    validation.recommendations.push({
      type: 'completeness',
      message: '🎉 ข้อมูลสมบูรณ์มาก เหมาะสำหรับการใช้งานทุกรูปแบบ'
    });
  } else if (validation.completeness.percentage >= 70) {
    validation.recommendations.push({
      type: 'completeness',
      message: '👍 ข้อมูลค่อนข้างสมบูรณ์ แต่ควรเพิ่มข้อมูลเพิ่มเติม'
    });
  } else {
    validation.recommendations.push({
      type: 'completeness',
      message: '⚠️ ข้อมูลไม่สมบูรณ์ ควรเพิ่มข้อมูลที่จำเป็น'
    });
  }
}

module.exports = router;
