const ReceiptVoucher = require('../../models/POS/ReceiptVoucher');
const ReceiptVoucherDetail = require('../../models/POS/ReceiptVoucherDetail');
const JournalEntry = require('../../models/POS/JournalEntry');
const BranchStockHistory = require('../../models/POS/BranchStockHistory');
const ChartOfAccount = require('../../models/Account/ChartOfAccount'); // Added
const ReceiptVoucherPdfController = require('./ReceiptVoucherPdfController');
const Branch = require('../../models/Account/Branch'); // ปรับ path ตามโครงสร้างจริง
const User = require('../../models/User/User');
const mongoose = require('mongoose');
// ReceiptVoucherAutoCreate is removed.

function formatThaiDate(dateString) {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    const day = date.getDate();
    const month = date.toLocaleDateString('th-TH', {month: 'long'});
    const thaiYear = date.getFullYear() + 543;

    return `${day} ${month} ${thaiYear}`;
  } catch (e) {
    return '-';
  }
}

class ReceiptVoucherController {
  /**
   * ตรวจจับประเภทการรับเงินอัตโนมัติ (เพิ่มใหม่)
   * ใช้ร่วมกับ Controller เดิมของคุณ
   */
  detectReceiptType(stockHistory) {
    // 1. ใช้ transactionType จาก BranchStockHistory Model ใหม่
    if (stockHistory.transactionType) {
      const typeMap = {
        'sale': 'cash_sale', // Standard sale
        'credit_sale': 'credit_sale',
        'debt_payment': 'debt_payment',
        'deposit': 'deposit',
        'return': 'return'
        // Add other specific transactionTypes from BranchStockHistory if they map to receipt types
      };
      if (typeMap[stockHistory.transactionType]) {
        return typeMap[stockHistory.transactionType];
      }
    }

    // 2. วิเคราะห์จากข้อมูลที่มีอยู่

    // รับคืนสินค้า
    if (stockHistory.change_type === 'IN' &&
        (stockHistory.reason?.toLowerCase().includes('คืน') ||
         stockHistory.reason?.toLowerCase().includes('return'))) {
      return 'return';
    }

    // ถ้ามี originalInvoice = รับคืน
    if (stockHistory.paymentInfo?.originalInvoice) {
      return 'return';
    }

    // รับชำระหนี้ - ตรวจสอบจากการมี debtInvoices
    if (stockHistory.paymentInfo?.debtInvoices?.length > 0) {
      return 'debt_payment';
    }

    // รับชำระหนี้ - ตรวจสอบจาก reason
    if (stockHistory.reason?.toLowerCase().includes('ชำระหนี้') ||
        stockHistory.reason?.toLowerCase().includes('รับชำระ') ||
        stockHistory.reason?.toLowerCase().includes('payment')) {
      return 'debt_payment';
    }

    // รับเงินมัดจำ
    if (stockHistory.reason?.toLowerCase().includes('มัดจำ') ||
        stockHistory.reason?.toLowerCase().includes('deposit') ||
        stockHistory.reason?.toLowerCase().includes('ดาวน์')) {
      return 'deposit';
    }

    // ขายเชื่อ - ไม่ได้รับเงิน (ensure it's an OUT transaction)
    if (stockHistory.change_type === 'OUT' &&
        (stockHistory.paymentInfo?.received === false ||
        stockHistory.paymentInfo?.method === 'none' ||
        (stockHistory.net_amount > 0 && !stockHistory.paymentInfo?.method))) {
      return 'credit_sale';
    }

    // ขายเชื่อ - จาก reason (ensure it's an OUT transaction)
    if (stockHistory.change_type === 'OUT' &&
        (stockHistory.reason?.toLowerCase().includes('เชื่อ') ||
        stockHistory.reason?.toLowerCase().includes('credit'))) {
      return 'credit_sale';
    }

    // Default mapping จาก reason เดิม for 'OUT' transactions
    if (stockHistory.change_type === 'OUT') {
        const reasonTypeMap = {
          'ขาย POS': 'cash_sale',
          'ขายแบบผ่อน': 'installment',
          'บริการ': 'service'
          // Add other reasons that map to specific types for 'OUT'
        };
        if (reasonTypeMap[stockHistory.reason]) {
            return reasonTypeMap[stockHistory.reason];
        }
        return 'cash_sale'; // Default for 'OUT' if no other rule matches
    }

    // Fallback if no specific type is detected (e.g. an 'IN' transaction not classified as 'return')
    // Or, you might want to throw an error or return null if a type cannot be determined.
    return 'cash_sale'; // Or a more generic type / null
  }

  // สร้างใบสำคัญรับเงินจาก BranchStockHistory
  async create(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { branchStockHistoryId, manualType, paymentMethod: manualPaymentMethod, bankAccount: manualBankAccount, force } = req.body;
      const io = req.app.get('io');

      if (!branchStockHistoryId) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'ต้องระบุ branchStockHistoryId เพื่อสร้างใบสำคัญรับเงิน'
        });
      }

const stockHistory = await BranchStockHistory.findById(branchStockHistoryId)
  .populate('performed_by', 'name email')
  .session(session);

      if (!stockHistory) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูล BranchStockHistory'
        });
      }

      // Auto-detect receipt type หรือใช้ manual override
      const detectedType = manualType || this.detectReceiptType(stockHistory);

      // ตรวจสอบประเภท transaction based on detectedType
      if (detectedType !== 'return' && stockHistory.change_type !== 'OUT') {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `สร้างใบสำคัญรับเงินได้เฉพาะรายการ OUT หรือ IN (สำหรับประเภท 'return' เท่านั้น). ประเภทที่ตรวจพบ: ${detectedType}, change_type: ${stockHistory.change_type}`
        });
      }
      if (detectedType === 'return' && stockHistory.change_type !== 'IN') {
        // If it's detected as a return, but the stock movement isn't IN, it's problematic.
        // However, detectReceiptType already considers change_type === 'IN' for returns.
        // This check is more of a safeguard if detectReceiptType logic changes.
      }

      if (stockHistory.hasReceiptVoucher && !force) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'มีใบสำคัญรับเงินแล้ว หากต้องการสร้างใหม่ให้ใช้ force: true'
        });
      }

      // หา branch object
      const branch = await Branch.findOne({
  $or: [
    { code: stockHistory.branch_code },
    { branch_code: stockHistory.branch_code }
  ]
}).session(session);
      if (!branch) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `ไม่พบ branch_code: ${stockHistory.branch_code}`
        });
      }

      // สร้างเลขที่เอกสารตามประเภท
      const documentNumber = await this.generateDocumentNumberByType(detectedType, branch._id, session);

      // กำหนดบัญชีเดบิต/เครดิตตามประเภท
      const paymentMethod = manualPaymentMethod || stockHistory.paymentInfo?.method || 'cash';

      let debitAccount, creditAccount;

      if (detectedType === 'return') {
        // รับคืน: Dr.รับคืนสินค้า (44103) Cr.เงินสด(11101)/ธนาคาร(11103)
        debitAccount = await ChartOfAccount.findOne({ code: '44103' }).lean().session(session); //  บัญชีรับคืนสินค้า
        creditAccount = paymentMethod.toLowerCase() === 'cash'
          ? await ChartOfAccount.findOne({ code: '11101' }).lean().session(session) // เงินสด
          : await ChartOfAccount.findOne({ code: '11103' }).lean().session(session); // เงินฝากธนาคาร
      } else {
        debitAccount = await this.getDebitAccount(paymentMethod, detectedType, session);
        creditAccount = await this.getCreditAccount(detectedType, stockHistory.reason, paymentMethod, session);
      }

      if (!debitAccount || !creditAccount) {
        await session.abortTransaction();
        session.endSession();
        const missingAccountInfo = !debitAccount ? `debit account (code for ${paymentMethod}/${detectedType})` : `credit account (code for ${detectedType}/${stockHistory.reason})`;
        return res.status(400).json({
          success: false,
          message: `ไม่พบข้อมูลผังบัญชีที่จำเป็น: ${missingAccountInfo}`
        });
      }

      const customerName = this.getCustomerName(stockHistory);

      // คำนวณยอดเงินตามประเภท
      let totalAmount = stockHistory.net_amount != null ? stockHistory.net_amount : (stockHistory.total_amount || 0);
      if (detectedType === 'return') {
        totalAmount = Math.abs(totalAmount); // ใช้ค่าบวกสำหรับรับคืน
      }

      let branchObjectId = null;
