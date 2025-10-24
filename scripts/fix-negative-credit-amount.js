/**
 * Script สำหรับแก้ไขข้อมูล totalCreditAmount ที่เป็นค่าลบ
 * ให้เป็น 0 เพื่อป้องกันข้อผิดพลาดในการสร้างสัญญาใหม่
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import Customer model
const Customer = require('../models/Customer/Customer');

async function fixNegativeCreditAmounts() {
  try {
    // เชื่อมต่อฐานข้อมูล
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/myAccountingDB';
    await mongoose.connect(mongoURI);
    console.log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ');

    // ค้นหาลูกค้าที่มี totalCreditAmount เป็นค่าลบ
    const customersWithNegativeCredit = await Customer.find({
      'installmentInfo.totalCreditAmount': { $lt: 0 }
    });

    console.log(`🔍 พบลูกค้าที่มี totalCreditAmount เป็นค่าลบ: ${customersWithNegativeCredit.length} คน`);

    if (customersWithNegativeCredit.length === 0) {
      console.log('✅ ไม่มีข้อมูลที่ต้องแก้ไข');
      return;
    }

    // แสดงข้อมูลลูกค้าที่จะแก้ไข
    console.log('\n📋 รายชื่อลูกค้าที่จะแก้ไข:');
    customersWithNegativeCredit.forEach((customer, index) => {
      const name = customer.customerType === 'individual'
        ? `${customer.individual?.prefix || ''} ${customer.individual?.firstName || ''} ${customer.individual?.lastName || ''}`.trim()
        : customer.corporate?.companyName || 'ไม่ระบุชื่อ';

      console.log(`${index + 1}. ${name} - Credit Amount: ${customer.installmentInfo?.totalCreditAmount || 0}`);
    });

    // แก้ไขข้อมูล
    console.log('\n🔧 กำลังแก้ไขข้อมูล...');

    const updateResult = await Customer.updateMany(
      { 'installmentInfo.totalCreditAmount': { $lt: 0 } },
      {
        $set: {
          'installmentInfo.totalCreditAmount': 0,
          'installmentInfo.lastUpdated': new Date()
        }
      }
    );

    console.log(`✅ แก้ไขสำเร็จ: ${updateResult.modifiedCount} รายการ`);

    // ตรวจสอบผลลัพธ์
    const remainingNegative = await Customer.countDocuments({
      'installmentInfo.totalCreditAmount': { $lt: 0 }
    });

    if (remainingNegative === 0) {
      console.log('✅ ไม่มีข้อมูลค่าลบคงเหลือ');
    } else {
      console.log(`⚠️ ยังมีข้อมูลค่าลบคงเหลือ: ${remainingNegative} รายการ`);
    }

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    // ปิดการเชื่อมต่อฐานข้อมูล
    await mongoose.disconnect();
    console.log('🔌 ปิดการเชื่อมต่อฐานข้อมูล');
  }
}

// เรียกใช้ script
if (require.main === module) {
  fixNegativeCreditAmounts()
    .then(() => {
      console.log('\n🎉 Script ทำงานเสร็จสิ้น');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Script ล้มเหลว:', error);
      process.exit(1);
    });
}

module.exports = fixNegativeCreditAmounts;