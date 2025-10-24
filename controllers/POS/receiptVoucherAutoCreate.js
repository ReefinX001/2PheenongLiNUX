// services/receiptVoucherAutoCreate.js
const ReceiptVoucher = require('../../models/POS/ReceiptVoucher');
const ChartOfAccount = require('../../models/Account/ChartOfAccount');
const Branch = require('../../models/Account/Branch'); // เพิ่ม import Branch
const config = require('../../config/receiptVoucherConfig');
const mongoose = require('mongoose');

class ReceiptVoucherAutoCreate {
  // สร้างใบสำคัญรับเงินจากการขาย (รองรับทั้ง OUT และ IN)
  static async createFromSale(saleData) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const {
        saleType,
        branchCode,
        branchId, // รับ branchId ด้วย (ถ้ามี)
        staffId,
        customerInfo,
        items,
        totalAmount,
        subtotal,
        vat,
        discount,
        paymentMethod,
        bankAccount,
        reference,
        taxType,
        changeType,  // เพิ่ม field นี้
        reason       // เพิ่ม field นี้
      } = saleData;

      // หา branch._id จาก branchCode ถ้ายังไม่มี branchId
      let finalBranchId = branchId;
      if (!finalBranchId && branchCode) {
        const branch = await Branch.findOne({
          $or: [
            { branch_code: branchCode },
            { code: branchCode }
          ]
        }).session(session);

        if (!branch) {
          throw new Error(`ไม่พบสาขาด้วย code: ${branchCode}`);
        }

        finalBranchId = branch._id;
      }

      // ตรวจสอบว่ามีใบสำคัญรับเงินสำหรับรายการนี้หรือยัง (หลายวิธี)
      const existing = await ReceiptVoucher.findOne({
        $or: [
          { 'reference.branchStockHistoryId': reference.branchStockHistoryId },
          { 'reference.invoiceNumber': reference.invoiceNumber },
          { notes: { $regex: reference.invoiceNumber || '', $options: 'i' } }
        ]
      }).session(session);

      if (existing) {
        await session.abortTransaction();
        session.endSession();

        // อัพเดท hasReceiptVoucher ใน BranchStockHistory
        const BranchStockHistory = require('../../models/POS/BranchStockHistory');
        await BranchStockHistory.findByIdAndUpdate(reference.branchStockHistoryId, {
          hasReceiptVoucher: true,
          receiptVoucherId: existing._id,
          receiptVoucherCreatedAt: existing.createdAt
        });

        return {
          success: false,
          message: 'ใบสำคัญรับเงินถูกสร้างไปแล้ว',
          existingDocument: existing.documentNumber,
          alreadyExists: true
        };
      }

      // สร้างเลขที่เอกสารตามประเภท - ส่ง branchId แทน branchCode
      const documentNumber = await this.generateDocumentNumberByType(saleType, finalBranchId, session);

      // หาบัญชีที่จะใช้ตาม reason และ changeType
      let debitAccount, creditAccount;

      // ใช้ config helpers ถ้ามี
      if (config.helpers) {
        const debitCode = config.helpers.getDebitAccount(reason, paymentMethod);
        const creditCode = config.helpers.getCreditAccount(reason, paymentMethod);

        debitAccount = await ChartOfAccount.findOne({ code: debitCode }).lean().session(session);
        creditAccount = await ChartOfAccount.findOne({ code: creditCode }).lean().session(session);
      } else {
        // Fallback: ใช้ logic เดิม แต่เพิ่มการจัดการ IN transactions
        if (changeType === 'IN') {
          // จัดการ IN transactions
          switch (reason) {
            case 'รับชำระหนี้':
              debitAccount = await ChartOfAccount.findOne({
                code: paymentMethod === 'transfer' ? '11103' : '11101'
              }).session(session);
              creditAccount = await ChartOfAccount.findOne({ code: '11301' }).lean().session(session);
              break;

            case 'รับเงินมัดจำ':
              debitAccount = await ChartOfAccount.findOne({
                code: paymentMethod === 'transfer' ? '11103' : '11101'
              }).session(session);
              creditAccount = await ChartOfAccount.findOne({ code: '21104' }).lean().session(session);
              break;

            case 'คืนสินค้า':
              debitAccount = await ChartOfAccount.findOne({ code: '44103' }).lean().session(session);
              creditAccount = await ChartOfAccount.findOne({
                code: paymentMethod === 'transfer' ? '11103' : '11101'
              }).session(session);
              break;

            default:
              throw new Error(`ไม่รู้จักประเภท IN transaction: ${reason}`);
          }
        } else {
          // OUT transactions (logic เดิม)
          debitAccount = await this.getDebitAccount(paymentMethod, session);
          creditAccount = await this.getCreditAccount(saleType, session);
        }
      }

