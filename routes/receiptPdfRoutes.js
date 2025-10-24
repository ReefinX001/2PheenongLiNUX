/**
 * @file receiptPdfRoutes.js
 * @description Routes for generating PDF from Receipt database records
 * @version 1.0.0
 * @date 2025-01-31
 */

const express = require('express');
const router = express.Router();
const Receipt = require('../models/Receipt');
const A4PDFController = require('../controllers/pdf/A4PDFController');
const PDFoooRasterController = require('../controllers/pdf/PDFoooRasterController');

/**
 * GET /api/receipt/:id/pdf
 * Generate PDF from Receipt database record
 */
router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📄 Generating PDF from Receipt database record: ${id}`);

    // Retrieve receipt from database
    const receipt = await Receipt.findById(id);
    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลใบเสร็จในฐานข้อมูล'
      });
    }

    console.log('✅ Receipt found in database:', {
      id: receipt._id,
      documentNumber: receipt.documentNumber,
      receiptNumber: receipt.receiptNumber,
      customerName: receipt.customer?.name,
      totalAmount: receipt.totalAmount
    });

    // Transform database record to PDF format
    const pdfData = transformReceiptToPdfFormat(receipt);

    // Generate PDF using A4PDFController
    const pdfResult = await A4PDFController.createReceiptPdf(pdfData);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfResult.fileName}"`);
    res.setHeader('Content-Length', pdfResult.buffer.length);

    // Send PDF buffer
    res.send(pdfResult.buffer);

    console.log('✅ PDF generated successfully from database record');

  } catch (error) {
    console.error('❌ Error generating PDF from Receipt database:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการสร้าง PDF จากฐานข้อมูล',
      details: error.message
    });
  }
});

/**
 * GET /api/receipt/number/:receiptNumber/pdf
 * Generate PDF from Receipt database record by receipt number
 */
router.get('/number/:receiptNumber/pdf', async (req, res) => {
  try {
    const { receiptNumber } = req.params;
    console.log(`📄 Generating PDF from Receipt by number: ${receiptNumber}`);

    // Retrieve receipt from database by receipt number
    const receipt = await Receipt.findOne({
      $or: [
        { receiptNumber: receiptNumber },
        { documentNumber: receiptNumber }
      ]
    });

    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: `ไม่พบใบเสร็จเลขที่ ${receiptNumber} ในฐานข้อมูล`
      });
    }

    console.log('✅ Receipt found by number:', {
      id: receipt._id,
      documentNumber: receipt.documentNumber,
      receiptNumber: receipt.receiptNumber,
      customerName: receipt.customer?.name
    });

    // Transform database record to PDF format
    const pdfData = transformReceiptToPdfFormat(receipt);

    // Generate PDF using A4PDFController
    const pdfResult = await A4PDFController.createReceiptPdf(pdfData);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfResult.fileName}"`);
    res.setHeader('Content-Length', pdfResult.buffer.length);

    // Send PDF buffer
    res.send(pdfResult.buffer);

    console.log('✅ PDF generated successfully from database record by number');

  } catch (error) {
    console.error('❌ Error generating PDF from Receipt database by number:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการสร้าง PDF จากฐานข้อมูล',
      details: error.message
    });
  }
});

/**
 * GET /api/receipt/:id/pdf/80mm
 * Generate 80mm thermal receipt from database record
 */
