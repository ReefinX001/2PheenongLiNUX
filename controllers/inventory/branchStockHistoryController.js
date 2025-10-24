// branchStockHistoryController.js
// เพิ่มบรรทัดนี้ด้วย เพื่อนำเข้า InstallmentOrder
const InstallmentOrder = require('../models/Installment/InstallmentOrder');
// เพิ่มบรรทัดนี้ด้วย เพื่อนำเข้า CategoryGroup
const CategoryGroup = require('../models/Stock/CategoryGroup');

const mongoose = require('mongoose');
const Branch = require('../models/Account/Branch');
const BranchStock = require('../models/POS/BranchStock');
const BranchStockHistory = require('../models/POS/BranchStockHistory');
const Supplier = require('../models/Stock/Supplier'); // เพิ่ม import Supplier
const PDFDocument = require('pdfkit'); // สำหรับสร้าง PDF

// นำเข้า PurchaseOrder (เพื่ออัปเดตสถานะ PO)
const PurchaseOrder = require('../models/Stock/purchaseOrderModel'); // ใช้ชื่อที่ถูกต้องและสอดคล้อง
// นำเข้า helper สร้างใบสำคัญรับเงินอัตโนมัติ
const ReceiptVoucherAutoCreate = require('./Services/receiptVoucherAutoCreate');
const config = require('../config/receiptVoucherConfig');

/**
 * ฟังก์ชัน Normalize ภาษาไทย: ตัดวรรณยุกต์ซ้อน (ไม้ไต่คู้ ฯลฯ)
 * และลบ/แทนที่อักขระพิเศษบางตัว (วงเล็บ, ฯลฯ) ก่อนจะ toLowerCase
 */
function normalizeThai(str) {
  // 1) แปลงเป็น NFD, ตัด combining diacritical marks (U+0300 - U+036F)
  let normalized = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // 2) ลบ/แทนที่วงเล็บหลายรูปแบบ (ASCII และ full-width)
  normalized = normalized
    .replace(/[()]/g, '')
    .replace(/[（）]/g, '');
  // 3) toLowerCase + trim
  return normalized.toLowerCase().trim();
}

/**
 * ฟังก์ชันช่วยค้นหา Supplier จากพารามิเตอร์ที่อาจเป็นทั้ง ObjectId หรือ ชื่อ (String)
 */
async function findSupplierByParam(supplierParam) {
  if (!supplierParam) {
    return { success: false, error: 'No supplier provided' };
  }
  if (mongoose.isValidObjectId(supplierParam)) {
    const foundById = await Supplier.findById(supplierParam).lean();
    if (foundById) {
      return { success: true, supplierDoc: foundById };
    }
  }
  const inputName = normalizeThai(supplierParam);
  const allSuppliers = await Supplier.find({}).lean();
  const foundSupplier = allSuppliers.find(sup => {
    const normName = normalizeThai(sup.name);
    return normName.includes(inputName);
  });
  if (!foundSupplier) {
    return { success: false, error: `ไม่พบ Supplier ด้วย name="${supplierParam}"` };
  }
  return { success: true, supplierDoc: foundSupplier };
}