      if (!debitAccount || !creditAccount) {
        await session.abortTransaction();
        session.endSession();
        return {
          success: false,
          message: `ไม่พบข้อมูลผังบัญชีที่จำเป็น: Debit(${debitAccount ? 'มี' : 'ไม่มี'}) Credit(${creditAccount ? 'มี' : 'ไม่มี'})`
        };
      }

      // สร้างรายการบัญชี
      const journalItems = [];

      // จัดการ journal entries ตาม transaction type
      if (changeType === 'IN' && reason === 'คืนสินค้า') {
        // กรณีรับคืนสินค้า: Dr.รับคืนสินค้า Cr.เงินสด/ธนาคาร
        journalItems.push({
          account_code: debitAccount.code,
          account_name: debitAccount.name,
          debit_amount: totalAmount,
          credit_amount: 0,
          description: 'รับคืนสินค้า'
        });

        journalItems.push({
          account_code: creditAccount.code,
          account_name: creditAccount.name,
          debit_amount: 0,
          credit_amount: totalAmount,
          description: 'จ่ายคืนเงินให้ลูกค้า'
        });
      } else {
        // กรณีอื่นๆ: Dr.เงินสด/ธนาคาร/ลูกหนี้ Cr.รายได้/หนี้สิน
        journalItems.push({
          account_code: debitAccount.code,
          account_name: debitAccount.name,
          debit_amount: totalAmount,
          credit_amount: 0,
          description: this.getDebitDescription(reason, saleType)
        });

        // Credit - รายได้ (ยอดก่อน VAT) หรือหนี้สิน
        const amountBeforeVat = totalAmount - (vat || 0);
        journalItems.push({
          account_code: creditAccount.code,
          account_name: creditAccount.name,
          debit_amount: 0,
          credit_amount: amountBeforeVat,
          description: this.getCreditDescription(reason, saleType)
        });

        // Credit - ภาษีขาย (ถ้ามี)
        if (vat && vat > 0 && changeType === 'OUT') {
          const vatAccount = await ChartOfAccount.findOne({ code: config.VAT_ACCOUNT }).lean().session(session);
          if (vatAccount) {
            journalItems.push({
              account_code: vatAccount.code,
              account_name: vatAccount.name,
              debit_amount: 0,
              credit_amount: vat,
              description: 'ภาษีมูลค่าเพิ่ม 7%'
            });
          }
        }
      }

      // จัดเตรียมข้อมูลลูกค้า
      const receivedFrom = customerInfo.type === 'corporate'
        ? customerInfo.companyName || customerInfo.name
        : customerInfo.name || 'ลูกค้าทั่วไป';

      // map receiptType ให้ถูกต้อง
      const receiptType = this.mapReceiptType(reason || saleType);

      // สร้างใบสำคัญรับเงิน - ใช้ finalBranchId แทน branchCode
      const receiptVoucher = new ReceiptVoucher({
        documentNumber: documentNumber,
        paymentDate: new Date(),
        debitAccount: {
          code: debitAccount.code,
          name: debitAccount.name
        },
        creditAccount: {
          code: creditAccount.code,
          name: creditAccount.name
        },
        receivedFrom: receivedFrom,
        receiptType: receiptType,
        paymentMethod: paymentMethod,
        bankAccount: bankAccount,
        totalAmount: totalAmount,
        notes: `สร้างอัตโนมัติจาก ${reason || this.getReasonText(saleType)} - Invoice: ${reference.invoiceNumber || 'N/A'}`,
        status: 'completed',
        reference: reference,
        createdBy: staffId,
        branch: finalBranchId, // ← ใช้ ObjectId แทน string
        customerType: customerInfo.type || 'individual',
        customerInfo: customerInfo.type === 'individual' ? customerInfo : {},
        corporateInfo: customerInfo.type === 'corporate' ? customerInfo : {},
        items: items || [],
        journalItems: journalItems,
        is_auto_created: true,
        approved_by: 'system',
        approved_date: new Date()
      });

