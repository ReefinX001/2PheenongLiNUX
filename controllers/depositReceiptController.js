const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const DepositReceipt = require('../models/DepositReceipt');
const BranchStock = require('../models/POS/BranchStock');

// Helper functions
function ensureNumberData(value, fallback = 0) {
  return (typeof value === 'number' && !isNaN(value)) ? value : fallback;
}

function formatThaiDate(dateString) {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const day = date.getDate();
  const month = thaiMonths[date.getMonth()];
  const year = date.getFullYear() + 543;

  return `${day} ${month} ${year}`;
}

function toThaiBahtText(amount) {
  if (!amount || amount === 0) return 'ศูนย์บาทถ้วน';

  const units = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
  const numbers = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];

  function convertGroup(num) {
    let result = '';
    const digits = num.toString().split('').reverse();

    for (let i = 0; i < digits.length; i++) {
      const digit = parseInt(digits[i]);
      if (digit === 0) continue;

      if (i === 1 && digit === 2) {
        result = 'ยี่สิบ' + result;
      } else if (i === 1 && digit === 1) {
        result = 'สิบ' + result;
      } else if (i === 0 && digit === 1 && digits[1] && parseInt(digits[1]) > 0) {
        result = 'เอ็ด' + result;
      } else {
        result = numbers[digit] + units[i] + result;
      }
    }

    return result;
  }

  const [baht, satang] = amount.toFixed(2).split('.');
  let result = convertGroup(parseInt(baht)) + 'บาท';

  if (parseInt(satang) > 0) {
    result += convertGroup(parseInt(satang)) + 'สตางค์';
  } else {
    result += 'ถ้วน';
  }

  return result;
}

class DepositReceiptController {

