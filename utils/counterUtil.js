// File: utils/counterUtil.js
const Counter = require('../models/POS/Counter');

/**
 * getNextSequence
 *  - key: สตริงกำหนด “ชนิด” ของ sequence (เช่น 'product_sku')
 *  - referenceValue: ค่าที่ใช้แยก sequence เช่น branch_code หรือ 'global'
 *  - จะ return ค่า seq (Number) ถัดไป (increment) เสมอ (atomic)
 */
async function getNextSequence(key, referenceValue) {
  const filter = { key, reference_value: referenceValue };

  // upsert: true => ถ้าไม่มี document คู่ (key, reference_value) นี้ จะสร้างขึ้นใหม่
  // $inc: { seq: 1 } => เพิ่ม seq ทีละ 1 แบบ atomic
  const updated = await Counter.findOneAndUpdate(
    filter,
    { $inc: { seq: 1 } },            // ใช้ seq แทน value
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return updated.seq;
}

module.exports = { getNextSequence };
