const express = require('express');
const router = express.Router();
const Receipt = require('../models/Receipt');
const TaxInvoice = require('../models/TaxInvoice');
const authJWT = require('../middlewares/authJWT');

// GET /api/combined-receipts
router.get('/', authJWT, async (req, res) => {
  try {
  const { branchCode, startDate, endDate, customerName, limit = 100, page = 1 } = req.query;
  // แยก query สำหรับ Receipt และ TaxInvoice เพื่อให้กรอง "ขายสดเท่านั้น"
  const baseDateFilter = {};
  if (startDate) baseDateFilter.$gte = new Date(startDate);
  if (endDate) {
    const d = new Date(endDate); d.setHours(23,59,59,999);
    baseDateFilter.$lte = d;
  }

  const receiptQuery = {};
  const taxQuery = {};

  if (branchCode) { receiptQuery.branchCode = branchCode; taxQuery.branchCode = branchCode; }
  if (startDate || endDate) { receiptQuery.issueDate = baseDateFilter; taxQuery.issueDate = baseDateFilter; }
  if (customerName) {
    const regex = new RegExp(customerName, 'i');
    const nameOr = [
      { 'customer.name': regex },
      { 'customer.fullName': regex },
      { 'customer.first_name': regex },
      { 'customer.last_name': regex }
    ];
    receiptQuery.$or = nameOr;
    taxQuery.$or = nameOr;
  }

  // ✅ เงื่อนไข ขายสดเท่านั้น (ไม่เอาขายผ่อน/ดาวน์/มัดจำ)
  // Receipt: กรองเฉพาะขายสดโดย paymentMethod เป็น cash และไม่ใช่ประเภทต่าง ๆ ที่ไม่ใช่ขายสด
  receiptQuery.paymentMethod = 'cash';
  receiptQuery.receiptType = {
    $nin: [
      'down_payment_receipt',    // ใบเสร็จเงินดาวน์
      'installment_receipt',     // ใบเสร็จผ่อนชำระ
      'deposit_receipt',         // ใบเสร็จเงินมัดจำ
      'partial_payment_receipt', // ใบเสร็จชำระส่วน
      'booking_receipt'          // ใบเสร็จจอง
    ]
  };
  receiptQuery.$and = [
    { $or: [ { downPaymentAmount: { $exists: false } }, { downPaymentAmount: { $lte: 0 } } ] },
    { $or: [ { contractNo: { $exists: false } }, { contractNo: null }, { contractNo: '' } ] }, // ไม่มีสัญญา
    { $or: [ { quotationNumber: { $exists: false } }, { quotationNumber: null }, { quotationNumber: '' } ] } // ไม่มีใบเสนอราคา
  ];

  // TaxInvoice: กรองเฉพาะขายสดโดย paymentMethod เป็น cash และไม่ใช่ประเภทต่าง ๆ ที่ไม่ใช่ขายสด
  taxQuery.paymentMethod = 'cash';
  taxQuery.receiptType = {
    $nin: [
      'down_payment_tax_invoice',  // ใบกำกับภาษีเงินดาวน์
      'installment_tax_invoice',   // ใบกำกับภาษีผ่อนชำระ
      'deposit_tax_invoice',       // ใบกำกับภาษีเงินมัดจำ
      'partial_payment_tax_invoice', // ใบกำกับภาษีชำระส่วน
      'booking_tax_invoice'        // ใบกำกับภาษีจอง
    ]
  };
  taxQuery.$and = [
    { $or: [ { downPaymentAmount: { $exists: false } }, { downPaymentAmount: { $lte: 0 } } ] },
    { $or: [ { contractNo: { $exists: false } }, { contractNo: null }, { contractNo: '' } ] }, // ไม่มีสัญญา
    { $or: [ { quotationNumber: { $exists: false } }, { quotationNumber: null }, { quotationNumber: '' } ] } // ไม่มีใบเสนอราคา
  ];


    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [receipts, receiptCount] = await Promise.all([
      Receipt.find(receiptQuery).sort({ issueDate: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Receipt.countDocuments(receiptQuery)
    ]);

    const [taxInvoices, taxCount] = await Promise.all([
      TaxInvoice.find(taxQuery).sort({ issueDate: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      TaxInvoice.countDocuments(taxQuery)
    ]);

    // ฟังก์ชันช่วยกรองรายการ "ค่าดาวน์" ออกจาก list view
    const removeDownPaymentItems = (items = []) => {
      return (items || []).filter(i => {
        const name = (i?.name || i?.description || '').toString();
        const desc = (i?.description || '').toString();
        return !(/ค่าดาวน์|ดาวน์|down[_-]?payment/i.test(name) || /ค่าดาวน์|ดาวน์|down[_-]?payment/i.test(desc) || i?.isDownPayment === true);
      });
    };

    const data = [
      ...receipts.map(r => ({
        _id: r._id,
        documentType: 'RECEIPT',
        documentNumber: r.receiptNumber,
        invoiceNo: r.receiptNumber,
        issueDate: r.issueDate,
        customerName: r.customer?.name || r.customer?.fullName || 'ลูกค้าทั่วไป',
        customerType: r.customer?.taxId || r.customer?.tax_id ? 'corporate' : 'individual',
        totalAmount: r.totalAmount || r.netTotal || r.summary?.totalWithTax || 0,
        employeeName: r.employeeName || r.staffName || 'พนักงาน',
        branchCode: r.branchCode,
        items: removeDownPaymentItems(r.items),
        customer: r.customer,
        company: r.company,
        paymentMethod: r.paymentMethod,
        documentFee: 0, // หน้านี้แสดงขายสดเท่านั้น ไม่แสดงค่าธรรมเนียม
        vatAmount: r.vatAmount || r.summary?.vatAmount || 0,
        hasVatItems: r.hasVatItems || false,
        originalData: r
      })),
      ...taxInvoices.map(t => ({
        _id: t._id,
        documentType: 'TAX_INVOICE',
        documentNumber: t.taxInvoiceNumber,
        invoiceNo: t.taxInvoiceNumber,
        issueDate: t.issueDate,
        customerName: t.customer?.name || t.customer?.fullName || 'ลูกค้าทั่วไป',
        customerType: t.customer?.taxId || t.customer?.tax_id ? 'corporate' : 'individual',
        totalAmount: t.summary?.totalWithTax || t.summary?.netTotal || 0,
        employeeName: t.employeeName || t.staffName || 'พนักงาน',
        branchCode: t.branchCode,
        items: removeDownPaymentItems(t.items),
        customer: t.customer,
        company: t.company,
        paymentMethod: t.paymentMethod,
        documentFee: 0, // หน้านี้แสดงขายสดเท่านั้น ไม่แสดงค่าธรรมเนียม
        vatAmount: t.summary?.vatAmount || 0,
        hasVatItems: true,
        originalData: t
      }))
    ].sort((a,b) => new Date(b.issueDate) - new Date(a.issueDate));

    res.json({
      success: true,
      data,
      summary: { receipts: receiptCount, taxInvoices: taxCount, total: receiptCount + taxCount }
    });
  } catch (err) {
    console.error('Error in combined-receipts:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

