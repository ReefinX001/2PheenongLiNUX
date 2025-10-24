// services/transferService.js
const mongoose    = require('mongoose');
const Transfer    = require('../models/Stock/Transfer');
const BranchStock = require('../models/POS/BranchStock');
const Branch      = require('../models/Account/Branch');

async function createTransfer(data, userId) {
  // debug: ดูว่ารับ items มาเป็นอะไร
  console.log('⚙️ createTransfer got data.items =', data.items);

  // 1) ตรวจสอบว่ามีรายการสินค้าเป็นอาเรย์และมีอย่างน้อย 1 รายการ
  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new Error('ต้องส่งรายการสินค้า (data.items) มาเป็นอาเรย์อย่างน้อย 1 รายการ');
  }

  // 2) เตรียมรูปแบบของ items ให้ตรงกับ schema
  const items = data.items.map(i => {
    const productId = i.product   ?? i.productId;
    const qty       = i.qty       ?? i.quantity;

    if (!productId) {
      throw new Error('Missing productId ในรายการสินค้าอย่างน้อย 1 รายการ');
    }
    if (typeof qty !== 'number') {
      throw new Error('Missing หรือ invalid qty ในรายการสินค้าอย่างน้อย 1 รายการ');
    }
    return { product: productId, qty };
  });

  // หา branch_code จริงจาก ObjectId
  const fromBranchDoc = await Branch.findById(data.fromBranch).select('branch_code').lean();
  const toBranchDoc   = await Branch.findById(data.toBranch).select('branch_code').lean();
  if (!fromBranchDoc?.branch_code) throw new Error(`ไม่พบสาขาต้นทาง id=${data.fromBranch}`);
  if (!toBranchDoc?.branch_code)   throw new Error(`ไม่พบสาขาปลายทาง id=${data.toBranch}`);
  const fromCode = fromBranchDoc.branch_code;
  const toCode   = toBranchDoc.branch_code;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // สร้าง Transfer
    const [transfer] = await Transfer.create([{
      transferNo: data.transferNo, // ต้องเซ็ตมาจาก controller
      date:       data.date,
      fromBranch: data.fromBranch,
      toBranch:   data.toBranch,
      sender:     userId,         // <-- ใช้ userId จาก JWT แทน
      receiver:   data.receiver,
      items,                     // ใส่ items ที่ map แล้ว
      actionType: data.actionType,
      note:       data.note,
      createdBy:  userId
    }], { session });

    // อัปเดต stock (ลดต้นทาง เพิ่มปลายทาง)
    for (const it of items) {
      // 1) ลดสต็อกต้นทาง
      const updatedFrom = await BranchStock.findOneAndUpdate(
        { _id: it.product, branch_code: fromCode },
        { $inc: { stock_value: -it.qty }, updated_by: userId },
        { session, new: true }
      );
      if (!updatedFrom) {
        throw new Error(`ไม่พบสต็อกสินค้า ${it.product} ที่สาขาโค้ด ${fromCode}`);
      }

      // 2) เพิ่ม/สร้างสต็อกปลายทาง (upsert) โดยใช้ sku เป็นตัวระบุ
      await BranchStock.findOneAndUpdate(
        { branch_code: toCode, sku: updatedFrom.sku },
        {
          $inc: { stock_value: +it.qty },
          updated_by: userId,
          $setOnInsert: {
            productModel:   updatedFrom.productModel,
            product_id:     updatedFrom.product_id,
            name:           updatedFrom.name,
            brand:          updatedFrom.brand,
            imei:           updatedFrom.imei,
            price:          updatedFrom.price,
            cost:           updatedFrom.cost,
            categoryGroup:  updatedFrom.categoryGroup,
            unit:           updatedFrom.unit,
            // …ฟิลด์อื่นๆ ตาม schema…
          }
        },
        { upsert: true, new: true, session }
      );
    }

    // Commit transaction และ return เอกสาร
    await session.commitTransaction();
    session.endSession();
    return transfer;
  } catch (err) {
    // Rollback ถ้ามี error
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

module.exports = { createTransfer };