      const savedReceipt = await receiptVoucher.save({ session });

      // ทันทีหลังสร้าง ให้ mark hasReceiptVoucher = true ใน BranchStockHistory
      const BranchStockHistory = require('../../models/POS/BranchStockHistory');
      await BranchStockHistory.findByIdAndUpdate(reference.branchStockHistoryId, {
        hasReceiptVoucher: true,
        receiptVoucherId: savedReceipt._id,
        receiptVoucherCreatedAt: new Date()
      }, { session });

      await session.commitTransaction();
      session.endSession();

      // console.log(`✅ Auto created receipt voucher: ${documentNumber} for ${reason || saleType} - Marked hasReceiptVoucher: true`);

      return {
        success: true,
        data: savedReceipt,
        message: `สร้างใบสำคัญรับเงิน ${documentNumber} สำเร็จ`
      };

    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error('Error in auto create receipt voucher:', error);
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }

  // สร้างใบสำคัญรับเงินแบบ Batch (อัพเดทให้รองรับ IN transactions)
  static async createBatch(branchId, options = {}) {
    const BranchStockHistory = require('../../models/POS/BranchStockHistory');
    const AutoCreationLog = require('../../models/POS/AutoCreationLog');

    const {
      types = ['cashSale', 'creditSale', 'debtPayment', 'deposit', 'return'],
      limit = 100,
      startDate,
      endDate,
      userId,
      onProgress
    } = options;

    const jobId = `BATCH_${Date.now()}`;

    // สร้าง log
    const log = new AutoCreationLog({
      branchId,
      jobId,
      type: options.jobType || 'manual',
      status: 'running',
      startedAt: new Date(),
      createdBy: userId,
      parameters: { types, limit, startDate, endDate }
    });
    await log.save();

    try {
      // Query สำหรับหารายการที่ยังไม่มีใบสำคัญรับเงิน
      const query = {
        branch_code: branchId,
        hasReceiptVoucher: { $ne: true },
        $or: []
      };

      // Map types to reasons พร้อมกำหนด change_type
      const typeReasonMap = {
        cashSale: { changeType: 'OUT', reasons: ['ขาย POS', 'ขายสด'] },
        creditSale: { changeType: 'OUT', reasons: ['ขายเชื่อ'] },
        debtPayment: { changeType: 'IN', reasons: ['รับชำระหนี้'] },
        deposit: { changeType: 'IN', reasons: ['รับเงินมัดจำ'] },
        return: { changeType: 'IN', reasons: ['คืนสินค้า'] },
        installment: { changeType: 'OUT', reasons: ['ขายแบบผ่อน'] },
        service: { changeType: 'OUT', reasons: ['บริการ'] }
      };

      // สร้าง query conditions ตาม types
      types.forEach(type => {
        const typeConfig = typeReasonMap[type];
        if (typeConfig) {
          query.$or.push({
            change_type: typeConfig.changeType,
            reason: { $in: typeConfig.reasons }
          });
        }
      });

      if (query.$or.length === 0) {
        // Default: รวมทุกประเภท
        Object.values(typeReasonMap).forEach(config => {
          query.$or.push({
            change_type: config.changeType,
            reason: { $in: config.reasons }
          });
        });
      }

      // เพิ่มเงื่อนไขวันที่
      if (startDate || endDate) {
        query.performed_at = {};
        if (startDate) query.performed_at.$gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          query.performed_at.$lte = end;
        }
      }

      // ดึงรายการที่ต้องสร้าง
      const pendingItems = await BranchStockHistory
        .find(query).lean()
        .limit(limit)
        .sort({ performed_at: 1 });

      log.total = pendingItems.length;
      if (pendingItems.length === 0) {
        log.status = 'completed';
        log.completedAt = new Date();
        log.duration = log.completedAt - log.startedAt;
        log.message = 'ไม่พบรายการที่ต้องดำเนินการ';
        await log.save();
        return { success: true, jobId, results: { success: 0, failed: 0, skipped: 0, errors: [] }, log };
      }
      await log.save();

      // console.log(`📋 Job ${jobId}: Found ${pendingItems.length} items to process`);

      const results = {
        success: 0,
        failed: 0,
        skipped: 0,
        errors: []
      };

      for (let i = 0; i < pendingItems.length; i++) {
        const item = pendingItems[i];
        const currentItemMessage = `รายการที่ ${i + 1}/${pendingItems.length}: ${item.invoice_no || item.invoiceNumber || item._id}`;

        if (typeof onProgress === 'function') {
          onProgress({
            processed: i,
            total: pendingItems.length,
            successCount: results.success,
            failedCount: results.failed,
            skippedCount: results.skipped,
            currentItem: currentItemMessage
          });
        }

        try {
          if (item.hasReceiptVoucher) {
            results.skipped++;
            log.skipped = results.skipped;
            continue;
          }

          const saleData = this.convertHistoryToSaleData(item);
          saleData.staffId = userId || item.performed_by || item.staff_id;

          const result = await this.createFromSale(saleData);

          if (result.success) {
            item.hasReceiptVoucher = true;
            item.receiptVoucherId = result.data._id;
            item.receiptVoucherCreatedAt = new Date();
            await item.save();

            results.success++;
            log.success = results.success;
          } else {
            if (result.message === 'ใบสำคัญรับเงินถูกสร้างไปแล้ว') {
              results.skipped++;
              log.skipped = results.skipped;
            } else {
              results.failed++;
              results.errors.push({
                historyId: item._id,
                invoiceNo: item.invoice_no || item.invoiceNumber,
                error: result.message
              });
              log.failed = results.failed;
            }
          }

        } catch (error) {
          console.error(`Error processing item ${i + 1}:`, error);
          results.failed++;
          results.errors.push({
            historyId: item._id,
            invoiceNo: item.invoice_no || item.invoiceNumber,
            error: error.message
          });
        } finally {
          log.processed = i + 1;
          await log.save();
        }

        if (i % 10 === 0 && i > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      log.status = 'completed';
      log.completedAt = new Date();
      log.duration = log.completedAt - log.startedAt;
      log.message = `สำเร็จ ${results.success}, ล้มเหลว ${results.failed}, ข้าม ${results.skipped}`;
      await log.save();

      return { success: true, jobId, results, log };

    } catch (error) {
      console.error(`Batch creation error:`, error);
      log.status = 'failed';
      log.error = error.message;
      await log.save();
      return { success: false, jobId, error: error.message, log };
    }
  }

  // Helper method: แปลง BranchStockHistory เป็น saleData (อัพเดท)
  static convertHistoryToSaleData(historyItem) {
    const reasonToSaleType = {
      'ขาย POS': 'cash_sale',
      'ขายสด': 'cash_sale',
      'ขายเชื่อ': 'credit_sale',
      'รับชำระหนี้': 'debt_payment',
      'รับเงินมัดจำ': 'deposit',
      'คืนสินค้า': 'return',
      'ขายแบบผ่อน': 'installment',
      'บริการ': 'service'
    };

    const saleType = reasonToSaleType[historyItem.reason] || 'cash_sale';

    // จัดการ staffId ให้เป็น ObjectId หรือ null
    let staffId = null;
    if (historyItem.performed_by && mongoose.Types.ObjectId.isValid(historyItem.performed_by)) {
      staffId = historyItem.performed_by;
    } else if (historyItem.staff_id && mongoose.Types.ObjectId.isValid(historyItem.staff_id)) {
      staffId = historyItem.staff_id;
    }
    // ถ้าไม่มี staffId ที่ valid ให้เป็น null (ไม่ใช่ 'system')

    return {
      saleType: saleType,
      branchCode: historyItem.branch_code,
      staffId: staffId, // ← แก้ไขตรงนี้: ใช้ ObjectId หรือ null
      customerInfo: {
        type: historyItem.customerType || 'individual',
        name: historyItem.customerInfo?.firstName
          ? `${historyItem.customerInfo.firstName} ${historyItem.customerInfo.lastName || ''}`.trim()
          : historyItem.corporateInfo?.companyName || 'ลูกค้าทั่วไป',
        ...(historyItem.customerType === 'corporate' ? historyItem.corporateInfo : historyItem.customerInfo)
      },
      items: (historyItem.items && historyItem.items.length > 0) ? historyItem.items.map(it => ({
        name: it.name || 'สินค้า/บริการ',
        description: it.description || it.name || historyItem.reason || 'รายละเอียดรายการ',
        quantity: it.qty || 1,
        unitPrice: it.price || it.sellPrice || 0,
        amount: (it.qty || 1) * (it.price || it.sellPrice || 0),
        vat: it.vat || 0, // Assuming item-level VAT if available
        // Add other relevant item fields if necessary
      })) : [{
        name: historyItem.reason || 'รายการ',
        description: historyItem.reason || 'รายละเอียดรายการ',
        quantity: 1,
        unitPrice: historyItem.net_amount || historyItem.total_amount || 0,
        amount: historyItem.net_amount || historyItem.total_amount || 0,
        vat: historyItem.vat_amount || 0,
      }],
      totalAmount: historyItem.net_amount || historyItem.total_amount || 0,
      subtotal: historyItem.sub_total || 0,
      vat: historyItem.vat_amount || 0,
      discount: historyItem.discount || 0,
      paymentMethod: historyItem.paymentInfo?.method || (saleType === 'credit_sale' ? 'credit' : 'cash'),
      bankAccount: historyItem.paymentInfo?.bankAccount,
      reference: {
        branchStockHistoryId: historyItem._id.toString(),
        invoiceNumber: historyItem.invoice_no || historyItem.invoiceNumber || '',
        reason: historyItem.reason, // Keep original reason for reference
        originalInvoice: historyItem.paymentInfo?.originalInvoice, // For returns
        debtInvoices: historyItem.paymentInfo?.debtInvoices || [], // For debt payments
        installmentContract: historyItem.contract_no // For installment sales
      },
      taxType: historyItem.taxType || 'ไม่มีภาษี', // Default or from history
      changeType: historyItem.change_type, // Important for context
      reason: historyItem.reason, // Original reason for context
      performedAt: historyItem.performed_at || new Date() // Date of the original transaction
    };
  }

  // ตรวจสอบรายการที่รอสร้าง (อัพเดท)
  static async checkPendingItems(branchId, options = {}) {
    const BranchStockHistory = require('../../models/POS/BranchStockHistory');

    const {
      limit = 10,
      includeDetails = false,
      types = ['cashSale', 'creditSale', 'debtPayment', 'deposit', 'return']
    } = options;

    const query = {
      branch_code: branchId,
      hasReceiptVoucher: { $ne: true },
      $or: []
    };

    const typeReasonMap = {
      cashSale: { changeType: 'OUT', reasons: ['ขาย POS', 'ขายสด'] },
      creditSale: { changeType: 'OUT', reasons: ['ขายเชื่อ'] },
      debtPayment: { changeType: 'IN', reasons: ['รับชำระหนี้'] },
      deposit: { changeType: 'IN', reasons: ['รับเงินมัดจำ'] },
      return: { changeType: 'IN', reasons: ['คืนสินค้า'] },
      installment: { changeType: 'OUT', reasons: ['ขายแบบผ่อน'] },
      service: { changeType: 'OUT', reasons: ['บริการ'] }
    };

    types.forEach(type => {
      const typeConfig = typeReasonMap[type];
      if (typeConfig) {
        query.$or.push({
          change_type: typeConfig.changeType,
          reason: { $in: typeConfig.reasons }
        });
      }
    });

    const totalPending = await BranchStockHistory.countDocuments(query);

    let samples = [];
    if (includeDetails && totalPending > 0) {
      samples = await BranchStockHistory
        .find(query).lean()
        .select('invoice_no invoiceNumber reason customerInfo corporateInfo net_amount total_amount performed_at change_type')
        .limit(limit)
        .sort({ performed_at: -1 });
    }

    return {
      totalPending,
      samples
    };
  }

  // สร้างเลขที่เอกสารตามประเภท - แก้ไขให้รับ branchId แทน branchCode
  static async generateDocumentNumberByType(saleType, branchId, session) {
    const date = new Date();
    const year = String(date.getFullYear()).substr(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');

    // ใช้ prefix จาก config
    const prefix = config.helpers?.getDocumentPrefix(saleType) ||
                  config.DOCUMENT_NUMBER_CONFIG?.PREFIX_BY_TYPE[saleType] ||
                  'RV';

    const docPrefix = `${prefix}${year}${month}`;

    // หาเลขลำดับถัดไป - ใช้ branchId (ObjectId) แทน branchCode (string)
    const count = await ReceiptVoucher.countDocuments({
      documentNumber: new RegExp(`^${docPrefix}`),
      branch: branchId  // ← แก้ไขตรงนี้: ใช้ branchId ที่เป็น ObjectId
    }).session(session);

    const sequence = String(count + 1).padStart(4, '0');
    return `${docPrefix}${sequence}`;
  }

  // Map receipt type
  static mapReceiptType(reason) {
    const mapping = {
      'ขาย POS': 'cash_sale',
      'ขายสด': 'cash_sale',
      'ขายเชื่อ': 'credit_sale',
      'รับชำระหนี้': 'debt_payment',
      'รับเงินมัดจำ': 'deposit',
      'คืนสินค้า': 'return',
      'บริการ': 'service',
      'ขายแบบผ่อน': 'installment'
    };
    return mapping[reason] || 'cash_sale';
  }

  // Get debit description
  static getDebitDescription(reason, saleType) {
    const descriptions = {
      'รับชำระหนี้': 'รับชำระหนี้จากลูกค้า',
      'รับเงินมัดจำ': 'รับเงินมัดจำจากลูกค้า',
      'คืนสินค้า': 'รับคืนสินค้า',
      'ขายเชื่อ': 'ลูกหนี้การค้า'
    };
    return descriptions[reason] || `รับเงินจากการ${saleType === 'service' ? 'บริการ' : 'ขายสินค้า'}`;
  }

  // Get credit description
  static getCreditDescription(reason, saleType) {
    const descriptions = {
      'รับชำระหนี้': 'ลดยอดลูกหนี้การค้า',
      'รับเงินมัดจำ': 'เงินมัดจำรับ',
      'คืนสินค้า': 'จ่ายคืนเงินให้ลูกค้า'
    };
    return descriptions[reason] || (saleType === 'service' ? 'รายได้จากการให้บริการ' : 'รายได้จากการขาย');
  }

  // Helper: สร้างเลขที่เอกสาร (ใช้ method เดิมสำหรับ backward compatibility)
  static async generateDocumentNumber(branchCode, session) {
    // ต้องหา branchId จาก branchCode ก่อน
    const branch = await Branch.findOne({
      $or: [
        { branch_code: branchCode },
        { code: branchCode }
      ]
    }).session(session);

    if (!branch) {
      throw new Error(`ไม่พบสาขา: ${branchCode}`);
    }

    return this.generateDocumentNumberByType('cash_sale', branch._id, session);
  }

  // Helper: get reason text
  static getReasonText(saleType) {
    const texts = {
      'cash_sale': 'ขายสินค้า',
      'credit_sale': 'ขายเชื่อ',
      'debt_payment': 'รับชำระหนี้',
      'deposit': 'รับเงินมัดจำ',
      'return': 'รับคืนสินค้า',
      'service': 'บริการ',
      'installment': 'ขายแบบผ่อน'
    };
    return texts[saleType] || saleType;
  }

  // เพิ่ม method ใหม่สำหรับ OUT transactions (ใช้ logic เดิม)
  static async getDebitAccount(paymentMethod, session) {
    const accountCode = config.DEBIT_ACCOUNT_MAPPING[paymentMethod] ||
                       config.DEBIT_ACCOUNT_MAPPING['cash'];
    return await ChartOfAccount.findOne({ code: accountCode }).lean().session(session);
  }

  static async getCreditAccount(saleType, session) {
    let accountCode;
    switch (saleType) {
      case 'cash_sale':
      case 'installment':
        accountCode = '44101'; // รายได้จากการขาย
        break;
      case 'service':
        accountCode = '44102'; // รายได้จากการให้บริการ
        break;
      case 'deposit':
        accountCode = '21104'; // เงินมัดจำรับ
        break;
      default:
        accountCode = '44101';
    }
    return await ChartOfAccount.findOne({ code: accountCode }).lean().session(session);
  }
}

module.exports = ReceiptVoucherAutoCreate;
