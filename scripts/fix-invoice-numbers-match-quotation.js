// scripts/fix-invoice-numbers-match-quotation.js
// Script สำหรับแก้ไขเลขใบแจ้งหนี้ให้ตรงกับเลขใบเสนอราคา (QT-680901-004 → INV-680901-004)

require('dotenv').config();
const mongoose = require('mongoose');
const Invoice = require('../models/Installment/Invoice');

// เชื่อมต่อฐานข้อมูล (ใช้ค่าเริ่มต้นจาก config เดียวกับ server)
async function connectDB() {
  try {
    // อ่าน connection string จาก .env เหมือนกับ server
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/myAccountingDB';

    console.log('🔄 กำลังเชื่อมต่อ MongoDB...');

    // ลองเชื่อมต่อ Atlas ก่อน (ถ้ามี MONGO_URI)
    if (process.env.MONGO_URI) {
      try {
        await mongoose.connect(process.env.MONGO_URI, {
          serverSelectionTimeoutMS: 15000,
          connectTimeoutMS: 20000,
          socketTimeoutMS: 30000,
          maxPoolSize: 5,
          minPoolSize: 1,
          maxIdleTimeMS: 30000,
          family: 4,
          retryWrites: true,
          w: 'majority',
          readPreference: 'primaryPreferred'
        });
        console.log('✅ เชื่อมต่อ MongoDB Atlas สำเร็จ!');
        return;
      } catch (atlasError) {
        console.warn('⚠️ Atlas connection failed, trying local MongoDB...', atlasError.message);
        await mongoose.disconnect();
      }
    }

    // Fallback ไปใช้ local MongoDB
    await mongoose.connect('mongodb://127.0.0.1:27017/myAccountingDB', {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 20000,
      maxPoolSize: 5,
      family: 4
    });

    console.log('✅ เชื่อมต่อ Local MongoDB สำเร็จ!');

  } catch (error) {
    console.error('❌ ไม่สามารถเชื่อมต่อฐานข้อมูล:', error.message);
    process.exit(1);
  }
}

async function fixInvoiceNumbersToMatchQuotation() {
  try {
    console.log('🔧 เริ่มแก้ไขเลขใบแจ้งหนี้ให้ตรงกับเลขใบเสนอราคา...');

    // หาใบแจ้งหนี้ที่มี quotationNumber และ invoiceNumber ไม่ตรงกัน
    const invoices = await Invoice.find({
      quotationNumber: { $exists: true, $ne: null },
      $expr: {
        $ne: [
          { $replaceOne: { input: '$quotationNumber', find: 'QT-', replacement: 'INV-' } },
          '$invoiceNumber'
        ]
      }
    });

    console.log(`📋 พบใบแจ้งหนี้ที่ต้องแก้ไข: ${invoices.length} รายการ`);

    if (invoices.length === 0) {
      return {
        success: true,
        message: 'ไม่มีข้อมูลที่ต้องแก้ไข',
        fixed: 0
      };
    }

    let fixedCount = 0;
    const results = [];

    for (const invoice of invoices) {
      const oldInvoiceNumber = invoice.invoiceNumber;
      const quotationNumber = invoice.quotationNumber;

      // สร้างเลขใบแจ้งหนี้ใหม่จากเลขใบเสนอราคา
      const newInvoiceNumber = quotationNumber.replace('QT-', 'INV-');

      // อัปเดตเลขใบแจ้งหนี้
      await Invoice.updateOne(
        { _id: invoice._id },
        { $set: { invoiceNumber: newInvoiceNumber } }
      );

      results.push({
        id: invoice._id,
        quotationNumber: quotationNumber,
        oldInvoiceNumber: oldInvoiceNumber,
        newInvoiceNumber: newInvoiceNumber
      });

      console.log(`✅ แก้ไข: ${quotationNumber} → ${oldInvoiceNumber} → ${newInvoiceNumber}`);
      fixedCount++;
    }

    console.log(`🎉 แก้ไขเสร็จสิ้น: ${fixedCount} รายการ`);

    return {
      success: true,
      message: `แก้ไขเสร็จสิ้น: ${fixedCount} รายการ`,
      fixed: fixedCount,
      results: results
    };

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
    throw error;
  } finally {
    mongoose.disconnect();
  }
}

// เรียกใช้งาน
async function main() {
  await connectDB();
  await fixInvoiceNumbersToMatchQuotation();
}

main().catch(console.error);
