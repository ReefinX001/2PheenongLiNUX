console.log('🔍 ตรวจสอบสถานะระบบสร้างใบสำคัญรับเงินอัตโนมัติ...\n');

try {
  // ตรวจสอบ config
  const config = require('../config/receiptVoucherConfig');

  console.log('📋 การตั้งค่าระบบ:');
  console.log(`   - เปิดใช้งาน: ${config.AUTO_CREATION_ENABLED ? '✅ ใช่' : '❌ ไม่'}`);
  console.log(`   - ตรวจสอบทุก: ${config.AUTO_CREATE_INTERVAL ? config.AUTO_CREATE_INTERVAL / 1000 : 'ไม่ระบุ'} วินาที`);
  console.log(`   - จำนวนต่อรอบ: ${config.AUTO_CREATE_BATCH_LIMIT || 'ไม่ระบุ'} รายการ`);
  console.log(`   - ประเภทที่รองรับ: ${config.AUTO_CREATE_REASONS ? config.AUTO_CREATE_REASONS.length : 0} ประเภท`);

  if (config.AUTO_CREATE_REASONS && config.AUTO_CREATE_REASONS.length > 0) {
    console.log('\n📝 ประเภทที่สร้างอัตโนมัติ:');
    config.AUTO_CREATE_REASONS.forEach((reason, index) => {
      console.log(`   ${index + 1}. ${reason}`);
    });
  }

  console.log('\n💡 วิธีการใช้งาน:');
  console.log('   1. เริ่ม server: npm start หรือ node server.js');
  console.log('   2. ตรวจสอบ log ข้อความ "🚀 Starting receipt voucher auto creation systems..."');
  console.log('   3. เมื่อมีการขาย ระบบจะสร้างใบสำคัญรับเงินอัตโนมัติ');
  console.log('   4. ดู log ใน console สำหรับสถานะการทำงาน');

  if (!config.AUTO_CREATION_ENABLED) {
    console.log('\n⚠️  คำเตือน: ระบบปิดใช้งานอยู่');
    console.log('   แก้ไขใน config/receiptVoucherConfig.js:');
    console.log('   AUTO_CREATION_ENABLED: true');
  }

} catch (error) {
  console.error('❌ เกิดข้อผิดพลาด:', error.message);
}