if (stockHistory.branch_code) {
  // ตรวจสอบว่าเป็น ObjectId format หรือไม่
  if (mongoose.Types.ObjectId.isValid(stockHistory.branch_code)) {
    // ถ้าเป็น ObjectId อยู่แล้ว
    branchObjectId = new mongoose.Types.ObjectId(stockHistory.branch_code);
  } else {
    // ถ้าเป็น String ให้หาจาก database
    const branch = await Branch.findOne({
  code: stockHistory.branch_code  // หรือ branchCode ตาม schema จริง
}).session(session);

    if (branch) {
      branchObjectId = branch._id;
    } else {
      // อาจจะ log warning แต่ไม่ throw error เพื่อให้กระบวนการทำงานต่อไปได้
    }
  }
}

// สร้าง receiptVoucherData
const receiptVoucherData = {
  documentNumber,
  receiptVoucherNumber: documentNumber,
  paymentDate: stockHistory.performed_at || new Date(),
  branch: branch._id, // ใช้ ObjectId ของ branch เท่านั้น!
  // ถ้าต้องการเก็บ branch_code หรือ branch_name เพื่อ UI ให้ใช้ field อื่น
  // branchCode_text: stockHistory.branch_code,
  // branchName_text: branch.branch_name,
  debitAccount: {
    code: debitAccount.code,
    name: debitAccount.name
  },
  creditAccount: {
    code: creditAccount.code,
    name: creditAccount.name
  },
  receivedFrom: customerName,
  receiptType: detectedType,
  paymentMethod: paymentMethod,
  bankAccount: manualBankAccount || stockHistory.paymentInfo?.bankAccount || (paymentMethod !== 'cash' ? 'Default Bank Account' : undefined),
  totalAmount: totalAmount,
  notes: this.generateNotesByType(detectedType, stockHistory),
  status: 'completed',
  reference: {
    invoiceNumber: stockHistory.invoice_no,
    originalInvoice: stockHistory.paymentInfo?.originalInvoice,
    debtInvoices: stockHistory.paymentInfo?.debtInvoices || [],
    installmentContract: stockHistory.contract_no,
    branchStockHistoryId: stockHistory._id
  },
  createdBy: req.user?._id || stockHistory.performed_by?._id,
  customerType: stockHistory.customerType || 'individual',
  customerInfo: stockHistory.customerInfo,
  items: this.prepareItemsForReceipt(stockHistory.items),
  transactionType: stockHistory.transactionType,
  autoDetected: !manualType
};

      if (stockHistory.customerType === 'corporate' && stockHistory.corporateInfo) {
        receiptVoucherData.customerInfo = stockHistory.corporateInfo;
      }

      const receiptVoucher = new ReceiptVoucher(receiptVoucherData);
      const savedReceipt = await receiptVoucher.save({ session });

      // สร้างรายละเอียดใบสำคัญรับเงิน
      const details = await this.createReceiptDetails(savedReceipt, stockHistory, session);

      // สร้างรายการบัญชี (ปรับปรุงให้รองรับทุกประเภท)
      const journalEntries = await this.createJournalEntriesByType(
        savedReceipt,
        stockHistory,
        debitAccount,
        creditAccount,
        detectedType,
        session
      );

      // อัปเดต ReceiptVoucher
      savedReceipt.details = details.map(d => d._id);
      savedReceipt.journalEntries = journalEntries.map(j => j._id);
      await savedReceipt.save({ session });

      // อัปเดต BranchStockHistory
      stockHistory.receiptVoucherId = savedReceipt._id;
      stockHistory.hasReceiptVoucher = true;
      stockHistory.receiptVoucherCreatedAt = new Date(); // Add creation timestamp
      await stockHistory.save({ session });

      // อัปเดตยอดหนี้ถ้าเป็นการรับชำระหนี้
      if (detectedType === 'debt_payment' && totalAmount > 0) {
        await this.updateDebtBalance(stockHistory, totalAmount, session);
      }

      await session.commitTransaction();

      const populatedReceipt = await ReceiptVoucher.findById(savedReceipt._id)
        .populate('createdBy', 'name email')
        .populate('details')
        .populate('journalEntries')
        .lean();

      if (io) {
        io.emit('receiptVoucherCreated', {
          success: true,
          message: `สร้างใบสำคัญรับเงิน${this.getTypeText(detectedType)} ${populatedReceipt.documentNumber} สำเร็จ`,
          data: populatedReceipt,
          branchStockHistoryId: stockHistory._id,
          receiptType: detectedType,
          branch: populatedReceipt.branch
        });
      }

      return res.status(201).json({
        success: true,
        message: `สร้างใบสำคัญรับเงิน${this.getTypeText(detectedType)}อัตโนมัติสำเร็จ`,
        data: populatedReceipt,
        detectedType: detectedType
      });

    } catch (error) {
      await session.abortTransaction();
      console.error('❌ ReceiptVoucherController.create error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        requestBody: req.body
      });
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้างใบสำคัญรับเงิน',
        error: error.message,
        details: error.stack // เพิ่ม stack trace เพื่อ debug
      });
    } finally {
      session.endSession();
    }
  }

  // Helper: ดึงชื่อลูกค้า
  getCustomerName(stockHistory) {
    if (stockHistory.customerType === 'corporate') {
      return stockHistory.corporateInfo?.companyName || 'บริษัทไม่ระบุชื่อ';
    } else {
      const customerInfo = stockHistory.customerInfo || {};
      if (customerInfo.firstName || customerInfo.lastName) {
        return `${customerInfo.prefix || ''}${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim();
      }
      return customerInfo.name || 'ลูกค้าทั่วไป';
    }
  }

  // Helper: เตรียมรายการสินค้าสำหรับใบสำคัญรับเงิน
  prepareItemsForReceipt(items) {
    if (!Array.isArray(items)) return [];

    return items.map(item => ({
      name: item.name || 'สินค้าไม่ระบุชื่อ',
      description: item.name || 'สินค้าไม่ระบุชื่อ',
      quantity: item.qty || 1,
      unitPrice: item.price || item.sellPrice || 0,
      amount: (item.qty || 1) * (item.price || item.sellPrice || 0),

      // เพิ่มข้อมูล IMEI/Serial Number
      imei: item.imei || item.serial || item.serialNumber || null,
      serial: item.serial || item.serialNumber || null,
      sku: item.sku || item.product_sku || null,
      barcode: item.barcode || null,

      // เพิ่มข้อมูลเพิ่มเติมที่อาจจำเป็น
      unit: item.unit || 'ชิ้น',
      product_id: item.product_id || item._id || null,

      // ถ้ามีข้อมูล IMEI หลายตัวใน array
      imeiList: Array.isArray(item.imeiList) ? item.imeiList :
                (item.imei ? [item.imei] : []),

      // ข้อมูลอื่นๆ ที่อาจจำเป็น
      category: item.category || null,
      brand: item.brand || null,
      model: item.model || null
    }));
  }

  async printPdf(req, res) {
  try {
    const { id } = req.params;

    // ดึงข้อมูลใบสำคัญรับเงิน
    const receiptVoucher = await ReceiptVoucher.findById(id).lean()
      .populate('createdBy', 'name email')
      .populate('branch')
      .populate('details')
      .lean();

    if (!receiptVoucher) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบใบสำคัญรับเงิน'
      });
    }

    // ดึงข้อมูลสาขา - แบบเดียวกับ InvoiceController
    const rawBranch = await Branch.findOne({
      $or: [
        { _id: receiptVoucher.branch }, // ค้นหาด้วย ObjectId จาก receiptVoucher
        { code: receiptVoucher.branch_code },
        { branch_code: receiptVoucher.branch_code }
      ]
    })
    .select('branch_code code name address taxId tel')
    .lean();

    // เตรียมข้อมูลสาขา
    const branch = rawBranch ? {
      name: rawBranch.name,
      code: rawBranch.branch_code || rawBranch.code,
      address: rawBranch.address,
      taxId: rawBranch.taxId,
      tel: rawBranch.tel
    } : {
      name: '-',
      code: '-',
      address: '-',
      taxId: '-',
      tel: '-'
    };

    // เตรียมข้อมูลสำหรับ PDF
    const pdfData = {
      ...receiptVoucher,
      company: {
        name: 'บริษัท 2 พี่น้อง โมบาย จำกัด'
      },
      branch: branch, // ใช้ branch object ที่ format แล้ว
      // เพิ่มข้อมูลที่จำเป็นสำหรับ PDF
      amountInWords: this.numberToThaiText(receiptVoucher.totalAmount),
      paymentDateFormatted: formatThaiDate(receiptVoucher.paymentDate)
    };

    // เรียกใช้ PDF Controller
    const { buffer, fileName } = await ReceiptVoucherPdfController.createReceiptVoucherPdf(pdfData);

    // อัปเดต print count
    await ReceiptVoucher.findByIdAndUpdate(id, {
      $inc: { printCount: 1 },
      lastPrintedAt: new Date()
    });

    // ส่ง PDF กลับ
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้าง PDF',
      error: error.message
    });
  }
}

  // Helper: ดึงบัญชีเดบิต (รับเงิน)
  async getDebitAccount(paymentMethod, receiptType, session) {
    let accountCode;

    // กรณีพิเศษสำหรับ return (รับคืน)
    if (receiptType === 'return') {
      accountCode = '44103'; // รับคืนสินค้า (Dr.)
      const account = await ChartOfAccount.findOne({ code: accountCode }).lean().session(session);
      if (!account) throw new Error(`Chart of Account not found for code: ${accountCode} (return debit)`);
      return account;
    }

    // กรณีขายเชื่อ
    if (receiptType === 'credit_sale') {
      accountCode = '11301'; // ลูกหนี้การค้า
      const account = await ChartOfAccount.findOne({ code: accountCode }).lean().session(session);
      if (!account) throw new Error(`Chart of Account not found for code: ${accountCode} (credit_sale debit)`);
      return account;
    }

    // กรณีอื่นๆ ตามวิธีการชำระเงิน
    switch (paymentMethod?.toLowerCase()) {
      case 'cash':
        accountCode = '11101'; // เงินสด
        break;
      case 'transfer':
      case 'cheque':
      case 'credit_card':
      case 'e_wallet':
      case 'bank_transfer':
        accountCode = '11103'; // เงินฝากธนาคาร
        break;
      default:
        accountCode = '11101'; // Default to cash
    }

    const account = await ChartOfAccount.findOne({ code: accountCode }).lean().session(session);
    if (!account) throw new Error(`Chart of Account not found for code: ${accountCode} (paymentMethod: ${paymentMethod}, receiptType: ${receiptType})`);
    return account;
  }

  // Helper: ดึงบัญชีเครดิต
  async getCreditAccount(receiptType, reason, paymentMethod, session) { // Added paymentMethod for return consistency
    let accountCode;

    switch (receiptType) {
      case 'cash_sale':
      case 'installment': // ขายผ่อนก็บันทึกรายได้จากการขาย
        accountCode = '44101'; // รายได้จากการขาย
        break;
      case 'service':
        accountCode = '44102'; // รายได้จากการบริการ
        break;
      case 'credit_sale':
        accountCode = '44101'; // รายได้จากการขาย (แม้จะยังไม่ได้รับเงิน ก็รับรู้รายได้)
        break;
      case 'debt_payment':
        accountCode = '11301'; // ลูกหนี้การค้า (Cr.)
        break;
      case 'deposit':
        accountCode = '21104'; // เงินรับล่วงหน้า-เงินมัดจำ
        break;
      case 'return':
        // Credit account for return is handled by the main create logic (cash/bank)
        // This function might not be strictly needed for 'return' credit side if handled above,
        // but for completeness, or if called independently:
        if (paymentMethod?.toLowerCase() === 'cash') {
            accountCode = '11101'; // เงินสด
        } else {
            accountCode = '11103'; // เงินฝากธนาคาร (default for non-cash returns)
        }
        break;
      default:
        // Fallback to original logic based on reason if receiptType is unknown/generic
        if (reason === 'บริการ') {
          accountCode = '44102';
        } else {
          accountCode = '44101'; // Default to รายได้จากการขาย
        }
    }

    const account = await ChartOfAccount.findOne({ code: accountCode }).lean().session(session);
    if (!account) throw new Error(`Chart of Account not found for code: ${accountCode} (receiptType: ${receiptType}, reason: ${reason})`);
    return account;
  }

  // Helper: สร้างรายละเอียดใบสำคัญรับเงิน
  async createReceiptDetails(receiptVoucher, stockHistory, session) {
    const details = [];

    if (stockHistory.items && stockHistory.items.length > 0) {
      // สร้างรายละเอียดแยกตามรายการสินค้า
      for (const item of stockHistory.items) {
        const detail = new ReceiptVoucherDetail({
          receiptVoucher: receiptVoucher._id,
          description: item.name || 'สินค้าไม่ระบุชื่อ',
          amount: (item.qty || 1) * (item.price || item.sellPrice || 0),
          accountCode: '41101', // Or derive from item type if more complex
          accountName: 'รายได้จากการขาย', // Or derive
          vatType: stockHistory.taxType === 'รวมภาษี' ? 'include' : stockHistory.taxType === 'แยกภาษี' ? 'exclude' : 'none',
          vatRate: stockHistory.taxType !== 'ไม่มีภาษี' && stockHistory.taxType !== 'ยกเว้นภาษี' ? (stockHistory.vat_rate || 7) : 0,
          netAmount: (item.qty || 1) * (item.price || item.sellPrice || 0), // This might need adjustment based on VAT
          reference: {
            productCode: item.sku || item.barcode,
            quantity: item.qty || 1,
            unitPrice: item.price || item.sellPrice || 0,
            unit: item.unit || 'ชิ้น'
          }
        });

        const savedDetail = await detail.save({ session });
        details.push(savedDetail);
      }
    } else {
      // สร้างรายละเอียดรวม (e.g., for services without itemization or if items array is empty)
      const detail = new ReceiptVoucherDetail({
        receiptVoucher: receiptVoucher._id,
        description: `${stockHistory.reason || 'รายได้จากการขาย'} - Invoice: ${stockHistory.invoice_no || 'N/A'}`,
        amount: stockHistory.net_amount || stockHistory.total_amount || 0,
        accountCode: '41101', // Default or derived
        accountName: 'รายได้จากการขาย', // Default or derived
        vatType: stockHistory.taxType === 'รวมภาษี' ? 'include' : stockHistory.taxType === 'แยกภาษี' ? 'exclude' : 'none',
        vatRate: stockHistory.taxType !== 'ไม่มีภาษี' && stockHistory.taxType !== 'ยกเว้นภาษี' ? (stockHistory.vat_rate || 7) : 0,
        netAmount: stockHistory.net_amount || stockHistory.total_amount || 0 // Adjust based on VAT
      });

      const savedDetail = await detail.save({ session });
      details.push(savedDetail);
    }

    return details;
  }

  // Helper: สร้างรายการบัญชี
  async createJournalEntries(receiptVoucher, stockHistory, debitAccount, creditAccount, session) {
    const journalEntries = [];
    const totalAmount = receiptVoucher.totalAmount; // Use amount from receipt voucher
    const preVatAmount = stockHistory.pre_vat_amount || totalAmount; // Amount before VAT
    const vatAmount = stockHistory.vat_amount || 0;

    // Debit Entry (เงินสด/ธนาคาร)
    const debitEntry = new JournalEntry({
      documentType: 'RV',
      documentId: receiptVoucher._id,
      documentNumber: receiptVoucher.documentNumber,
      transactionDate: receiptVoucher.paymentDate,
      accountCode: debitAccount.code,
      accountName: debitAccount.name,
      debit: totalAmount, // Total amount received
      credit: 0,
      description: `รับเงินจาก ${receiptVoucher.receivedFrom} - Invoice: ${stockHistory.invoice_no || 'N/A'}`,
      createdBy: receiptVoucher.createdBy,
      branch: receiptVoucher.branch
    });

    const savedDebitEntry = await debitEntry.save({ session });
    journalEntries.push(savedDebitEntry);

    // Credit Entry (รายได้) - Based on pre-VAT amount if VAT exists
    const creditRevenueEntry = new JournalEntry({
      documentType: 'RV',
      documentId: receiptVoucher._id,
      documentNumber: receiptVoucher.documentNumber,
      transactionDate: receiptVoucher.paymentDate,
      accountCode: creditAccount.code,
      accountName: creditAccount.name,
      debit: 0,
      credit: vatAmount > 0 ? preVatAmount : totalAmount, // Credit revenue (pre-VAT or total)
      description: `${stockHistory.reason || 'รายได้'} - Invoice: ${stockHistory.invoice_no || 'N/A'}`,
      createdBy: receiptVoucher.createdBy,
      branch: receiptVoucher.branch
    });

    const savedCreditRevenueEntry = await creditRevenueEntry.save({ session });
    journalEntries.push(savedCreditRevenueEntry);

    // ถ้ามี VAT แยกรายการภาษี
    if (vatAmount > 0) {
      const vatPayableAccount = await ChartOfAccount.findOne({ code: '21601' }).lean().session(session);
      if (!vatPayableAccount) {
        // This should ideally throw an error and abort if VAT account is missing
        console.error("VAT Payable account '21502' not found!");
      } else {
        const vatEntry = new JournalEntry({
          documentType: 'RV',
          documentId: receiptVoucher._id,
          documentNumber: receiptVoucher.documentNumber,
          transactionDate: receiptVoucher.paymentDate,
          accountCode: vatPayableAccount.code,
          accountName: vatPayableAccount.name,
          debit: 0,
          credit: vatAmount,
          description: `ภาษีขาย - Invoice: ${stockHistory.invoice_no || 'N/A'}`,
          createdBy: receiptVoucher.createdBy,
          branch: receiptVoucher.branch
        });
        const savedVatEntry = await vatEntry.save({ session });
        journalEntries.push(savedVatEntry);
      }
    }

    return journalEntries;
  }

  async printPdfByDocumentNumber(req, res) {
  try {
    const { documentNumber } = req.params;

    // หา receipt ด้วย documentNumber
    const receiptVoucher = await ReceiptVoucher.findOne({ documentNumber }).lean()
      .populate('createdBy', 'name email')
      .populate('branch')
      .populate('details')
      .lean();

    if (!receiptVoucher) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบใบสำคัญรับเงิน'
      });
    }

    // ส่งต่อไปยัง printPdf method
    req.params.id = receiptVoucher._id;
    return this.printPdf(req, res);

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้าง PDF',
      error: error.message
    });
  }
}

 // เพิ่ม method สำหรับสร้างแบบ Batch
async createBatch(req, res) {
    try {
        const {
            startDate,
            endDate,
            branch_code,
            branch,  // ✅ รับ branch (ObjectId) มาด้วย
            limit = 100,
            reason,
            paymentMethod = 'cash',
            bankAccount
        } = req.body;

        // ✅ ตรวจสอบและ validate branch
        const branchId = branch || branch_code;

        let branchQuery = {};
        if (branchId) {
            if (/^[0-9a-fA-F]{24}$/.test(branchId)) {
                // ถ้าเป็น ObjectId หา branch_code จาก DB
                const branchDoc = await Branch.findById(branchId).lean();
                if (branchDoc) {
                    branchQuery.branch_code = branchDoc.code;
                } else {
                    return res.status(400).json({
                        success: false,
                        message: 'ไม่พบ Branch ตาม ObjectId ที่ส่งมา'
                    });
                }
            } else {
                // ถ้าเป็น branch_code string ใส่เข้าไปเลย
                branchQuery.branch_code = branchId;
            }
        }

        const io = req.app.get('io');

        const query = {
            change_type: 'OUT',
            hasReceiptVoucher: { $ne: true },
            ...branchQuery,
        };

        // กรอง reason
        if (reason) {
            query.reason = { $in: reason.split(',').map(r => r.trim()) };
        } else {
            query.reason = { $in: ['ขาย POS', 'ขายแบบผ่อน', 'บริการ'] };
        }

        if (startDate || endDate) {
            query.performed_at = {};
            if (startDate) query.performed_at.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.performed_at.$lte = end;
            }
        }
        const histories = await BranchStockHistory.find(query).lean()
            .populate('performed_by', 'name email')
            .limit(parseInt(limit))
            .sort({ performed_at: 1 });
        const results = {
            success: [],
            failed: [],
            total: histories.length
        };

        let processed = 0;

        for (const history of histories) {
            const session = await mongoose.startSession();
            session.startTransaction();

            // === แก้ไขตรงนี้ ===
            // หา branch object
            const branch = await Branch.findOne({
  $or: [
    { code: history.branch_code },
    { branch_code: history.branch_code }
  ]
}).lean();
            if (!branch) {
              await session.abortTransaction();
              results.failed.push({
                historyId: history._id,
                invoiceNo: history.invoice_no,
                error: 'ไม่พบ branch_code: ' + history.branch_code
              });
              session.endSession();
              continue;
            }
            // === จบแก้ไขตรงนี้ ===

            try {
                processed++;
                // console.log(`📄 กำลังประมวลผล ${processed}/${results.total} (BSH ID: ${history._id})`);

                const detectedTypeInBatch = this.detectReceiptType(history);
                const documentNumber = await this.generateDocumentNumberByType(
                    detectedTypeInBatch,
                    branch._id, // ส่ง ObjectId เท่านั้น
                    session
                );

                let debitAccountInBatch, creditAccountInBatch;
                const effectivePaymentMethod = paymentMethod || history.paymentInfo?.method || 'cash';

                if (detectedTypeInBatch === 'return') {
                    debitAccountInBatch = await ChartOfAccount.findOne({ code: '44103' }).lean().session(session);
                    creditAccountInBatch = effectivePaymentMethod.toLowerCase() === 'cash'
                      ? await ChartOfAccount.findOne({ code: '11101' }).lean().session(session)
                      : await ChartOfAccount.findOne({ code: '11103' }).lean().session(session);
                } else {
                    debitAccountInBatch = await this.getDebitAccount(effectivePaymentMethod, detectedTypeInBatch, session);
                    creditAccountInBatch = await this.getCreditAccount(detectedTypeInBatch, history.reason, effectivePaymentMethod, session);
                }

                if (!debitAccountInBatch || !creditAccountInBatch) {
                    throw new Error(`ไม่พบข้อมูลผังบัญชีที่จำเป็นสำหรับ Batch (Type: ${detectedTypeInBatch}, BSH: ${history._id})`);
                }

                const customerName = this.getCustomerName(history);
                let totalAmountInBatch = history.net_amount != null ? history.net_amount : (history.total_amount || 0);
                if (detectedTypeInBatch === 'return') {
                    totalAmountInBatch = Math.abs(totalAmountInBatch);
                }

                const receiptVoucher = new ReceiptVoucher({
                    documentNumber,
                    receiptVoucherNumber: documentNumber,
                    paymentDate: history.performed_at || new Date(),
                    branch: branch._id, // ต้องเป็น ObjectId เท่านั้น
                    debitAccount: {
                        code: debitAccountInBatch.code,
                        name: debitAccountInBatch.name
                    },
                    creditAccount: {
                        code: creditAccountInBatch.code,
                        name: creditAccountInBatch.name
                    },
                    receivedFrom: customerName,
                    receiptType: detectedTypeInBatch,
                    paymentMethod: effectivePaymentMethod,
                    bankAccount: bankAccount || history.paymentInfo?.bankAccount,
                    totalAmount: totalAmountInBatch,
                    notes: this.generateNotesByType(detectedTypeInBatch, history) + ' (Batch)',
                    status: 'completed',
                    reference: {
                        invoiceNumber: history.invoice_no,
                        originalInvoice: history.paymentInfo?.originalInvoice,
                        debtInvoices: history.paymentInfo?.debtInvoices || [],
                        installmentContract: history.contract_no,
                        branchStockHistoryId: history._id
                    },
                    createdBy: req.user?._id || history.performed_by?._id,
                    customerType: history.customerType || 'individual',
                    customerInfo: history.customerType === 'corporate' ? history.corporateInfo : history.customerInfo,
                    items: this.prepareItemsForReceipt(history.items),
                    transactionType: history.transactionType,
                    autoDetected: true
                });

                const savedReceipt = await receiptVoucher.save({ session });
                const details = await this.createReceiptDetails(savedReceipt, history, session);
                const journalEntries = await this.createJournalEntriesByType(
                    savedReceipt,
                    history,
                    debitAccountInBatch,
                    creditAccountInBatch,
                    detectedTypeInBatch,
                    session
                );

                savedReceipt.details = details.map(d => d._id);
                savedReceipt.journalEntries = journalEntries.map(j => j._id);
                await savedReceipt.save({ session });

                history.receiptVoucherId = savedReceipt._id;
                history.hasReceiptVoucher = true;
                history.receiptVoucherCreatedAt = new Date();
                await history.save({ session });

                if (detectedTypeInBatch === 'debt_payment' && totalAmountInBatch > 0) {
                    await this.updateDebtBalance(history, totalAmountInBatch, session);
                }

                await session.commitTransaction();

                results.success.push({
     historyId: history._id,
     documentNumber: savedReceipt.documentNumber,
     receiptVoucherId: savedReceipt._id,    // <— เพิ่มตรงนี้
     invoiceNo: history.invoice_no
   });

                if (io) {
                    io.emit('batchReceiptProgress', {
                        processed,
                        total: results.total,
                        currentDoc: savedReceipt.documentNumber,
                        historyId: history._id,
                        status: 'success'
                    });
                }

            } catch (error) {
                await session.abortTransaction();
                results.failed.push({
                    historyId: history._id,
                    invoiceNo: history.invoice_no,
                    error: error.message
                });

                if (io) {
                    io.emit('batchReceiptProgress', {
                        processed,
                        total: results.total,
                        historyId: history._id,
                        status: 'failed',
                        error: error.message
                    });
                }
            } finally {
                session.endSession();
            }

            if (processed % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        if (io) {
            io.emit('batchReceiptCompleted', {
                successCount: results.success.length,
                failedCount: results.failed.length,
                total: results.total,
                summary: results
            });
        }

        return res.json({
            success: true,
            message: `สร้างสำเร็จ ${results.success.length} จาก ${results.total} รายการ`,
            data: results
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

  // เพิ่ม method ตรวจสอบรายการที่รอสร้าง
async checkPending(req, res) {
  try {
    const { branch_code, start_date, end_date, reason, receiptType } = req.query;

    // ✅ กรอง hasReceiptVoucher
    const query = {
      $or: [
        { hasReceiptVoucher: { $ne: true } },
        { hasReceiptVoucher: { $exists: false } },
        { hasReceiptVoucher: false },
        { hasReceiptVoucher: null }
      ]
    };

    // ✅ กำหนดประเภทที่ต้องการแสดงเท่านั้น
    const validReasons = ['ขาย POS', 'ขายสด', 'ขายเชื่อ', 'รับชำระหนี้', 'รับเงินมัดจำ', 'คืนสินค้า'];

    // ✅ เพิ่มการกรอง reason และ change_type
    if (reason) {
      query.reason = { $in: reason.split(',').map(r => r.trim()) };
    } else {
      // กรองเฉพาะ validReasons
      query.reason = { $in: validReasons };
    }

    // ✅ เพิ่มการกรอง change_type ตามประเภท
    query.$and = [
      {
        $or: [
          {
            change_type: 'OUT',
            reason: { $in: ['ขาย POS', 'ขายสด', 'ขายเชื่อ'] }
          },
          {
            change_type: 'IN',
            reason: { $in: ['คืนสินค้า', 'รับชำระหนี้', 'รับเงินมัดจำ'] }
          }
        ]
      }
    ];

    if (branch_code) query.branch_code = branch_code;
    if (start_date || end_date) {
      query.performed_at = {};
      if (start_date) query.performed_at.$gte = new Date(start_date);
      if (end_date) {
        const end = new Date(end_date);
        end.setHours(23, 59, 59, 999);
        query.performed_at.$lte = end;
      }
    }

    // ✅ นับจำนวนที่ตรงตาม query
    const totalPending = await BranchStockHistory.countDocuments(query);

    // ดึงข้อมูลตัวอย่าง
    const histories = await BranchStockHistory.find(query).lean()
      .populate('performed_by', 'name')
      .limit(50)
      .sort({ performed_at: -1 })
      .lean();

    // Filter by detectedType if receiptType query param is present
    let filteredSamples = histories;
    if (receiptType) {
      filteredSamples = histories.filter(s => this.detectReceiptType(s) === receiptType);
    }

    const samplesToShow = filteredSamples.slice(0, 20); // เพิ่มจำนวนที่แสดง

    return res.json({
      success: true,
      data: {
        totalPending: totalPending, // ✅ ใช้จำนวนจาก query ที่กรองแล้ว
        samples: samplesToShow.map(s => ({
          _id: s._id,
          invoice_no: s.invoice_no || s.invoiceNumber,
          reason: s.reason,
          transactionType: s.transactionType,
          detectedReceiptType: this.detectReceiptType(s),
          net_amount: s.net_amount || s.total_amount || 0,
          total_amount: s.total_amount || 0,
          performed_at: s.performed_at,
          staff_name: s.staff_name || s.performed_by?.name,
          customer_name: this.getCustomerName(s),
          change_type: s.change_type,
          paymentInfo: s.paymentInfo,
          hasReceiptVoucher: s.hasReceiptVoucher || false // ✅ เพิ่ม field นี้เพื่อ debug
        }))
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

async generateDocumentNumberByType(receiptType, branchObjId, session) {
  try {
    const year = new Date().getFullYear().toString().substr(-2);
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    // Prefix ตามประเภท
    const prefixMap = {
      'cash_sale': 'RV',
      'credit_sale': 'RC',
      'debt_payment': 'RP',
      'deposit': 'RD',
      'return': 'RR',
      'service': 'RS',
      'installment': 'RI'
    };

    const prefix = prefixMap[receiptType] || 'RV';
    const pattern = `${prefix}${year}${month}`;

    // หาเลขที่ล่าสุด
    const lastDoc = await ReceiptVoucher.findOne({
      documentNumber: new RegExp(`^${pattern}`),
      branch: branchObjId // ต้องเป็น ObjectId
    })
    .sort({ documentNumber: -1 })
    .session(session);

    let nextNumber = 1;
    if (lastDoc) {
      const lastNumber = parseInt(lastDoc.documentNumber.substr(-4));
      nextNumber = lastNumber + 1;
    }

    return `${pattern}${String(nextNumber).padStart(4, '0')}`;
  } catch (error) {
    // Fallback
    return `RV${Date.now()}`;
  }
}

async createJournalEntriesByType(receiptVoucher, stockHistory, debitAccount, creditAccount, receiptType, session) {
  const journalEntries = [];
  const totalAmount = receiptVoucher.totalAmount;

  // กรณีรับคืนสินค้า - สลับ Dr/Cr
  if (receiptType === 'return') {
    // Dr. รับคืนสินค้า
    const debitEntry = new JournalEntry({
      documentType: 'RV',
      documentId: receiptVoucher._id,
      documentNumber: receiptVoucher.documentNumber,
      transactionDate: receiptVoucher.paymentDate,
      accountCode: '44103', // รับคืนสินค้า
      accountName: 'รับคืนสินค้า',
      debit: totalAmount,
      credit: 0,
      description: `รับคืนสินค้าจาก ${receiptVoucher.receivedFrom}`,
      createdBy: receiptVoucher.createdBy,
      branch: receiptVoucher.branch
    });

    // Cr. เงินสด/ธนาคาร
    const creditEntry = new JournalEntry({
      documentType: 'RV',
      documentId: receiptVoucher._id,
      documentNumber: receiptVoucher.documentNumber,
      transactionDate: receiptVoucher.paymentDate,
      accountCode: creditAccount.code,
      accountName: creditAccount.name,
      debit: 0,
      credit: totalAmount,
      description: `จ่ายคืนเงินให้ ${receiptVoucher.receivedFrom}`,
      createdBy: receiptVoucher.createdBy,
      branch: receiptVoucher.branch
    });

    const savedDebit = await debitEntry.save({ session });
    const savedCredit = await creditEntry.save({ session });

    journalEntries.push(savedDebit, savedCredit);

  } else {
    // กรณีปกติ ใช้ createJournalEntries เดิม
    return await this.createJournalEntries(receiptVoucher, stockHistory, debitAccount, creditAccount, session);
  }

  return journalEntries;
}

generateNotesByType(receiptType, stockHistory) {
  const noteMap = {
    'cash_sale': `ขายสินค้าเงินสด Invoice: ${stockHistory.invoice_no || '-'}`,
    'credit_sale': `ขายสินค้าเชื่อ Invoice: ${stockHistory.invoice_no || '-'}`,
    'debt_payment': `รับชำระหนี้ตาม Invoice: ${stockHistory.paymentInfo?.debtInvoices?.join(', ') || '-'}`,
    'deposit': `รับเงินมัดจำ Invoice: ${stockHistory.invoice_no || '-'}`,
    'return': `รับคืนสินค้า จาก Invoice: ${stockHistory.paymentInfo?.originalInvoice || '-'}`,
    'service': `รายได้จากการบริการ Invoice: ${stockHistory.invoice_no || '-'}`,
    'installment': `ขายผ่อน Contract: ${stockHistory.contract_no || '-'}`
  };

  return noteMap[receiptType] || `${stockHistory.reason || 'รายการรับเงิน'} - สร้างอัตโนมัติ`;
}

getTypeText(receiptType) {
  const typeTextMap = {
    'cash_sale': 'ขายสินค้า',
    'credit_sale': 'ขายเชื่อ',
    'debt_payment': 'รับชำระหนี้',
    'deposit': 'รับเงินมัดจำ',
    'return': 'รับคืนสินค้า',
    'service': 'บริการ',
    'installment': 'ขายผ่อน'
  };

  return typeTextMap[receiptType] || '';
}

async updateDebtBalance(stockHistory, paymentAmount, session) {
  try {
    if (stockHistory.paymentInfo?.debtInvoices?.length > 0) {
      for (const invoiceNo of stockHistory.paymentInfo.debtInvoices) {
        // อัปเดตยอดหนี้ในระบบ
        await BranchStockHistory.updateOne(
          { invoice_no: invoiceNo },
          {
            $inc: {
              paid_amount: paymentAmount,
              remaining_amount: -paymentAmount
            },
            $set: {
              last_payment_date: new Date()
            }
          },
          { session }
        );
      }
    }
  } catch (error) {
    throw error;
  }
}
  // Method สำหรับดึงใบสำคัญรับเงินที่สร้างจาก BranchStockHistory
  async getByBranchStockHistoryId(req, res) {
    try {
      const { branchStockHistoryId } = req.params;

      if (!branchStockHistoryId) {
        return res.status(400).json({
          success: false,
          message: 'ต้องระบุ branchStockHistoryId'
        });
      }

      const receiptVoucher = await ReceiptVoucher.findOne({
        'reference.branchStockHistoryId': branchStockHistoryId
      })
      .populate('details') // Populate details
      .populate('createdBy', 'name email')
      .populate('journalEntries'); // Populate journal entries

      if (!receiptVoucher) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบใบสำคัญรับเงินสำหรับ BranchStockHistory นี้'
        });
      }

      return res.json({
        success: true,
        data: receiptVoucher
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Method สำหรับ retry การสร้างที่ failed
  async retryFailed(req, res) {
    try {
      const { historyIds, paymentMethod, bankAccount } = req.body; // Added paymentMethod, bankAccount
      const io = req.app.get('io');

      if (!historyIds || !Array.isArray(historyIds) || historyIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'ต้องระบุ historyIds เป็น array'
        });
      }

      const results = {
        success: [],
        failed: [],
        total: historyIds.length
      };

      for (const historyId of historyIds) {
        try {
          // สร้าง request body สำหรับ create method
          const mockReq = {
            body: {
              branchStockHistoryId: historyId,
              paymentMethod: paymentMethod || 'cash', // Use provided or default
              bankAccount: bankAccount,             // Use provided
              force: true // Force creation for retry
            },
            user: req.user, // Pass the authenticated user
            app: req.app // Pass the app instance for io
          };

          let tempResData;
          let tempResStatus;

          // Mock res object to capture the result of this.create
          const mockRes = {
            status: (code) => {
              tempResStatus = code;
              return {
                json: (data) => {
                  tempResData = data;
                }
              };
            },
            json: (data) => { // Fallback if status().json() is not called
                tempResStatus = tempResStatus || (data.success ? 201 : 400); // Infer status
                tempResData = data;
            }
          };

          await this.create(mockReq, mockRes); // Call the new create method

          // Process the result captured in tempResData and tempResStatus
          if (tempResData && tempResData.success) {
            results.success.push({
              historyId,
              documentNumber: tempResData.data?.documentNumber // Access documentNumber from data object
            });
          } else {
            results.failed.push({
              historyId,
              error: tempResData ? tempResData.message : 'Unknown error during retry'
            });
          }

        } catch (error) { // Catch errors from the this.create call itself or other issues
          results.failed.push({
            historyId,
            error: error.message
          });
        }
      }

      if (io) {
        io.emit('retryCompleted', {
          successCount: results.success.length,
          failedCount: results.failed.length,
          total: results.total,
          summary: results
        });
      }

      return res.json({
        success: true,
        message: `Retry สำเร็จ ${results.success.length} จาก ${results.total} รายการ`,
        data: results
      });

    } catch (error) {
      if (io) {
        io.emit('retryError', { error: error.message });
      }
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Method สำหรับดู summary
  async getSummaryByDate(req, res) {
    try {
      const { start_date, end_date, branch_code } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'ต้องระบุ start_date และ end_date'
        });
      }

      const sDate = new Date(start_date);
      sDate.setHours(0, 0, 0, 0);
      const eDate = new Date(end_date);
      eDate.setHours(23, 59, 59, 999);

      // Query BranchStockHistory
      const query = {
        change_type: 'OUT',
        reason: { $in: ['ขาย POS', 'ขายแบบผ่อน', 'บริการ'] }, // Consider making this configurable
        performed_at: {
          $gte: sDate,
          $lte: eDate
        }
      };

      if (branch_code) query.branch_code = branch_code;

      // Aggregate data
      const summary = await BranchStockHistory.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              hasReceipt: { $ifNull: ['$hasReceiptVoucher', false] }, // Treat null as false
              reason: '$reason'
            },
            count: { $sum: 1 },
            totalAmount: { $sum: { $ifNull: ['$net_amount', { $ifNull: ['$total_amount', 0] }] } } // Sum net_amount or total_amount
          }
        },
        {
          $group: {
            _id: '$_id.hasReceipt',
            reasons: {
              $push: {
                reason: '$_id.reason',
                count: '$count',
                amount: '$totalAmount'
              }
            },
            totalCount: { $sum: '$count' },
            totalAmount: { $sum: '$totalAmount' }
          }
        },
        { $sort: { _id: 1 } } // Sort by hasReceipt (false then true)
      ]);

      // Format response
      const result = {
        withReceipt: {
          count: 0,
          amount: 0,
          byReason: {}
        },
        withoutReceipt: {
          count: 0,
          amount: 0,
          byReason: {}
        },
        total: {
          count: 0,
          amount: 0
        }
      };

      summary.forEach(item => {
        const key = item._id === true ? 'withReceipt' : 'withoutReceipt'; // _id will be true or false
        result[key].count = item.totalCount;
        result[key].amount = item.totalAmount;

        item.reasons.forEach(reasonItem => {
          result[key].byReason[reasonItem.reason] = {
            count: reasonItem.count,
            amount: reasonItem.amount
          };
        });
      });

      result.total.count = result.withReceipt.count + result.withoutReceipt.count;
      result.total.amount = result.withReceipt.amount + result.withoutReceipt.amount;

      return res.json({
        success: true,
        data: result,
        dateRange: {
          start: start_date,
          end: end_date
        }
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // 4. เพิ่ม validation helper
  validateBranchStockHistory(stockHistory) {
    const errors = [];

    if (!stockHistory) {
      errors.push('ข้อมูล stockHistory ไม่ถูกต้อง');
      return errors;
    }

    if (!stockHistory.branch_code) {
      errors.push('ไม่มี branch_code');
    }

    if (!stockHistory.items || stockHistory.items.length === 0) {
      errors.push('ไม่มีรายการสินค้า');
    } else {
      stockHistory.items.forEach((item, index) => {
        if (typeof (item.qty || 0) * (item.price || item.sellPrice || 0) !== 'number') {
            errors.push(`รายการสินค้าที่ ${index + 1} คำนวณยอดเงินไม่ถูกต้อง`);
        }
      });
    }

    const totalAmount = stockHistory.net_amount || stockHistory.total_amount;
    if (typeof totalAmount !== 'number') {
      errors.push('ไม่มียอดเงินรวม (net_amount or total_amount) หรือรูปแบบไม่ถูกต้อง');
    } else if (totalAmount === 0 && (stockHistory.items && stockHistory.items.length > 0) ) {
      // Allow zero total if there are no items (e.g. free service with no line items)
      // but flag if items exist and total is zero.
      let itemsTotal = 0;
      if(stockHistory.items) {
        itemsTotal = stockHistory.items.reduce((sum, item) => sum + (item.qty || 0) * (item.price || item.sellPrice || 0), 0);
      }
      if (itemsTotal > 0 && totalAmount === 0) {
         errors.push('ยอดเงินรวมเป็น 0 ทั้งที่มีรายการสินค้า');
      }
    }

    return errors.length > 0 ? errors : null;
  }

  // Method สำหรับดึงรายการใบสำคัญรับเงินทั้งหมด (จาก Controller เดิม)
  async getAll(req, res) {
    try {
      const {
        startDate,
        endDate,
        status,
        receiptType,
        paymentMethod,
        search,
        page = 1,
        limit = 20,
        sortBy = '-paymentDate' // Assuming paymentDate exists on ReceiptVoucher
      } = req.query;

      const query = {};

      // Date filter - Assuming paymentDate is the relevant date field on ReceiptVoucher
      if (startDate || endDate) {
        query.paymentDate = {}; // Ensure paymentDate is initialized
        if (startDate) query.paymentDate.$gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          query.paymentDate.$lte = end;
        }
      }

      // Status filter
      if (status) query.status = status;
      if (receiptType) query.receiptType = receiptType;
      if (paymentMethod) query.paymentMethod = paymentMethod;

      // Search
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        query.$or = [
          { documentNumber: searchRegex },
          { receivedFrom: searchRegex },
          { 'customerInfo.name': searchRegex },
          { 'customerInfo.firstName': searchRegex },
          { 'customerInfo.lastName': searchRegex },
          { 'corporateInfo.companyName': searchRegex }
        ];
      }

      // Branch filter - if req.user.branch is available and relevant
      // if (req.user && req.user.role !== 'admin' && req.user.branch) {
      //   query.branch = req.user.branch;
      // }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [receipts, total] = await Promise.all([
        ReceiptVoucher.find(query).lean()
          .populate('createdBy', 'name email')
          .populate('details') // Populate details as per new structure
          .sort(sortBy)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        ReceiptVoucher.countDocuments(query)
      ]);

      return res.json({
        success: true,
        data: receipts,
        pagination: {
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
          currentPage: parseInt(page),
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Method สำหรับดึงใบสำคัญรับเงินตาม ID
  async getById(req, res) {
    try {
      const { id } = req.params;

      const receiptVoucher = await ReceiptVoucher.findById(id).lean()
        .populate('createdBy', 'name email')
        .populate('details') // Populate details
        .populate('journalEntries'); // Populate journal entries

      if (!receiptVoucher) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบใบสำคัญรับเงิน'
        });
      }

      return res.json({
        success: true,
        data: receiptVoucher
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Method สำหรับยกเลิกใบสำคัญรับเงิน
  async cancel(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'กรุณาระบุเหตุผลในการยกเลิก'
        });
      }

      const receiptVoucher = await ReceiptVoucher.findById(id).lean()
        .populate('journalEntries') // Populate to access individual entries for reversal
        .session(session);

      if (!receiptVoucher) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: 'ไม่พบใบสำคัญรับเงิน'
        });
      }

      if (receiptVoucher.status === 'cancelled') {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'ใบสำคัญรับเงินถูกยกเลิกแล้ว'
        });
      }

      // Update status
      receiptVoucher.status = 'cancelled';
      receiptVoucher.cancelledBy = req.user._id;
      receiptVoucher.cancelledAt = new Date();
      receiptVoucher.cancelReason = reason;
      await receiptVoucher.save({ session });

      // Update BranchStockHistory if linked
      if (receiptVoucher.reference?.branchStockHistoryId) {
        await BranchStockHistory.findByIdAndUpdate(
          receiptVoucher.reference.branchStockHistoryId,
          {
            hasReceiptVoucher: false,
            receiptVoucherId: null
          },
          { session }
        );
      }

      // Create reverse journal entries
      // The populated journalEntries might be full documents or just IDs depending on schema.
      // Assuming they are full documents or can be re-fetched if needed.
      if (receiptVoucher.journalEntries && receiptVoucher.journalEntries.length > 0) {
        for (const entryData of receiptVoucher.journalEntries) {
          // If entryData is just an ID, you might need to fetch it:
          // const entry = await JournalEntry.findById(entryData).lean().session(session);
          // If entryData is already a populated document:
          const entry = entryData; // Assuming populated

          if (!entry) continue; // Skip if somehow an ID didn't resolve

          const reversal = new JournalEntry({
            documentType: entry.documentType,
            documentId: entry.documentId, // Could be the same RV id
            documentNumber: `${entry.documentNumber}-REV`,
            transactionDate: new Date(),
            accountCode: entry.accountCode,
            accountName: entry.accountName,
            debit: entry.credit, // Reverse debit and credit
            credit: entry.debit,
            description: `ยกเลิก (${reason}): ${entry.description}`,
            isReversed: true,
            reversedFrom: entry._id,
            createdBy: req.user._id,
            branch: entry.branch
          });
          await reversal.save({ session });
        }
      }

      await session.commitTransaction();

      const io = req.app.get('io');
      if (io) {
        io.emit('receiptVoucherCancelled', {
          id: receiptVoucher._id,
          documentNumber: receiptVoucher.documentNumber,
          cancelledBy: req.user.name,
          reason: reason
        });
      }

      return res.json({
        success: true,
        message: 'ยกเลิกใบสำคัญรับเงินสำเร็จ',
        data: receiptVoucher
      });

    } catch (error) {
      await session.abortTransaction();
      return res.status(500).json({
        success: false,
        message: error.message
      });
    } finally {
      session.endSession();
    }
  }

  // Method สำหรับพิมพ์ใบสำคัญรับเงิน
  async print(req, res) {
    try {
      const { id } = req.params;

      const receiptVoucher = await ReceiptVoucher.findById(id).lean()
        .populate('createdBy', 'name')
        .populate('branch')
        .populate('details'); // Populate details

      if (!receiptVoucher) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบใบสำคัญรับเงิน'
        });
      }

      // Update print count
      receiptVoucher.printCount = (receiptVoucher.printCount || 0) + 1;
      receiptVoucher.lastPrintedAt = new Date();
      await receiptVoucher.save();

      // Return print data
      const printData = {
        documentNumber: receiptVoucher.documentNumber,
        paymentDate: receiptVoucher.paymentDate,
        receivedFrom: receiptVoucher.receivedFrom,
        customerInfo: receiptVoucher.customerInfo || receiptVoucher.corporateInfo, // Consolidate customer info
        items: receiptVoucher.items || [], // From main receipt document
        details: receiptVoucher.details || [], // From populated details
        totalAmount: receiptVoucher.totalAmount,
        totalAmountText: this.numberToThaiText(receiptVoucher.totalAmount),
        paymentMethod: receiptVoucher.paymentMethod,
        bankAccount: receiptVoucher.bankAccount,
        branch: receiptVoucher.branch,
        createdBy: receiptVoucher.createdBy,
        notes: receiptVoucher.notes,
        printCount: receiptVoucher.printCount,
        printedAt: new Date()
      };

      return res.json({
        success: true,
        data: printData
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Helper method: แปลงตัวเลขเป็นตัวอักษรไทย
  numberToThaiText(number) {
    // const units = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    // const tens = ['', 'สิบ', 'ยี่สิบ', 'สามสิบ', 'สี่สิบ', 'ห้าสิบ', 'หกสิบ', 'เจ็ดสิบ', 'แปดสิบ', 'เก้าสิบ'];
    // const thousands = ['', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

    if (typeof number !== 'number' || isNaN(number)) {
        return '';
    }

    if (number === 0) return 'ศูนย์บาทถ้วน';

    const integerPart = Math.floor(number);
    const decimalPart = Math.round((number - integerPart) * 100);

    let text = '';

    // ส่วนจำนวนเต็ม
    if (integerPart > 0) {
      const millions = Math.floor(integerPart / 1000000);
      const remainder = integerPart % 1000000;

      if (millions > 0) {
        text += this.convertNumberToText(millions) + 'ล้าน';
      }

      if (remainder > 0) {
        text += this.convertNumberToText(remainder);
      }

      text += 'บาท';
    } else if (decimalPart > 0) { // Handle cases like 0.50 (ห้าสิบสตางค์)
        text = 'ศูนย์บาท';
    }

    // ส่วนทศนิยม (สตางค์)
    if (decimalPart > 0) {
      text += this.convertNumberToText(decimalPart) + 'สตางค์';
    } else if (integerPart > 0) { // Only add 'ถ้วน' if there's an integer part
      text += 'ถ้วน';
    }
    // If both integer and decimal are 0, it's handled by the initial "ศูนย์บาทถ้วน"

    return text;
  }

  // Helper: แปลงตัวเลขเป็นคำอ่านภาษาไทย (for segments less than 1 million)
  convertNumberToText(num) {
    const units = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน']; // For up to 999,999

    let numStr = num.toString();
    let result = '';
    let len = numStr.length;

    if (num === 0) return ''; // Handle zero segment correctly

    for (let i = 0; i < len; i++) {
      let digit = parseInt(numStr[i]);
      let positionIndex = len - 1 - i; // Index for positions array (0 for units, 1 for tens, etc.)

      if (digit !== 0) {
        if (positionIndex === 1 && digit === 2) { // Tens position, digit is 2 (ยี่สิบ)
          result += 'ยี่';
        } else if (positionIndex === 1 && digit === 1) { // Tens position, digit is 1 (สิบ)
          // No "หนึ่ง" before "สิบ", just "สิบ"
        } else if (positionIndex === 0 && digit === 1 && len > 1 && parseInt(numStr[len-2]) !== 0 ) {
          // Units position, digit is 1, and it's not a standalone "1" (e.g., 11, 21 -> เอ็ด)
          // And previous digit (tens) is not zero (e.g. 101 should be หนึ่งร้อยเอ็ด, not หนึ่งร้อยหนึ่งเอ็ด)
          result += 'เอ็ด';
          continue; // Skip adding position for 'เอ็ด'
        } else {
          result += units[digit];
        }
        result += positions[positionIndex];
      }
    }
    return result;
  }

  // Method สำหรับ update (ถ้าต้องการ)
  async update(req, res) {
    try {
      return res.status(501).json({
        success: false,
        message: 'ไม่อนุญาตให้แก้ไขใบสำคัญรับเงินที่สร้างแบบอัตโนมัติ'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Method สำหรับ export Excel
  async exportExcel(req, res) {
    try {
      // Implementation for Excel export
      return res.status(501).json({
        success: false,
        message: 'Excel export ยังไม่พร้อมใช้งาน'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Method สำหรับ generate report
  async generateReport(req, res) {
    try {
      // Implementation for report generation
      return res.status(501).json({
        success: false,
        message: 'Report generation ยังไม่พร้อมใช้งาน'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

const controller = new ReceiptVoucherController();

// Debug: ตรวจสอบ methods ที่มี
// console.log('📋 ReceiptVoucherController methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(controller)));
module.exports = controller;
