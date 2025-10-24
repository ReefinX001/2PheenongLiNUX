// 🚀 Ultimate Backend Fix - แก้ไข Schema Mismatch ใน A4PDFController
// ไฟล์นี้จะแก้ไขปัญหา customer_id vs customer field

const fs = require('fs');
const path = require('path');

async function fixA4PDFController() {
  try {
    console.log('🔧 แก้ไข A4PDFController.js - Schema Mismatch...');

    const filePath = path.join(__dirname, 'controllers', 'pdf', 'A4PDFController.js');

    if (!fs.existsSync(filePath)) {
      throw new Error(`ไม่พบไฟล์: ${filePath}`);
    }

    // อ่านไฟล์
    let content = fs.readFileSync(filePath, 'utf8');

    // ✅ 1. แก้ไข populate customer_id เป็น customer
    const oldPopulate = `orderData = await InstallmentOrder.findById(orderId).populate('customer_id');`;
    const newPopulate = `orderData = await InstallmentOrder.findById(orderId).populate('customer');`;

    if (content.includes(oldPopulate)) {
      content = content.replace(oldPopulate, newPopulate);
      console.log('✅ แก้ไข populate customer_id -> customer');
    }

    // ✅ 2. แก้ไข การดึงข้อมูลลูกค้า
    const oldCustomerCheck = `if (orderData && orderData.customer_id) {
            customerData = await InstallmentCustomer.findById(orderData.customer_id);
          }`;

    const newCustomerCheck = `if (orderData && orderData.customer) {
            customerData = orderData.customer; // ได้จาก populate แล้ว ไม่ต้อง findById เพิ่ม
          }`;

    if (content.includes('orderData.customer_id')) {
      content = content.replace(/if \(orderData && orderData\.customer_id\) \{[\s\S]*?await InstallmentCustomer\.findById\(orderData\.customer_id\);[\s\S]*?\}/g,
        `if (orderData && orderData.customer) {
            customerData = orderData.customer; // ได้จาก populate แล้ว ไม่ต้อง findById เพิ่ม
          }`);
      console.log('✅ แก้ไข customerData extraction');
    }

    // ✅ 3. เพิ่ม error handling สำหรับกรณีที่ populate ล้มเหลว
    const installmentCasePattern = /case 'installment':([\s\S]*?)break;/;
    const installmentMatch = content.match(installmentCasePattern);

    if (installmentMatch) {
      const enhancedInstallmentCase = `case 'installment':
          try {
            orderData = await InstallmentOrder.findById(orderId).populate('customer');
            if (orderData && orderData.customer) {
              customerData = orderData.customer; // ได้จาก populate แล้ว
            } else if (orderData) {
              // Fallback: ใช้ข้อมูลจาก customer_info
              console.warn('⚠️ ไม่มีข้อมูล customer populated, ใช้ customer_info แทน');
              customerData = null; // จะใช้ customer_info ใน formatOrderForPDF
            }
          } catch (populateError) {
            console.error('❌ Populate customer error:', populateError.message);
            // Fallback: ดึงข้อมูลโดยไม่ populate
            orderData = await InstallmentOrder.findById(orderId);
            customerData = null; // จะใช้ customer_info ใน formatOrderForPDF
          }
          break;`;

      content = content.replace(installmentCasePattern, enhancedInstallmentCase);
      console.log('✅ เพิ่ม enhanced error handling');
    }

    // ✅ 4. แก้ไข formatOrderForPDF ให้รองรับ fallback จาก customer_info
    const customerInfoFallback = `
      // ข้อมูลลูกค้า
      if (customerData) {
        if (orderType === 'installment') {
          // สำหรับ InstallmentOrder - ใช้ populated customer data
          formattedOrder.customerType = customerData.customerType || 'individual';
          if (formattedOrder.customerType === 'individual') {
            formattedOrder.customer = {
              prefix: customerData.prefix || orderData.customer_info?.prefix || 'นาย',
              firstName: customerData.firstName || orderData.customer_info?.firstName || customerData.first_name || '',
              lastName: customerData.lastName || orderData.customer_info?.lastName || customerData.last_name || '',
              phone: customerData.phone || orderData.customer_info?.phone || customerData.phone_number || '',
              taxId: customerData.taxId || orderData.customer_info?.taxId || customerData.tax_id || '',
              address: customerData.address || orderData.customer_info?.address || {}
            };
          }
        }`;

    // ค้นหาและแทนที่ส่วน customer data ใน formatOrderForPDF
    const customerDataPattern = /\/\/ ข้อมูลลูกค้า\s*if \(customerData\) \{[\s\S]*?if \(orderType === 'installment'\) \{[\s\S]*?\}/;

    if (content.match(customerDataPattern)) {
      // เพิ่ม fallback สำหรับ customer_info
      content = content.replace(
        /prefix: orderData\.customer_info\?\.prefix \|\| 'นาย',/g,
        `prefix: customerData.prefix || orderData.customer_info?.prefix || 'นาย',`
      );
      content = content.replace(
        /firstName: orderData\.customer_info\?\.firstName \|\| customerData\.first_name,/g,
        `firstName: customerData.firstName || orderData.customer_info?.firstName || customerData.first_name || '',`
      );
      content = content.replace(
        /lastName: orderData\.customer_info\?\.lastName \|\| customerData\.last_name,/g,
        `lastName: customerData.lastName || orderData.customer_info?.lastName || customerData.last_name || '',`
      );
      console.log('✅ เพิ่ม customer_info fallback');
    }

    // ✅ 5. เพิ่ม fallback สำหรับกรณีที่ไม่มี customerData
    const noCustomerDataFallback = `} else {
        // ✅ Fallback: ใช้ข้อมูลจาก customer_info ของ InstallmentOrder
        if (orderType === 'installment' && orderData.customer_info) {
          formattedOrder.customerType = 'individual';
          formattedOrder.customer = {
            prefix: orderData.customer_info.prefix || 'นาย',
            firstName: orderData.customer_info.firstName || '',
            lastName: orderData.customer_info.lastName || '',
            phone: orderData.customer_info.phone || '',
            taxId: orderData.customer_info.taxId || '',
            address: orderData.customer_info.address || {}
          };
          console.log('✅ ใช้ข้อมูลจาก customer_info fallback');
        } else {
          // ข้อมูลลูกค้าเริ่มต้น
          formattedOrder.customerType = 'individual';
          formattedOrder.customer = {
            prefix: 'นาย',
            firstName: 'ลูกค้า',
            lastName: 'ทั่วไป',
            phone: '-',
            taxId: '-',
            address: {}
          };
        }
      }`;

    // แทนที่ } else { เก่า
    content = content.replace(/} else \{\s*\/\/ ข้อมูลลูกค้าเริ่มต้น[\s\S]*?\}/g, noCustomerDataFallback);

    // ✅ 6. บันทึกไฟล์
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ บันทึกไฟล์สำเร็จ:', filePath);

    return {
      success: true,
      message: 'แก้ไข A4PDFController.js สำเร็จ',
      fixes: [
        'แก้ไข populate customer_id -> customer',
        'แก้ไข customerData extraction',
        'เพิ่ม enhanced error handling',
        'เพิ่ม customer_info fallback',
        'เพิ่ม fallback สำหรับกรณีไม่มี customerData'
      ]
    };

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    return {
      success: false,
      message: error.message
    };
  }
}

