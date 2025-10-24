// scripts/fix-invoice-numbers.js
// Script สำหรับแก้ไขเลขใบแจ้งหนี้ที่ใช้รูปแบบ QT เป็น INV

const mongoose = require('mongoose');
const Invoice = require('../models/Installment/Invoice');
const Counter = require('../models/POS/Counter');

// เชื่อมต่อฐานข้อมูล (ใช้ค่าเริ่มต้นจาก config)
async function connectDB() {
  try {
    // ใช้ connection string ที่เหมาะสมกับระบบ
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/accounting_db';
    await mongoose.connect(mongoUri);
    console.log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ');
  } catch (error) {
    console.error('❌ ไม่สามารถเชื่อมต่อฐานข้อมูล:', error.message);
    process.exit(1);
  }
}

async function generateNewInvoiceNumber() {
  const now = new Date();
  const thaiYear = now.getFullYear() + 543;
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const DD = String(now.getDate()).padStart(2, '0');
  const dateKey = `INV-${thaiYear}${MM}${DD}`;

  const ctr = await Counter.findOneAndUpdate(
    { key: 'invoice', reference_value: dateKey },
    { $inc: { seq: 1 }, $setOnInsert: { key: 'invoice', reference_value: dateKey } },
    { new: true, upsert: true, strict: false }
  );

  const seqStr = String(ctr.seq).padStart(4, '0');
  return `${dateKey}${seqStr}`;
}

async function fixInvoiceNumbers() {
  try {
    console.log('🔍 กำลังค้นหาใบแจ้งหนี้ที่มีเลขขึ้นต้นด้วย QT...');

    // หาใบแจ้งหนี้ที่มีเลขขึ้นต้นด้วย QT
    const invoicesWithQT = await Invoice.find({
      invoiceNumber: { $regex: /^QT-/ }
    });

    console.log(`📋 พบใบแจ้งหนี้ที่ต้องแก้ไข: ${invoicesWithQT.length} รายการ`);

    if (invoicesWithQT.length === 0) {
      console.log('✅ ไม่มีข้อมูลที่ต้องแก้ไข');
      return;
    }

    let fixedCount = 0;

    for (const invoice of invoicesWithQT) {
      const oldNumber = invoice.invoiceNumber;
      const newNumber = await generateNewInvoiceNumber();

      // อัปเดตเลขใบแจ้งหนี้
      await Invoice.updateOne(
        { _id: invoice._id },
        { $set: { invoiceNumber: newNumber } }
      );

      console.log(`✅ แก้ไข: ${oldNumber} → ${newNumber}`);
      fixedCount++;
    }

    console.log(`🎉 แก้ไขเสร็จสิ้น: ${fixedCount} รายการ`);

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    mongoose.disconnect();
  }
}

// เรียกใช้งาน
async function main() {
  await connectDB();
  await fixInvoiceNumbers();
}

main().catch(console.error);