/* ======================================================================================================= */
/* =============================== 1) createHistory (FIFO เดิม) =========================================== */
/* ======================================================================================================= */
exports.createHistory = async (req, res) => {
  const io = req.app.get('io');
  try {
    let {
      branch_code,
      change_type,
      reason,
      performed_by,
      order_id,
      invoice_no,
      invoiceNumber,
      items,
      sale_date,
      staff_name,
      sub_total,
      vat_amount,
      discount,
      total_amount,
      net_amount,
      // ลบ customer_info เดิมออก
      // เพิ่มฟิลด์ใหม่
      customerType,    // 'individual' / 'corporate'
      customerInfo,    // object ข้อมูลลูกค้าบุคคลธรรมดา
      corporateInfo,   // object ข้อมูลลูกค้านิติบุคคล

      supplier,
      installment_id,
      contract_no,
      categoryGroup,
      taxType
    } = req.body;

    // 1) ตรวจสอบฟิลด์บังคับ
    if (!branch_code || !change_type) {
      return res.status(400).json({
        success: false,
        error: 'branch_code และ change_type เป็นฟิลด์บังคับ'
      });
    }
    if (change_type === 'OUT' && !order_id) {
      return res.status(400).json({
        success: false,
        error: 'order_id เป็นฟิลด์บังคับเมื่อ change_type=OUT'
      });
    }
    if (change_type === 'IN' && (!items || items.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'ไม่พบรายการสินค้า (items) สำหรับ IN'
      });
    }

    // 2) ตรวจสอบ supplier (ทำให้เป็น optional)
    let foundSupplier = null;
    if (supplier) {
        const supCheck = await findSupplierByParam(supplier);
        if (!supCheck.success) {
            foundSupplier = null; // ไม่ return error
        } else {
            foundSupplier = supCheck.supplierDoc;
        }
    } else {
        foundSupplier = null;
    }

    // Validate ข้อมูลตามประเภท reason
    if (change_type === 'IN') {
      switch (reason) {
        case 'รับชำระหนี้':
          if (!req.body.debtInvoices || req.body.debtInvoices.length === 0) {
            return res.status(400).json({
              success: false,
              error: 'ต้องระบุเลขที่ใบแจ้งหนี้ที่ต้องการรับชำระ'
            });
          }
          break;
          
        case 'คืนสินค้า':
          if (!req.body.originalInvoice) {
            return res.status(400).json({
              success: false,
              error: 'ต้องระบุเลขที่ใบเสร็จต้นฉบับ'
            });
          }
          break;
          
        case 'รับเงินมัดจำ':
          if (!req.body.depositAmount || req.body.depositAmount <= 0) {
            return res.status(400).json({
              success: false,
              error: 'ต้องระบุจำนวนเงินมัดจำ'
            });
          }
          break;
      }
    }

    // 3) หา branch
    let foundBranch = await Branch.findOne({ branch_code }).lean();
    if (!foundBranch && mongoose.Types.ObjectId.isValid(branch_code)) {
      foundBranch = await Branch.findById(branch_code).lean();
    }
    if (!foundBranch) {
      return res.status(404).json({
        success: false,
        error: `ไม่พบสาขาด้วย branch_code หรือ _id "${branch_code}"`
      });
    }
    const realBranchCode = foundBranch.branch_code;

    // 4) แยก invoiceNumber / invoice_no ตาม change_type
    let docInvoiceNo = '';
    let docInvoiceNum = '';
    if (change_type === 'IN') {
      docInvoiceNum = invoiceNumber || '';
    } else if (change_type === 'OUT') {
      docInvoiceNo = invoice_no || '';
    }

    // 5) อัปเดต invoiceNumber/invoice_no และตั้งค่า remainQty สำหรับ IN
    if (Array.isArray(items)) {
      for (const item of items) {
        if (change_type === 'IN') {
          if (!item.invoiceNumber) item.invoiceNumber = invoiceNumber || '';
          if (item.remainQty == null)   item.remainQty   = item.qty || 1;
        } else if (change_type === 'OUT') {
          if (item.remainQty !== undefined) delete item.remainQty;
          if (!item.invoice_no)            item.invoice_no = invoice_no   || '';
        }
      }
    }

    // 5.1) เติมข้อมูล poNumber, barcode, sku จาก BranchStock
    if (Array.isArray(items)) {
      for (const item of items) {
        if (item.product_id) {
          const bsData = await BranchStock.findOne({
            branch_code: realBranchCode,
            product_id: item.product_id
          }).lean();
          if (bsData) {
            if (!item.poNumber || !item.poNumber.trim()) {
              item.poNumber = bsData.poNumber || '';
            }
            item.barcode = bsData.barcode;
            item.sku = bsData.sku;
          }
        }
      }
    }

    // ---------------------------------------------------------
    // (A) สำหรับ OUT: จับคู่รายการ OUT กับรายการ IN แบบ FIFO
    //     และถ้า poNumber ยังว่างจริง ๆ (""), พยายามดึงจาก inDoc ที่เหลือ remainQty
    // ---------------------------------------------------------
    if (change_type === 'OUT' && Array.isArray(items)) {
      for (const it of items) {
        const neededQty = it.qty || 0;
        if (neededQty <= 0) continue;

        // ถ้ายังไม่มี poNumber ให้ลองหา poNumber จาก inDoc ล่าสุดที่ยังมี remainQty
        if ((!it.poNumber || !it.poNumber.trim()) && it.product_id) {
          const candidateDoc = await BranchStockHistory.findOne({
            branch_code: realBranchCode,
            change_type: 'IN',
            'items.product_id': it.product_id,
            'items.remainQty': { $gt: 0 }
          }).sort({ performed_at: 1 });
          if (candidateDoc && candidateDoc.items) {
            const matchedItem = candidateDoc.items.find(
              x => String(x.product_id) === String(it.product_id) && (x.remainQty || 0) > 0
            );
            if (matchedItem && matchedItem.poNumber) {
              it.poNumber = matchedItem.poNumber;
            }
          }
        }

        if (!it.poNumber || !it.product_id) {
          return res.status(400).json({
            success: false,
            error: `สำหรับการตัดสต๊อก OUT สินค้า product_id=${it.product_id} ไม่มี poNumber ซึ่งจำเป็นต้องจับคู่รายการ IN`
          });
        }

        const inDocs = await BranchStockHistory.find({
          branch_code: realBranchCode,
          change_type: 'IN',
          'items.poNumber': it.poNumber,
          'items.product_id': it.product_id
        }).lean().sort({ performed_at: 1 });

        let remainOut = neededQty;
        const outCostDetails = [];
        for (const doc of inDocs) {
          if (!doc.items) continue;
          let docChanged = false;
          for (const inItem of doc.items) {
            if (
              inItem.poNumber === it.poNumber &&
              String(inItem.product_id) === String(it.product_id)
            ) {
              if (inItem.remainQty == null) {
                inItem.remainQty = inItem.qty;
              }
              if (inItem.remainQty <= 0) continue;
              if (remainOut <= 0) break;
              if (inItem.remainQty >= remainOut) {
                outCostDetails.push({ qty: remainOut, cost: inItem.cost });
                inItem.remainQty -= remainOut;
                remainOut = 0;
              } else {
                outCostDetails.push({ qty: inItem.remainQty, cost: inItem.cost });
                remainOut -= inItem.remainQty;
                inItem.remainQty = 0;
              }
              docChanged = true;
            }
          }
          if (docChanged) {
            const saved = await doc.save();
            io.emit('historyUpdated', {      // ← ชื่อ event เปลี่ยนเป็น historyUpdated
              id: saved._id,
              data: saved
            });
          }
          if (remainOut === 0) break;
        }
        if (remainOut > 0) {
          return res.status(400).json({
            success: false,
            error: `สต็อกไม่พอสำหรับ poNumber=${it.poNumber} (ต้องการ ${neededQty} แต่หาได้ไม่ถึง)`
          });
        }
        let totalQty = 0;
        let sumCost = 0;
        for (const oc of outCostDetails) {
          totalQty += oc.qty;
          sumCost += (oc.qty * oc.cost);
        }
        const avgCost = totalQty > 0 ? (sumCost / totalQty) : 0;
        it.cost = avgCost;
        it.sellPrice = it.price || 0;
      }

      // อัปเดตสถานะใน PurchaseOrder หาก IN หมดสต๊อก
      const poNumbers = [...new Set(items.map(i => i.poNumber))];
      for (const poNumber of poNumbers) {
        if (!poNumber) continue;
        const updatedPO = await PurchaseOrder.findOneAndUpdate(
          { poNumber },
          { isStockDeducted: true, stockDeductedAt: new Date() },
          { new: true }                    // ← ต้องมี new: true
        );
        if (updatedPO) {
          io.emit('purchaseOrderUpdated', { // ← ชื่อ event เปลี่ยนเป็น purchaseOrderUpdated
            id: updatedPO._id,
            data: updatedPO
          });
        }
      }
    }

    // ---------------------------------------------------------
    // (B) สำหรับ OUT: หาก cost เป็น 0 แต่ price > 0 ให้ใช้ price
    // ---------------------------------------------------------
    if (change_type === 'OUT' && Array.isArray(items)) {
      for (const it of items) {
        if ((it.cost || 0) === 0 && (it.price || 0) > 0) {
          it.cost = it.price;
        }
      }
    }

    // 8) สำหรับ IN: เพิ่ม/อัปเดต BranchStock ก่อนบันทึก History
    let stockValueAfter = 0;                // ← ประกาศตัวแปรนี้

    if (change_type === 'IN' && Array.isArray(items)) {
      for (const it of items) {
        const pid   = it.product_id;
        const qtyIn = it.qty || 0;
        if (!pid || qtyIn <= 0) continue;

        // หา BranchStock เดิม
        let existingBS = await BranchStock.findOne({
          branch:      foundBranch._id,
          branch_code: realBranchCode,
          product_id:  pid
        }).lean();

        if (existingBS) {
          existingBS.stock_value   += qtyIn;
          existingBS.last_updated   = new Date();
          if (it.cost       !== undefined) existingBS.cost          = it.cost;
          if (it.price      !== undefined) existingBS.price         = it.price;
          if (it.poNumber)  existingBS.poNumber      = it.poNumber;
          if (it.invoiceNumber) existingBS.invoiceNumber = it.invoiceNumber;
          existingBS.supplier      = foundSupplier._id;
          if (mongoose.isValidObjectId(categoryGroup)) {
            existingBS.categoryGroup = categoryGroup;
          }
          await existingBS.save();
          stockValueAfter = existingBS.stock_value;

        } else {
          const newBS = new BranchStock({
            branch:        foundBranch._id,
            branch_code:   realBranchCode,
            product_id:    pid,
            barcode:       it.barcode       || '',
            sku:           it.sku           || '',
            imei:          it.imei          || '',
            name:          it.name          || '',
            price:         it.price         || 0,
            cost:          it.cost          || 0,
            brand:         it.brand         || '',
            stock_value:   qtyIn,
            updated_by:    performed_by || null,
            last_updated:  new Date(),
            poNumber:      it.poNumber      || '',
            invoiceNumber: it.invoiceNumber || '',
            supplier:      foundSupplier._id,
            categoryGroup: mongoose.isValidObjectId(categoryGroup) ? categoryGroup : null,
            verified:      true        // ← ตั้ง verified เมื่อสร้างใหม่
          });
          await newBS.save();
          stockValueAfter = newBS.stock_value;
        }
      }
    }

    // (D) สร้างประวัติ BranchStockHistory ใหม่
    let sumQty = 0;
    if (Array.isArray(items)) {
      for (const it of items) {
        sumQty += (it.qty || 0);
      }
    }

    let finalInstallmentId = null;
    let finalContractNo = '';
    if (change_type === 'OUT' && reason === 'ขายแบบผ่อน') {
      if (installment_id && mongoose.isValidObjectId(installment_id)) {
        finalInstallmentId = installment_id;
      }
      if (contract_no) {
        finalContractNo = contract_no;
      }
    }

    const finalCategoryGroup = (mongoose.isValidObjectId(categoryGroup)) ? categoryGroup : null;
    // เตรียมค่า taxType: รับค่าจาก req.body ถ้าอยู่ใน enum, ไม่เช่นนั้นใช้ default "แยกภาษี"
    const finalTaxType = (taxType && ['ไม่มีภาษี', 'แยกภาษี', 'รวมภาษี'].includes(taxType))
      ? taxType
      : 'แยกภาษี';

    // สร้าง BranchStockHistory ใหม่
    const newHistory = new BranchStockHistory({
      branch_code:   realBranchCode,
      change_type,
      reason:        reason || '',
      performed_by:  performed_by || (req.user?._id || null),
      performed_at:  new Date(),
      order_id:      (change_type === 'OUT') ? order_id : null,
      invoice_no:    (change_type === 'OUT') ? invoice_no || '' : '',
      invoiceNumber: (change_type === 'IN')  ? invoiceNumber || '' : '',
      installment_id: finalInstallmentId,
      contract_no:   finalContractNo,
      categoryGroup: finalCategoryGroup,
      taxType:       finalTaxType,
      items:         items || [],
      sale_date:     sale_date || null,
      staff_name:    staff_name || '',
      sub_total:     sub_total || 0,
      vat_amount:    vat_amount || 0,
      discount:      discount || 0,
      total_amount:  total_amount || 0,
      net_amount:    net_amount || 0,
      customerType:  customerType || 'individual',
      customerInfo:  (customerType === 'individual') ? (customerInfo || {}) : {},
      corporateInfo: (customerType === 'corporate')  ? (corporateInfo || {}) : {},
      quantity:      sumQty,
      stock_value:   stockValueAfter,   // ← ใช้ค่าที่คำนวณมา
      supplier:      foundSupplier ? foundSupplier._id : null,
      // เพิ่ม fields สำหรับ IN/OUT transactions
      paymentInfo: req.body.paymentInfo || {
        method: req.body.paymentMethod || 'cash',
        bankAccount: req.body.bankAccount,
        originalInvoice: req.body.originalInvoice, // สำหรับคืนสินค้า
        debtInvoices: req.body.debtInvoices || [], // สำหรับรับชำระหนี้
        depositAmount: req.body.depositAmount // สำหรับรับเงินมัดจำ
      }
    });
    const savedHistory = await newHistory.save();

    // Debug: ตรวจสอบเงื่อนไขการสร้างอัตโนมัติ
    

    // Normalize และเช็ค flag ก่อนสร้าง
    const normalizedReason = normalizeThai(reason);
    const autoReasons = config.AUTO_CREATE_REASONS.map(r => normalizeThai(r));

    if (config.AUTO_CREATION_ENABLED && autoReasons.includes(normalizedReason)) {
      // console.log('✅ Auto-create enabled and reason matches:', reason);
      try {
        // Debug: ตรวจสอบข้อมูลที่จะส่งไปสร้าง
        // ข้อมูลสำหรับสร้างใบสำคัญรับเงิน
        
        // จัดการ payment method
        let paymentMethod = 'cash';
if (reason === 'ขายแบบผ่อน') {
  paymentMethod = 'installment';
} else if (reason === 'ขายเชื่อ') {
  paymentMethod = 'credit';
} else if (req.body.paymentMethod) {
  paymentMethod = req.body.paymentMethod;
}

        // เตรียมข้อมูลสำหรับสร้างใบสำคัญรับเงิน
        const saleData = {
          saleType: config.SALE_TYPE_MAPPING[reason],
          branchCode: realBranchCode,
          staffId: performed_by || req.user?._id,
          customerInfo: {
            type: customerType || 'individual',
            name: customerType === 'corporate' 
              ? corporateInfo?.companyName 
              : `${customerInfo?.firstName || ''} ${customerInfo?.lastName || ''}`.trim() || customerInfo?.name || 'ลูกค้าทั่วไป',
            ...(customerType === 'corporate' ? corporateInfo : customerInfo)
          },
          items: items.map(it => ({
            name: it.name,
            description: it.name || it.description || 'สินค้า',
            quantity: it.qty || 1,
            unitPrice: it.price || it.sellPrice || 0,
            amount: (it.qty || 1) * (it.price || it.sellPrice || 0),
            vat: it.vat || 0,
            total: (it.qty || 1) * (it.price || it.sellPrice || 0)
          })),
          totalAmount: net_amount || total_amount || 0,
          subtotal: sub_total || 0,
          vat: vat_amount || 0,
          discount: discount || 0,
          paymentMethod: paymentMethod,
          bankAccount: req.body.bankAccount || null,
          reference: {
            branchStockHistoryId: savedHistory._id,
            invoiceNumber: invoice_no || invoiceNumber || '',
            installmentId: finalInstallmentId,
            contractNo: finalContractNo,
            // เพิ่มสำหรับ IN transactions
            originalInvoice: req.body.originalInvoice,
            debtInvoices: req.body.debtInvoices || []
          },
          taxType: finalTaxType,
          // เพิ่ม fields สำหรับระบุประเภท transaction
          changeType: change_type,
          reason: reason
        };

        // console.log('\n📄 เรียกใช้ ReceiptVoucherAutoCreate.createFromSale...');
        const result = await ReceiptVoucherAutoCreate.createFromSale(saleData);
        
        // console.log('📊 ผลลัพธ์:', {
          success: result.success,
          message: result.message,
          documentNumber: result.data?.documentNumber
        });
        
        if (result.success) {
          // อัพเดท BranchStockHistory
          savedHistory.hasReceiptVoucher = true;
          savedHistory.receiptVoucherId = result.data._id;
          savedHistory.receiptVoucherCreatedAt = new Date();
          await savedHistory.save();

          // ส่ง Socket Event
          io.emit('receiptVoucherCreated', {
            message: `สร้างใบสำคัญรับเงิน ${result.data.documentNumber} อัตโนมัติสำเร็จ`,
            data: result.data,
            branchStockHistoryId: savedHistory._id
          });
          
          // console.log(`✅ สร้างใบสำคัญรับเงิน ${result.data.documentNumber} สำหรับ ${reason} invoice: ${invoice_no}`);
        } else {
          console.error('❌ สร้าง RV อัตโนมัติไม่สำเร็จ:', result.message || result.error);
          
          // Debug: ถ้าเป็นปัญหาผังบัญชี
          if (result.message && result.message.includes('ไม่พบข้อมูลผังบัญชี')) {
            // console.log('\n🔍 ตรวจสอบผังบัญชีในระบบ...');
            const ChartOfAccount = require('../models/Account/ChartOfAccount');
            
            // ตรวจสอบบัญชีเดบิต
            const debitCode = config.DEBIT_ACCOUNT_MAPPING[paymentMethod] || config.DEBIT_ACCOUNT_MAPPING['cash'];
            const debitAccount = await ChartOfAccount.findOne({ code: debitCode }).lean();
            // console.log(`- บัญชีเดบิต ${debitCode}:`, debitAccount ? 'พบ ✅' : 'ไม่พบ ❌');
            
            // ตรวจสอบบัญชีเครดิต
            const creditCode = config.CREDIT_ACCOUNT_MAPPING[reason] || '44101';
            const creditAccount = await ChartOfAccount.findOne({ code: creditCode }).lean();
            // console.log(`- บัญชีเครดิต ${creditCode}:`, creditAccount ? 'พบ ✅' : 'ไม่พบ ❌');
            
            // ตรวจสอบบัญชีภาษีขาย
            const vatAccount = await ChartOfAccount.findOne({ code: config.VAT_ACCOUNT }).lean();
            // console.log(`- บัญชีภาษีขาย ${config.VAT_ACCOUNT}:`, vatAccount ? 'พบ ✅' : 'ไม่พบ ❌');
          }
        }
      } catch (e) {
        console.error('❌ Error creating receipt voucher:', e);
        console.error('Stack trace:', e.stack);
        
        // ไม่ throw error เพื่อไม่ให้กระทบการบันทึก history
        io.emit('receiptVoucherError', {
          message: 'ไม่สามารถสร้างใบสำคัญรับเงินอัตโนมัติได้',
          error: e.message,
          branchStockHistoryId: savedHistory._id
        });
      }
    } else {
      // console.log('⏭️ Skip auto-create:', {
        enabled: config.AUTO_CREATION_ENABLED,
        reason,
        matches: autoReasons.includes(normalizedReason)
      });
      if (change_type !== 'OUT') {
        // console.log('   - เหตุผล: change_type ไม่ใช่ OUT');
      } else if (!autoReasons.includes(normalizedReason)) {
        // console.log('   - เหตุผล: reason ไม่อยู่ใน AUTO_CREATE_REASONS');
      }
    }
    // console.log('===== จบการตรวจสอบ =====\n');

    // ส่ง socket event เมื่อสร้างเสร็จ
    io.emit('historyCreated', {      // ← เปลี่ยนชื่อ event เป็น historyCreated
      id:   savedHistory._id,
      data: savedHistory
    });

    return res.json({ success: true, data: savedHistory });
  } catch (err) {
      console.error('createHistory error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
};

exports.getItemsWithoutReceipt = async (req, res) => {
    try {
        const BranchStockHistory = require('../models/POS/BranchStockHistory');
        
        // ✅ แสดงเฉพาะ 5 ประเภทที่ต้องการ (รวมทั้ง IN และ OUT)
        const validReasons = [
            'ขาย POS',      // OUT - ขายสินค้า
            'ขายสด',        // OUT - ขายสินค้า
            'ขายเชื่อ',     // OUT - ขายเชื่อ
            'รับชำระหนี้',   // IN - รับชำระหนี้
            'รับเงินมัดจำ',  // IN - รับเงินมัดจำ
            'คืนสินค้า'      // IN - รับคืนสินค้า
        ];
        
        // ✅ ปรับ query ให้รองรับทั้ง IN และ OUT
        const query = {
            hasReceiptVoucher: { $ne: true },
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
        };
        
        if (req.query.branch_code) {
            query.branch_code = req.query.branch_code;
        }
        
        if (req.query.start_date || req.query.end_date) {
            query.performed_at = {};
            if (req.query.start_date) {
                query.performed_at.$gte = new Date(req.query.start_date);
            }
            if (req.query.end_date) {
                const endDate = new Date(req.query.end_date);
                endDate.setHours(23, 59, 59, 999);
                query.performed_at.$lte = endDate;
            }
        }
        
        const limit = parseInt(req.query.limit) || 100;
        
        const items = await BranchStockHistory.find(query).lean()
            .populate('performed_by', 'name email')
            .limit(limit)
            .sort({ performed_at: -1 })
            .lean();
        
        // ✅ Map reason เป็นชื่อที่แสดงใน UI
        const reasonDisplayMap = {
            'ขาย POS': 'ขายสินค้า',
            'ขายสด': 'ขายสินค้า',
            'ขายเชื่อ': 'ขายเชื่อ',
            'รับชำระหนี้': 'รับชำระหนี้',
            'รับเงินมัดจำ': 'รับเงินมัดจำ',
            'คืนสินค้า': 'รับคืนสินค้า'
        };
        
        const formattedItems = items.map(item => ({
            _id: item._id,
            invoice_no: item.invoice_no || item.invoiceNumber, // ✅ รองรับทั้ง OUT (invoice_no) และ IN (invoiceNumber)
            reason: item.reason,
            reasonDisplay: reasonDisplayMap[item.reason] || item.reason, // ✅ เพิ่มชื่อสำหรับแสดงผล
            change_type: item.change_type, // ✅ เพิ่ม field นี้เพื่อให้ Frontend รู้ว่าเป็น IN/OUT
            net_amount: item.net_amount || item.total_amount || 0,
            total_amount: item.total_amount || 0,
            performed_at: item.performed_at,
            branch_code: item.branch_code,
            staff_name: item.staff_name || item.performed_by?.name,
            customer_name: item.customerInfo?.firstName 
                ? `${item.customerInfo.firstName} ${item.customerInfo.lastName || ''}`.trim()
                : item.corporateInfo?.companyName || 'ลูกค้าทั่วไป',
            customerType: item.customerType,
            customerInfo: item.customerInfo,
            corporateInfo: item.corporateInfo,
            items: item.items || []
        }));
        
        // ✅ Debug log
        // console.log(`📊 รายการที่รอสร้างใบสำคัญรับเงิน: ${formattedItems.length} รายการ`);
        // console.log(`📋 ประเภท:`, [...new Set(items.map(i => `${i.change_type}: ${i.reason}`))]);
        
        res.json({
            success: true,
            data: formattedItems,
            total: formattedItems.length
        });
        
    } catch (error) {
        console.error('Error fetching items without receipt:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/* ========================= getAllHistory ========================= */
exports.getAllHistory = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { type, branch_code } = req.query;
    const filter = {
      reason: { $in: ["ขาย POS", "ขายแบบผ่อน"] }
    };
    if (branch_code && branch_code !== 'all') {
      filter.branch_code = branch_code;
    }
    const now = new Date();
    let startDate = null;
    if (type === 'daily') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (type === 'weekly') {
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
    } else if (type === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    } else if (type === 'yearly') {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    }
    if (startDate) {
      filter.performed_at = { $gte: startDate };
    }
    const histories = await BranchStockHistory.find(filter).lean()
      .populate('supplier', 'name')
      .populate('performed_by', 'name')
      .populate('categoryGroup', 'name')
      .sort({ performed_at: -1 });
    return res.json({ success: true, data: histories });
  } catch (err) {
    console.error('getAllHistory error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

/* ========================= getHistoryByBranch ========================= */
exports.getHistoryByBranch = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { branchId } = req.params;
    if (!branchId) {
      return res.status(400).json({ success: false, error: 'Invalid branchId' });
    }
    const histories = await BranchStockHistory.find({ branch_code: branchId }).lean()
      .populate('supplier', 'name')
      .populate('performed_by', 'name')
      .populate('categoryGroup', 'name')
      .sort({ performed_at: -1 });
    return res.json({ success: true, data: histories });
  } catch (err) {
    console.error('getHistoryByBranch error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

/* ========================= getHistoryByProduct ========================= */
exports.getHistoryByProduct = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, error: 'Invalid productId' });
    }
    const histories = await BranchStockHistory.find({ 'items.product_id': productId }).lean()
      .populate('supplier', 'name')
      .populate('performed_by', 'name')
      .populate('categoryGroup', 'name')
      .sort({ performed_at: -1 });
    return res.json({ success: true, data: histories });
  } catch (err) {
    console.error('getHistoryByProduct error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

/* ========================= deleteHistory ========================= */
exports.deleteHistory = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    const doc = await BranchStockHistory.findByIdAndDelete(id);

    io.emit('branchstockhistoryDeleted', {
      id: doc._id,
      data: doc
    });

    

    if (!doc) {
      return res.status(404).json({ success: false, error: 'History not found' });
    }
    return res.json({ success: true, data: doc });
  } catch (err) {
    console.error('deleteHistory error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

/* ========================= getStockSummary ========================= */
exports.getStockSummary = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { start, end, branch_code, mode } = req.query;
    if (!start || !end) {
      return res.status(400).json({
        success: false,
        error: 'ต้องระบุ start และ end (รูปแบบ YYYY-MM-DD)'
      });
    }
    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);
    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({
        success: false,
        error: 'รูปแบบวันที่ไม่ถูกต้อง'
      });
    }
    const filter = { performed_at: { $gte: startDate, $lte: endDate } };
    if (branch_code && branch_code !== 'all') {
      filter.branch_code = branch_code;
    }
    const results = await BranchStockHistory.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$change_type',
          totalQty: { $sum: '$quantity' }
        }
      }
    ]);
    let stock_in = 0;
    let stock_out = 0;
    results.forEach(r => {
      if (r._id === 'IN') {
        stock_in = r.totalQty;
      } else if (r._id === 'OUT') {
        stock_out = r.totalQty;
      }
    });
    if (mode === 'inOnly') {
      stock_out = 0;
    } else if (mode === 'outOnly') {
      stock_in = 0;
    }
    return res.json({
      success: true,
      data: { stock_in, stock_out }
    });
  } catch (err) {
    console.error('getStockSummary error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* ========================= getSalesRevenue ========================= */
exports.getSalesRevenue = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { branch_code, start, end } = req.query;
    const filter = { change_type: 'OUT' };
    if (branch_code && branch_code !== 'all') {
      filter.branch_code = branch_code;
    }
    if (start || end) {
      filter.sale_date = {};
      if (start) {
        filter.sale_date.$gte = new Date(start);
      }
      if (end) {
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);
        filter.sale_date.$lte = endDate;
      }
    }
    const result = await BranchStockHistory.aggregate([
      { $match: filter },
      { $group: { _id: null, totalSales: { $sum: "$net_amount" } } }
    ]);
    const totalSales = result.length > 0 ? result[0].totalSales : 0;
    return res.json({ success: true, data: { totalSales } });
  } catch (err) {
    console.error("getSalesRevenue error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};



/**
 * GET /api/branch-stock-history/in-po-numbers
 * ดึงข้อมูล poNumber ของรายการสินค้าเข้า (IN)
 */
exports.getInPoNumbers = async (req, res) => {
  const io = req.app.get('io');
  try {
    const results = await BranchStockHistory.aggregate([
      { $match: { change_type: 'IN' } },
      { $unwind: '$items' },
      { $match: { 'items.poNumber': { $ne: '' } } },
      {
        $group: {
          _id: null,
          poNumbers: { $addToSet: '$items.poNumber' }
        }
      }
    ]);
    const poNumbers = (results.length > 0) ? results[0].poNumbers : [];
    return res.json({ success: true, data: poNumbers });
  } catch (err) {
    console.error('Error fetching IN poNumbers:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/branch-stock-history/in-invoice-numbers
 * ดึง invoiceNumber ของสินค้าเข้า (IN)
 */
exports.getInInvoiceNumbers = async (req, res) => {
  const io = req.app.get('io');
  try {
    const results = await BranchStockHistory.aggregate([
      { $match: { change_type: 'IN', invoiceNumber: { $ne: '' } } },
      {
        $group: {
          _id: null,
          invoiceNumbers: { $addToSet: '$invoiceNumber' }
        }
      }
    ]);
    const invoiceNumbers = (results.length > 0) ? results[0].invoiceNumbers : [];
    return res.json({ success: true, data: invoiceNumbers });
  } catch (err) {
    console.error('getInInvoiceNumbers error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/branch-stock-history/in-cost
 * ดึงต้นทุน (cost) ของสินค้าเข้า (IN)
 */
exports.getincost = async (req, res) => {
  const io = req.app.get('io');
  try {
    const results = await BranchStockHistory.aggregate([
      { $match: { change_type: 'IN', invoiceNumber: { $ne: '' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: null,
          costSet: { $addToSet: '$items.cost' }
        }
      }
    ]);
    const costSet = (results.length > 0) ? results[0].costSet : [];
    return res.json({ success: true, data: costSet });
  } catch (err) {
    console.error('getincost error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/branch-stock-history/out-invoice-nos
 * ดึง invoice_no ของสินค้าออก (OUT)
 */
exports.getOutInvoiceNos = async (req, res) => {
  const io = req.app.get('io');
  try {
    const results = await BranchStockHistory.aggregate([
      { $match: { change_type: 'OUT', invoice_no: { $ne: '' } } },
      {
        $group: {
          _id: null,
          invoiceNos: { $addToSet: '$items.invoice_no' }
        }
      }
    ]);
    const invoiceNos = (results.length > 0) ? results[0].invoiceNos : [];
    return res.json({ success: true, data: invoiceNos });
  } catch (err) {
    console.error('getOutInvoiceNos error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/branch-stock-history/out-Price
 * ดึงราคาขาย (price) ของสินค้าออก (OUT)
 */
exports.getOutPrice = async (req, res) => {
  const io = req.app.get('io');
  try {
    const results = await BranchStockHistory.aggregate([
      { $match: { change_type: 'OUT', invoice_no: { $ne: '' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: null,
          priceSet: { $addToSet: '$items.price' }
        }
      }
    ]);
    const priceSet = (results.length > 0) ? results[0].priceSet : [];
    return res.json({ success: true, data: priceSet });
  } catch (err) {
    console.error('getOutPrice error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* ======================================================================================================= */
/* ==================== NEW: Export PDF Endpoint ==================== */
/* ======================================================================================================= */
exports.exportPdf = async (req, res) => {
  const io = req.app.get('io');
  try {
    const reportData = await getReportData();
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');
    doc.pipe(res);
    doc.fontSize(20).text('รายงานการเงิน', { align: 'center' });
    doc.moveDown();
    reportData.forEach(item => {
      doc.fontSize(12).text(`${item.name}: ${item.amount.toLocaleString()} บาท`);

      io.emit('resourcefunction toLocaleString() { [native code] }', {
        id: item.amount.toLocaleString()._id,
        data: item.amount.toLocaleString()
      });

      
    });
    doc.end();
  } catch (err) {
    console.error("Export PDF error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

async function getReportData() {
  return [
    { name: 'รายได้', amount: 100000 },
    { name: 'ค่าใช้จ่าย', amount: 50000 },
    { name: 'กำไรสุทธิ', amount: 50000 }
  ];
}

/* ======================================================================================================= */
/* ==================== NEW: Tax PN50 Endpoint ==================== */
/* ======================================================================================================= */
exports.taxPn50 = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { branch_code, start, end } = req.query;
    const filter = { change_type: 'OUT' };
    if (branch_code && branch_code !== 'all') {
      filter.branch_code = branch_code;
    }
    if (start || end) {
      filter.performed_at = {};
      if (start) {
        filter.performed_at.$gte = new Date(start);
      }
      if (end) {
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);
        filter.performed_at.$lte = endDate;
      }
    }
    const result = await BranchStockHistory.aggregate([
      { $match: filter },
      { $group: { _id: null, totalNet: { $sum: "$net_amount" } } }
    ]);
    const totalNet = result.length > 0 ? result[0].totalNet : 0;
    const taxRate = 0.20;
    const tax = totalNet * taxRate;
    return res.json({
      success: true,
      data: {
        message: 'Tax PN50 คำนวณจากยอดขายทั้งหมด',
        details: { totalNet, taxRate, totalTax: tax, reportDate: new Date() }
      }
    });
  } catch (err) {
    console.error("taxPn50 error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* ======================================================================================================= */
/* ==================== NEW: Tax PN30 Endpoint ========================= */
/* ======================================================================================================= */
exports.taxPn30 = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { branch_code, start, end } = req.query;
    const filter = { change_type: 'OUT' };
    if (branch_code && branch_code !== 'all') {
      filter.branch_code = branch_code;
    }
    if (start || end) {
      filter.performed_at = {};
      if (start) {
        filter.performed_at.$gte = new Date(start);
      }
      if (end) {
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);
        filter.performed_at.$lte = endDate;
      }
    }
    const result = await BranchStockHistory.aggregate([
      { $match: filter },
      { $group: { _id: null, totalNet: { $sum: "$net_amount" } } }
    ]);
    const totalNet = result.length > 0 ? result[0].totalNet : 0;
    const taxRate = 0.07;
    const tax = totalNet * taxRate;
    return res.json({
      success: true,
      data: {
        message: 'Tax PN30 คำนวณจากยอดขายทั้งหมด',
        details: { totalNet, taxRate, totalTax: tax, reportDate: new Date() }
      }
    });
  } catch (err) {
    console.error("taxPn30 error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* ======================================================================================================= */
/* ==================== NEW: Tax PN D1 Endpoint (ภงด. 1,3,53) ========================= */
/* ======================================================================================================= */
exports.taxPnD1 = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { branch_code, start, end } = req.query;
    const filter = { change_type: 'OUT' };
    if (branch_code && branch_code !== 'all') {
      filter.branch_code = branch_code;
    }
    if (start || end) {
      filter.performed_at = {};
      if (start) {
        filter.performed_at.$gte = new Date(start);
      }
      if (end) {
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);
        filter.performed_at.$lte = endDate;
      }
    }
    const result = await BranchStockHistory.aggregate([
      { $match: filter },
      { $group: { _id: null, totalNet: { $sum: "$net_amount" } } }
    ]);
    const totalNet = result.length > 0 ? result[0].totalNet : 0;
    const taxRate = 0.05;
    const tax = totalNet * taxRate;
    return res.json({
      success: true,
      data: {
        message: 'Tax PN D1 คำนวณจากยอดขายทั้งหมด',
        details: { totalNet, taxRate, totalTax: tax, reportDate: new Date() }
      }
    });
  } catch (err) {
    console.error("taxPnD1 error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/branch-stock-history/out-items
 * Query params: branch_code
 * Returns array of { poNumber, sku, imei } ที่ถูกออกไปแล้ว
 */
exports.getOutItems = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { branch_code } = req.query;
    if (!branch_code) {
      return res.status(400).json({ success: false, error: 'branch_code is required' });
    }

    const docs = await BranchStockHistory.find({
      branch_code,
      change_type: 'OUT',
      'items.poNumber': { $ne: '' },
      'items.imei':     { $ne: '' }
    }).lean();

    const outItems = [];
    docs.forEach(doc =>
      (doc.items || []).forEach(item => {
        if (item.poNumber && item.imei) {
          outItems.push({
            poNumber: item.poNumber,
            sku:      item.sku,
            imei:     item.imei
          });
        }
      })
    );

    return res.json({ success: true, data: outItems });
  } catch (err) {
    console.error('getOutItems error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
