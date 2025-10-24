require('dotenv').config();
const mongoose = require('mongoose');
const ChartOfAccount = require('./models/Account/ChartOfAccount');

async function checkChartOfAccount() {
  try {
    // ใช้ connection string จาก .env (MongoDB Atlas)
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      throw new Error('ไม่พบ MONGO_URI ใน environment variables');
    }

    console.log('🔗 Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    // ดูข้อมูลทั้งหมดใน ChartOfAccount
    const allAccounts = await ChartOfAccount.find({}).lean();
    console.log('=== ข้อมูลผังบัญชีทั้งหมด ===');
    console.log('จำนวนรายการ:', allAccounts.length);

    if (allAccounts.length > 0) {
      console.log('\n=== ตัวอย่างข้อมูล 10 รายการแรก ===');
      allAccounts.slice(0, 10).forEach((acc, index) => {
        console.log(`${index + 1}. รหัส: ${acc.code}, ชื่อ: ${acc.name}, ประเภท: ${acc.type}`);
      });

      // ค้นหาบัญชีที่เกี่ยวข้องกับ payment
      console.log('\n=== บัญชีที่เกี่ยวข้องกับการชำระเงิน ===');
      const paymentRelated = allAccounts.filter(acc =>
        acc.name.match(/เงินสด|cash|bank|ธนาคาร|เงินฝาก|บัตรเครดิต|credit/i) ||
        acc.code.match(/^1[12]/)
      );

      console.log('พบ', paymentRelated.length, 'รายการ:');
      paymentRelated.forEach((acc, index) => {
        console.log(`${index + 1}. รหัส: ${acc.code}, ชื่อ: ${acc.name}, ประเภท: ${acc.type}`);
      });

      // ดูประเภทบัญชีทั้งหมด
      console.log('\n=== สรุปประเภทบัญชี ===');
      const types = [...new Set(allAccounts.map(acc => acc.type))];
      types.forEach(type => {
        const count = allAccounts.filter(acc => acc.type === type).length;
        console.log(`${type}: ${count} รายการ`);
      });

    } else {
      console.log('ไม่พบข้อมูลในตาราง ChartOfAccount');
    }

  } catch (err) {
    console.error('เกิดข้อผิดพลาด:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkChartOfAccount();