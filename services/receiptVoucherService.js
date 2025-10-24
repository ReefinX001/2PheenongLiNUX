// services/receiptVoucherService.js
const mongoose = require('mongoose');
const ReceiptVoucher = require('../models/POS/ReceiptVoucher');
const BranchStockHistory = require('../models/POS/BranchStockHistory');
const Branch = require('../models/Account/Branch');
const Counter = require('../models/POS/Counter'); // ใช้ Counter ที่มีอยู่แล้ว

class ReceiptVoucherService {
  /**
   * สร้างใบสำคัญรับเงินจาก BranchStockHistory
   * @param {String} branchStockHistoryId - ID ของ BranchStockHistory
   * @param {Object} options - ตัวเลือกเพิ่มเติม
   * @returns {Object} ผลลัพธ์การสร้าง
   */
  static async createFromBranchStockHistory(branchStockHistoryId, options = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      console.log(`📋 เริ่มสร้างใบสำคัญรับเงินจาก BranchStockHistory ID: ${branchStockHistoryId}`);

      // 1. ดึงข้อมูล BranchStockHistory
      const stockHistory = await BranchStockHistory.findById(branchStockHistoryId)
        .populate('branch_code')
        .populate('performed_by', 'name email')
        .populate('supplier', 'name')
        .session(session);

      if (!stockHistory) {
        throw new Error('ไม่พบข้อมูล BranchStockHistory');
      }

      // 2. ตรวจสอบว่าเป็นการขายหรือไม่
      if (stockHistory.change_type !== 'OUT') {
        throw new Error('สร้างใบสำคัญรับเงินได้เฉพาะรายการขาย (OUT) เท่านั้น');
      }

      // 3. ตรวจสอบว่าสร้างไปแล้วหรือไม่
      const existingReceipt = await ReceiptVoucher.findOne({
        branchStockHistoryId: branchStockHistoryId
      }).session(session);

      if (existingReceipt && !options.force) {
        console.log(`⚠️ มีใบสำคัญรับเงินแล้ว: ${existingReceipt.documentNumber}`);
        return {
          success: false,
          message: 'มีใบสำคัญรับเงินแล้ว',
          data: existingReceipt
        };
      }

      // 4. ดึงข้อมูลสาขา
      const branch = await Branch.findOne({
        branch_code: stockHistory.branch_code
      }).session(session);

      if (!branch) {
        throw new Error('ไม่พบข้อมูลสาขา');
      }

      // 5. สร้างเลขที่เอกสาร
      const documentNumber = await this.generateDocumentNumber(
        stockHistory.branch_code,
        stockHistory.performed_at || new Date(),
        session
      );

      // 6. เตรียมข้อมูลใบสำคัญรับเงิน
      const receiptData = {
        // ข้อมูลเอกสาร
        documentNumber: documentNumber,
        documentDate: stockHistory.sale_date || stockHistory.performed_at || new Date(),
        documentType: 'receipt', // ใบสำคัญรับ

        // ข้อมูลสาขา
        branchId: branch._id,
        branchCode: stockHistory.branch_code,
        branchName: branch.branch_name,

        // ข้อมูลลูกค้า
        customerType: stockHistory.customerType || 'individual',
        customerInfo: this.prepareCustomerInfo(stockHistory),

        // รายการสินค้า/บริการ
        items: this.prepareItems(stockHistory.items),

        // ยอดเงิน
        subTotal: stockHistory.sub_total || this.calculateSubTotal(stockHistory.items),
        discountAmount: stockHistory.discount || 0,
        vatAmount: stockHistory.vat_amount || 0,
        grandTotal: stockHistory.net_amount || stockHistory.total_amount || 0,

        // ประเภทภาษี
        taxType: stockHistory.taxType || 'แยกภาษี',

        // การชำระเงิน
        paymentDetails: this.preparePaymentDetails(stockHistory, options),

        // ข้อมูลอ้างอิง
        reference: {
          type: this.getReferenceType(stockHistory.reason),
          invoiceNo: stockHistory.invoice_no,
          installmentId: stockHistory.installment_id,
          contractNo: stockHistory.contract_no,
          orderId: stockHistory.order_id,
          branchStockHistoryId: stockHistory._id
        },

        // ข้อมูลพนักงาน
        staffInfo: {
          staffId: stockHistory.performed_by?._id,
          staffName: stockHistory.staff_name || stockHistory.performed_by?.name,
          staffEmail: stockHistory.performed_by?.email
        },

        // อื่นๆ
        reason: stockHistory.reason,
        remarks: options.remarks || `สร้างอัตโนมัติจาก ${stockHistory.reason || 'การขาย'}`,
        status: 'active',

        // Metadata
        createdBy: stockHistory.performed_by?._id || options.userId,
        createdAt: new Date(),
        isAutoGenerated: true
      };

      // 7. สร้างใบสำคัญรับเงิน
      const receiptVoucher = new ReceiptVoucher(receiptData);
      const savedReceipt = await receiptVoucher.save({ session });

      // 8. อัปเดต BranchStockHistory
      stockHistory.receiptVoucherId = savedReceipt._id;
      stockHistory.hasReceiptVoucher = true;
      await stockHistory.save({ session });

      // 9. Commit transaction
      await session.commitTransaction();

      console.log(`✅ สร้างใบสำคัญรับเงินสำเร็จ: ${savedReceipt.documentNumber}`);

      return {
        success: true,
        message: `สร้างใบสำคัญรับเงิน ${savedReceipt.documentNumber} สำเร็จ`,
        data: savedReceipt
      };

    } catch (error) {
      await session.abortTransaction();
      console.error('❌ Error creating receipt voucher:', error);

      return {
        success: false,
        error: error.message,
        details: error
      };

    } finally {
      session.endSession();
    }
  }

  /**
   * เตรียมข้อมูลลูกค้า
   */
  static prepareCustomerInfo(stockHistory) {
    if (stockHistory.customerType === 'corporate' && stockHistory.corporateInfo) {
      return {
        type: 'corporate',
        name: stockHistory.corporateInfo.companyName || 'บริษัทไม่ระบุชื่อ',
        taxId: stockHistory.corporateInfo.taxId,
        branch: stockHistory.corporateInfo.branch || 'สำนักงานใหญ่',
        address: stockHistory.corporateInfo.address,
        phone: stockHistory.corporateInfo.phone,
        email: stockHistory.corporateInfo.email,
        contactPerson: stockHistory.corporateInfo.contactPerson
      };
    } else {
      // Default to individual
      const info = stockHistory.customerInfo || {};
      return {
        type: 'individual',
        name: info.name || 'ลูกค้าทั่วไป',
        taxId: info.taxId,
        address: info.address,
        phone: info.phone,
        email: info.email,
        idCard: info.idCard
      };
    }
  }

  /**
   * เตรียมรายการสินค้า
   */
  static prepareItems(items) {
    if (!Array.isArray(items)) return [];

    return items.map((item, index) => ({
      seq: index + 1,
      productId: item.product_id,
      productCode: item.sku || item.barcode || '',
      productName: item.name || 'สินค้าไม่ระบุชื่อ',
      quantity: item.qty || 1,
      unit: item.unit || 'ชิ้น',
      unitPrice: item.price || item.sellPrice || 0,
      discount: item.discount || 0,
      amount: (item.qty || 1) * (item.price || item.sellPrice || 0),
      imei: item.imei,
      serialNumber: item.serialNumber,
      poNumber: item.poNumber,
      cost: item.cost || 0
    }));
  }

  /**
   * คำนวณ SubTotal
   */
  static calculateSubTotal(items) {
    if (!Array.isArray(items)) return 0;

    return items.reduce((sum, item) => {
      const qty = item.qty || 1;
      const price = item.price || item.sellPrice || 0;
      return sum + (qty * price);
    }, 0);
  }

  /**
   * เตรียมข้อมูลการชำระเงิน
   */
  static preparePaymentDetails(stockHistory, options) {
    const paymentMethod = options.paymentMethod || this.getPaymentMethod(stockHistory.reason);

    const details = {
      method: paymentMethod,
      amount: stockHistory.net_amount || stockHistory.total_amount || 0,
      receivedAmount: options.receivedAmount || stockHistory.net_amount || 0,
      changeAmount: 0
    };

    // คำนวณเงินทอน
    if (details.receivedAmount > details.amount) {
      details.changeAmount = details.receivedAmount - details.amount;
    }

    // ข้อมูลเพิ่มเติมตามประเภทการชำระ
    if (paymentMethod === 'transfer') {
      details.bankAccount = options.bankAccount;
      details.transferDate = options.transferDate || new Date();
      details.transferRef = options.transferRef;
    } else if (paymentMethod === 'credit_card') {
      details.cardType = options.cardType;
      details.cardNumber = options.cardNumber; // Last 4 digits only
      details.approvalCode = options.approvalCode;
    } else if (paymentMethod === 'installment') {
      details.installmentId = stockHistory.installment_id;
      details.contractNo = stockHistory.contract_no;
      details.downPayment = options.downPayment || 0;
    }

    return details;
  }

  /**
   * กำหนดประเภทการอ้างอิง
   */
  static getReferenceType(reason) {
    const typeMap = {
      'ขาย POS': 'pos_sale',
      'ขายแบบผ่อน': 'installment_sale',
      'บริการ': 'service',
      'ขายออนไลน์': 'online_sale',
      'ขายส่ง': 'wholesale'
    };

    return typeMap[reason] || 'other';
  }

  /**
   * กำหนดวิธีการชำระเงิน
   */
  static getPaymentMethod(reason) {
    if (reason === 'ขายแบบผ่อน') return 'installment';
    return 'cash'; // Default
  }

  /**
   * สร้างเลขที่เอกสาร
   */
  static async generateDocumentNumber(branchCode, date, session) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const yearThai = year + 543; // ปีพุทธศักราช

    // รูปแบบ: RV-BRANCH-YYYYMM-XXXX
    const prefix = `RV-${branchCode}-${yearThai}${month}`;

    // ใช้ Counter collection สำหรับ running number
    // ใช้ key และ reference_value ตามโครงสร้างที่มีอยู่
    const counter = await Counter.findOneAndUpdate(
      {
        key: 'receipt_voucher',
        reference_value: prefix
      },
      { $inc: { seq: 1 } },
      {
        new: true,
        upsert: true,
        session
      }
    );

    const sequence = String(counter.seq).padStart(4, '0');
    return `${prefix}-${sequence}`;
  }

  /**
   * สร้างใบสำคัญรับเงินแบบ Batch
   */
  static async createBatchFromHistories(filters = {}, options = {}) {
    try {
      console.log('🔄 เริ่มสร้างใบสำคัญรับเงินแบบ Batch...');

      // กำหนดเงื่อนไขการค้นหา
      const query = {
        change_type: 'OUT',
        reason: { $in: ['ขาย POS', 'ขายแบบผ่อน', 'บริการ'] },
        hasReceiptVoucher: { $ne: true },
        ...filters
      };

      // ดึงรายการที่ต้องสร้างใบสำคัญรับเงิน
      const histories = await BranchStockHistory.find(query)
        .limit(options.limit || 100)
        .sort({ performed_at: 1 });

      console.log(`📊 พบรายการที่ต้องสร้าง: ${histories.length} รายการ`);

      const results = {
        success: [],
        failed: [],
        total: histories.length
      };

      // สร้างทีละรายการ
      for (const history of histories) {
        try {
          const result = await this.createFromBranchStockHistory(history._id, options);

          if (result.success) {
            results.success.push({
              historyId: history._id,
              documentNumber: result.data.documentNumber
            });
          } else {
            results.failed.push({
              historyId: history._id,
              error: result.error
            });
          }
        } catch (error) {
          results.failed.push({
            historyId: history._id,
            error: error.message
          });
        }

        // Delay เพื่อไม่ให้ระบบทำงานหนักเกินไป
        if (options.delay) {
          await new Promise(resolve => setTimeout(resolve, options.delay));
        }
      }

      console.log(`✅ สร้างสำเร็จ: ${results.success.length}/${results.total}`);
      console.log(`❌ สร้างไม่สำเร็จ: ${results.failed.length}/${results.total}`);

      return results;

    } catch (error) {
      console.error('❌ Batch creation error:', error);
      throw error;
    }
  }

  /**
   * เรียกใช้งาน auto‐creation จากไฟล์แยก
   */
  static async startAutoCreationJob(branchId, types, userId) {
    // เรียก delegate ไปที่ receiptVoucherAutoCreate.js
    const AutoCreateService = require('./receiptVoucherAutoCreate');
    return await AutoCreateService.startAutoCreationJob(branchId, types, userId);
  }
}

module.exports = ReceiptVoucherService;