router.get('/:id/pdf/80mm', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🖨️ Generating 80mm receipt PDF from database: ${id}`);

    // Retrieve receipt from database
    const receipt = await Receipt.findById(id);
    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลใบเสร็จในฐานข้อมูล'
      });
    }

    // Transform database record to PDF format
    const pdfData = transformReceiptToPdfFormat(receipt);

    // Generate 80mm thermal receipt using PDFoooRasterController
    const pdfResult = await PDFoooRasterController.printReceipt(pdfData);

    // Return JSON response with base64 image
    res.json({
      success: true,
      data: {
        base64: pdfResult.base64,
        fileName: pdfResult.fileName || `receipt-80mm-${receipt.documentNumber}.png`,
        format: 'image/png'
      },
      message: 'สร้างใบเสร็จ 80mm สำเร็จจากฐานข้อมูล'
    });

    console.log('✅ 80mm receipt PDF generated successfully from database');

  } catch (error) {
    console.error('❌ Error generating 80mm receipt from database:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการสร้างใบเสร็จ 80mm',
      details: error.message
    });
  }
});

/**
 * Transform Receipt database record to PDF format
 */
function transformReceiptToPdfFormat(receipt) {
  console.log('🔄 Transforming Receipt database record to PDF format...');

  // Format customer data
  const customer = {
    name: receipt.customer?.name || 'ลูกค้า',
    firstName: receipt.customer?.firstName || '',
    lastName: receipt.customer?.lastName || '',
    phone: receipt.customer?.phone || receipt.customer?.phoneNumber || '',
    email: receipt.customer?.email || '',
    address: receipt.customer?.address || 'ไม่มีข้อมูล',
    taxId: receipt.customer?.taxId || receipt.customer?.idCard || '',
    // Handle nested address structure
    fullAddress: formatCustomerAddress(receipt.customer)
  };

  // Format items data
  const items = (receipt.items || []).map(item => ({
    name: item.name || item.productName || 'สินค้า',
    description: item.description || '',
    quantity: item.quantity || 1,
    price: item.price || item.unitPrice || 0,
    total: item.total || item.totalPrice || (item.price * item.quantity) || 0,
    unit: item.unit || 'ชิ้น'
  }));

  // Format summary data
  const summary = {
    subtotal: receipt.summary?.subtotal || receipt.subtotal || 0,
    discount: receipt.summary?.discount || receipt.discount || 0,
    beforeTax: receipt.summary?.beforeTax || receipt.beforeTax || 0,
    tax: receipt.summary?.tax || receipt.vatAmount || receipt.vatTotal || 0,
    netTotal: receipt.summary?.netTotal || receipt.totalAmount || receipt.grandTotal || 0,
    total: receipt.totalAmount || receipt.grandTotal || 0
  };

  // Format payment data
  const payment = {
    method: receipt.paymentMethod || 'cash',
    amount: receipt.paymentAmount || receipt.totalAmount || 0,
    received: receipt.receivedAmount || receipt.totalAmount || 0,
    change: receipt.changeAmount || 0
  };

  // Format company and branch data
  const company = receipt.company || {
    name: 'บริษัท 2 พี่น้อง โมบาย จำกัด',
    taxId: '0945566000616',
    address: 'ไม่มีข้อมูล'
  };

  const branch = receipt.branch || {
    name: 'สำนักงานใหญ่',
    code: '00000',
    address: 'ไม่มีข้อมูล'
  };

  // Create PDF data structure
  const pdfData = {
    // Document identification
    receiptNumber: receipt.receiptNumber || receipt.documentNumber || `RE-${Date.now()}`,
    documentNumber: receipt.documentNumber || receipt.receiptNumber,

    // Customer information
    customer: customer,

    // Items
    items: items,

    // Financial summary
    summary: summary,

    // Payment information
    payment: payment,

    // Company and branch
    company: company,
    branch: branch,

    // Dates
    issueDate: receipt.issueDate || receipt.createdAt || new Date(),
    saleDate: receipt.saleDate || receipt.issueDate || receipt.createdAt || new Date(),

    // Document type
    documentType: receipt.documentType || 'receipt',
    taxType: receipt.taxType || 'no-tax',

    // Signatures (if available)
    customerSignature: receipt.customerSignature || receipt.signatures?.customer || '',
    employeeSignature: receipt.employeeSignature || receipt.signatures?.salesperson || '',
    authorizedSignature: receipt.authorizedSignature || receipt.signatures?.authorized || '',
    signatures: receipt.signatures || {},

    // Additional metadata
    contractNumber: receipt.contractNumber || '',
    installmentData: receipt.installmentData || null
  };

  console.log('✅ Receipt database record transformed to PDF format:', {
    receiptNumber: pdfData.receiptNumber,
    customerName: pdfData.customer.name,
    itemsCount: pdfData.items.length,
    totalAmount: pdfData.summary.netTotal
  });

  return pdfData;
}

/**
 * Format customer address from database record
 */
function formatCustomerAddress(customer) {
  if (!customer) return 'ไม่มีข้อมูล';

  if (customer.address && typeof customer.address === 'string') {
    return customer.address;
  }

  if (customer.address && typeof customer.address === 'object') {
    const addr = customer.address;
    const parts = [
      addr.houseNo,
      addr.moo ? `หมู่ ${addr.moo}` : '',
      addr.soi ? `ซอย ${addr.soi}` : '',
      addr.road ? `ถนน ${addr.road}` : '',
      addr.subDistrict ? `ตำบล ${addr.subDistrict}` : '',
      addr.district ? `อำเภอ ${addr.district}` : '',
      addr.province ? `จังหวัด ${addr.province}` : '',
      addr.postalCode || ''
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(' ') : 'ไม่มีข้อมูล';
  }

  return 'ไม่มีข้อมูล';
}

module.exports = router;