// ✅ ฟังก์ชันสำหรับสร้าง backup
function createBackup() {
  try {
    const filePath = path.join(__dirname, 'controllers', 'pdf', 'A4PDFController.js');
    const backupPath = filePath + `.backup.${Date.now()}`;

    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, backupPath);
      console.log('✅ สร้าง backup:', backupPath);
      return backupPath;
    }
  } catch (error) {
    console.warn('⚠️ ไม่สามารถสร้าง backup:', error.message);
  }
  return null;
}

// ✅ ฟังก์ชันทดสอบการแก้ไข
async function testFix() {
  try {
    console.log('🧪 ทดสอบการแก้ไข...');

    // Import models เพื่อทดสอบ
    const InstallmentOrder = require('./models/Installment/InstallmentOrder');

    // ทดสอบ populate
    const testContract = await InstallmentOrder.findOne({ contractNo: 'INST2568070106' })
      .populate('customer'); // ใช้ customer แทน customer_id

    if (testContract) {
      console.log('✅ Populate customer สำเร็จ');
      console.log('📋 Customer data:', {
        hasCustomer: !!testContract.customer,
        hasCustomerInfo: !!testContract.customer_info,
        customerType: testContract.customer?.customerType,
        customerInfoName: testContract.customer_info ?
          `${testContract.customer_info.firstName} ${testContract.customer_info.lastName}` : 'N/A'
      });
    } else {
      console.warn('⚠️ ไม่พบ contract INST2568070106');
    }

    return true;
  } catch (error) {
    console.error('❌ การทดสอบล้มเหลว:', error.message);
    return false;
  }
}

// ✅ Main execution
async function main() {
  console.log('🚀 เริ่มการแก้ไข Backend Schema Mismatch...');

  // สร้าง backup
  const backupPath = createBackup();

  // แก้ไขไฟล์
  const result = await fixA4PDFController();

  if (result.success) {
    console.log('\n✅ การแก้ไขสำเร็จ!');
    console.log('📋 รายการแก้ไข:');
    result.fixes.forEach(fix => console.log(`  - ${fix}`));

    // ทดสอบการแก้ไข
    console.log('\n🧪 ทดสอบการแก้ไข...');
    const testResult = await testFix();

    if (testResult) {
      console.log('🎉 การแก้ไขเสร็จสมบูรณ์!');
    } else {
      console.log('⚠️ การแก้ไขเสร็จสิ้น แต่การทดสอบมีปัญหา');
    }
  } else {
    console.error('❌ การแก้ไขล้มเหลว:', result.message);

    // Restore backup ถ้ามี
    if (backupPath && fs.existsSync(backupPath)) {
      const originalPath = backupPath.replace(/\.backup\.\d+$/, '');
      fs.copyFileSync(backupPath, originalPath);
      console.log('🔄 กู้คืนจาก backup สำเร็จ');
    }
  }
}

// รันหรือ export
if (require.main === module) {
  main().catch(console.error);
} else {
  module.exports = { fixA4PDFController, createBackup, testFix };
}