  static async generateDocumentNumber(prefix = 'DR') {
    try {
      const today = new Date();
      // ใช้ปี พ.ศ. (เพิ่ม 543)
      const year = (today.getFullYear() + 543).toString().slice(-2); // เอาแค่ 2 หลัก เช่น 68
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const day = today.getDate().toString().padStart(2, '0');

      // รูปแบบใหม่: DR-680818-001
      const datePrefix = `${prefix}-${year}${month}${day}-`;

      // Find the last document number for today
      const lastDoc = await DepositReceipt.findOne({
        documentNumber: { $regex: `^${prefix}-${year}${month}${day}-` }
      }).sort({ documentNumber: -1 });

      let sequence = 1;
      if (lastDoc) {
        // ดึงเลขลำดับจากส่วนท้าย เช่น DR-680818-001 -> 001
        const parts = lastDoc.documentNumber.split('-');
        if (parts.length === 3) {
          const lastSequence = parseInt(parts[2]);
          if (!isNaN(lastSequence)) {
            sequence = lastSequence + 1;
          }
        }
      }

      return `${datePrefix}${sequence.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating document number:', error);
      const timestamp = Date.now().toString().slice(-6);
      return `${prefix}${timestamp}`;
    }
  }

  // API methods
  static async createDepositReceipt(req, res) {
    try {
      const depositReceiptData = req.body;

      // Generate document number if not provided
      if (!depositReceiptData.documentNumber) {
        depositReceiptData.documentNumber = await DepositReceiptController.generateDocumentNumber();
      }

      // Validate and get product info if product ID is provided
      if (depositReceiptData.product?.id) {
        const product = await BranchStock.findById(depositReceiptData.product.id);
        if (!product) {
          return res.status(404).json({
            success: false,
            error: 'ไม่พบสินค้าที่ระบุ'
          });
        }

        // Check if product is already locked for another deposit
        const existingDeposit = await DepositReceipt.findOne({
          'product.id': product._id,
          status: { $in: ['pending', 'confirmed', 'stock_available'] }
        });

        if (existingDeposit) {
          return res.status(400).json({
            success: false,
            error: 'สินค้านี้ถูกจองแล้ว'
          });
        }

        // Update product info with actual data
        depositReceiptData.product = {
          ...depositReceiptData.product,
          name: product.name,
          brand: product.brand,
          model: product.model,
          imei: product.imei,
          price: product.price,
          cost: product.cost,
          image: product.image
        };
      }

      const depositReceipt = new DepositReceipt(depositReceiptData);

      // Create accounting entries
      depositReceipt.createAccountingEntries();

      await depositReceipt.save();

      // If online deposit and stock available, mark stock as locked
      if (depositReceipt.depositType === 'online' && depositReceipt.product.id) {
        await BranchStock.findByIdAndUpdate(depositReceipt.product.id, {
          pending: true,
          verified: false // Temporarily unverify to prevent sales
        });
      }

      res.status(201).json({
        success: true,
        data: depositReceipt,
        message: 'สร้างใบรับเงินมัดจำสำเร็จ'
      });
    } catch (error) {
      console.error('Error creating deposit receipt:', error);
      res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการสร้างใบรับเงินมัดจำ',
        message: error.message
      });
    }
  }

  static async getDepositReceipts(req, res) {
    try {
      const { branchCode, status, depositType, saleType, page = 1, limit = 10 } = req.query;

      const filter = {};
      if (branchCode) filter.branchCode = branchCode;
      if (status) filter.status = status;
      if (depositType) filter.depositType = depositType;
      if (saleType) filter.saleType = saleType;

      const depositReceipts = await DepositReceipt.find(filter)
        .populate('product.id')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await DepositReceipt.countDocuments(filter);

      res.json({
        success: true,
        data: depositReceipts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error getting deposit receipts:', error);
      res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการโหลดใบรับเงินมัดจำ',
        message: error.message
      });
    }
  }

  static async getDepositReceiptById(req, res) {
    try {
      const { id } = req.params;

      const depositReceipt = await DepositReceipt.findById(id)
        .populate('product.id')
        .populate('integration.orderId')
        .populate('integration.installmentId');

      if (!depositReceipt) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบใบรับเงินมัดจำที่ระบุ'
        });
      }

      res.json({
        success: true,
        data: depositReceipt
      });
    } catch (error) {
      console.error('Error getting deposit receipt:', error);
      res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการโหลดใบรับเงินมัดจำ',
        message: error.message
      });
    }
  }

  static async proceedToCashSale(req, res) {
    try {
      const { id } = req.params;

      const depositReceipt = await DepositReceipt.findById(id);
      if (!depositReceipt) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบใบรับเงินมัดจำที่ระบุ'
        });
      }

      if (!depositReceipt.canProceedToCash()) {
        return res.status(400).json({
          success: false,
          error: 'ไม่สามารถดำเนินการขายสดได้ในสถานะปัจจุบัน'
        });
      }

      depositReceipt.progress.proceedToCash = true;
      await depositReceipt.save();

      // Return data for frontstore_pattani.html
      const cashSaleData = {
        depositReceiptId: depositReceipt._id,
        customer: depositReceipt.customer,
        product: depositReceipt.product,
        depositAmount: depositReceipt.amounts.depositAmount,
        remainingAmount: depositReceipt.amounts.remainingAmount,
        totalAmount: depositReceipt.amounts.totalAmount
      };

      res.json({
        success: true,
        data: cashSaleData,
        redirectUrl: `/views/pattani/frontstore_pattani.html?depositReceiptId=${depositReceipt._id}`,
        message: 'เตรียมข้อมูลสำหรับขายสดเรียบร้อย'
      });
    } catch (error) {
      console.error('Error proceeding to cash sale:', error);
      res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการดำเนินการขายสด',
        message: error.message
      });
    }
  }

  static async proceedToInstallment(req, res) {
    try {
      const { id } = req.params;

      const depositReceipt = await DepositReceipt.findById(id);
      if (!depositReceipt) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบใบรับเงินมัดจำที่ระบุ'
        });
      }

      if (!depositReceipt.canProceedToInstallment()) {
        return res.status(400).json({
          success: false,
          error: 'ไม่สามารถดำเนินการขายผ่อนได้ในสถานะปัจจุบัน'
        });
      }

      depositReceipt.progress.proceedToInstallment = true;
      await depositReceipt.save();

      // Return data for step2.html
      const installmentData = {
        depositReceiptId: depositReceipt._id,
        customer: depositReceipt.customer,
        product: depositReceipt.product,
        installmentInfo: depositReceipt.installmentInfo,
        depositAmount: depositReceipt.amounts.depositAmount,
        remainingAmount: depositReceipt.amounts.remainingAmount,
        totalAmount: depositReceipt.amounts.totalAmount
      };

      res.json({
        success: true,
        data: installmentData,
        redirectUrl: `/views/pattani/installment/step2/step2.html?depositReceiptId=${depositReceipt._id}`,
        message: 'เตรียมข้อมูลสำหรับขายผ่อนเรียบร้อย'
      });
    } catch (error) {
      console.error('Error proceeding to installment:', error);
      res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการดำเนินการขายผ่อน',
        message: error.message
      });
    }
  }

  static async updateDepositReceipt(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const depositReceipt = await DepositReceipt.findById(id);
      if (!depositReceipt) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบใบรับเงินมัดจำที่ระบุ'
        });
      }

      // Update fields
      Object.assign(depositReceipt, updateData);
      depositReceipt.updatedBy = updateData.updatedBy || depositReceipt.updatedBy;

      await depositReceipt.save();

      res.json({
        success: true,
        data: depositReceipt,
        message: 'อัปเดตใบรับเงินมัดจำสำเร็จ'
      });
    } catch (error) {
      console.error('Error updating deposit receipt:', error);
      res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการอัปเดตใบรับเงินมัดจำ',
        message: error.message
      });
    }
  }

  static async markStockAvailable(req, res) {
    try {
      const { id } = req.params;

      const depositReceipt = await DepositReceipt.findById(id);
      if (!depositReceipt) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบใบรับเงินมัดจำที่ระบุ'
        });
      }

      await depositReceipt.markStockAvailable();

      res.json({
        success: true,
        data: depositReceipt,
        message: 'อัปเดตสถานะสินค้าพร้อมสำเร็จ'
      });
    } catch (error) {
      console.error('Error marking stock available:', error);
      res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการอัปเดตสถานะสินค้า',
        message: error.message
      });
    }
  }

  static async printDepositReceipt(req, res) {
    try {
      const { id } = req.params;

      const depositReceipt = await DepositReceipt.findById(id);
      if (!depositReceipt) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบใบรับเงินมัดจำที่ระบุ'
        });
      }

      const pdfBuffer = await DepositReceiptController.createDepositReceiptPdf(depositReceipt);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="DepositReceipt_${depositReceipt.documentNumber}.pdf"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error('Error printing deposit receipt:', error);
      res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการพิมพ์ใบรับเงินมัดจำ',
        message: error.message
      });
    }
  }

  static async generateDocuments(req, res) {
    try {
      const { id } = req.params;
      const { documentType } = req.body; // 'receipt', 'tax_invoice', or 'both'

      const depositReceipt = await DepositReceipt.findById(id);
      if (!depositReceipt) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบใบรับเงินมัดจำที่ระบุ'
        });
      }

      const results = {};

      if (documentType === 'receipt' || documentType === 'both') {
        // Create receipt
        const receiptPdf = await DepositReceiptController.createDepositReceiptPdf(depositReceipt);
        results.receipt = receiptPdf;

        depositReceipt.documents.receiptGenerated = true;
      }

      if (documentType === 'tax_invoice' || documentType === 'both') {
        // Create tax invoice
        const taxInvoicePdf = await DepositReceiptController.createDepositReceiptPdf(depositReceipt);
        results.taxInvoice = taxInvoicePdf;

        depositReceipt.documents.taxInvoiceGenerated = true;
      }

      depositReceipt.documents.documentChoice = documentType;
      await depositReceipt.save();

      res.json({
        success: true,
        data: results,
        message: 'สร้างเอกสารสำเร็จ'
      });
    } catch (error) {
      console.error('Error generating documents:', error);
      res.status(500).json({
        success: false,
        error: 'เกิดข้อผิดพลาดในการสร้างเอกสาร',
        message: error.message
      });
    }
  }
}

module.exports = DepositReceiptController;