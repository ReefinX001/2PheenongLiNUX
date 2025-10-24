const mongoose = require('mongoose');
const UserRole = require('../models/User/UserRole');
require('dotenv').config();

// ข้อมูลบทบาทเริ่มต้น (sync กับ register_user.html)
const defaultRoles = [
  {
    name: 'Admin',
    allowedPages: ['*'],
    description: 'ผู้ดูแลระบบ - เข้าถึงได้ทุกระบบ รวมถึงระบบตรวจสอบ Audit Log',
    permissions: ['*']
  },
  {
    name: 'CEO',
    allowedPages: ['*'],
    description: 'ผู้บริหารสูงสุด - เข้าถึงได้ทุกระบบ รวมถึงระบบตรวจสอบ Audit Log',
    permissions: ['*']
  },
  {
    name: 'HR Manager',
    allowedPages: ['hr'],
    description: 'ผู้จัดการฝ่ายบุคคล',
    permissions: ['HR_READ', 'HR_WRITE', 'HR_DELETE', 'EMPLOYEE_MANAGE']
  },
  {
    name: 'HR Staff',
    allowedPages: ['hr'],
    description: 'พนักงานฝ่ายบุคคล',
    permissions: ['HR_READ', 'HR_WRITE']
  },
  {
    name: 'Accounting Manager',
    allowedPages: ['accounting'],
    description: 'ผู้จัดการฝ่ายบัญชี',
    permissions: ['ACCOUNTING_READ', 'ACCOUNTING_WRITE', 'ACCOUNTING_DELETE', 'FINANCIAL_REPORT']
  },
  {
    name: 'Accounting Staff',
    allowedPages: ['accounting'],
    description: 'พนักงานฝ่ายบัญชี',
    permissions: ['ACCOUNTING_READ', 'ACCOUNTING_WRITE']
  },
  {
    name: 'Stock Manager',
    allowedPages: ['stock'],
    description: 'ผู้จัดการคลังสินค้า',
    permissions: ['STOCK_READ', 'STOCK_WRITE', 'STOCK_DELETE', 'INVENTORY_MANAGE']
  },
  {
    name: 'Stock Staff',
    allowedPages: ['stock'],
    description: 'พนักงานคลังสินค้า',
    permissions: ['STOCK_READ', 'STOCK_WRITE']
  },
  {
    name: 'Marketing Manager',
    allowedPages: ['marketing'],
    description: 'ผู้จัดการการตลาด',
    permissions: ['MARKETING_READ', 'MARKETING_WRITE', 'MARKETING_DELETE', 'CAMPAIGN_MANAGE']
  },
  {
    name: 'Marketing Staff',
    allowedPages: ['marketing'],
    description: 'พนักงานการตลาด',
    permissions: ['MARKETING_READ', 'MARKETING_WRITE']
  },
  {
    name: 'Loan Manager',
    allowedPages: ['loan'],
    description: 'ผู้จัดการสินเชื่อ',
    permissions: ['LOAN_READ', 'LOAN_WRITE', 'LOAN_DELETE', 'CREDIT_MANAGE']
  },
  {
    name: 'Loan Staff',
    allowedPages: ['loan'],
    description: 'พนักงานสินเชื่อ',
    permissions: ['LOAN_READ', 'LOAN_WRITE']
  },
  {
    name: 'POS Manager',
    allowedPages: ['pos'],
    description: 'ผู้จัดการขายหน้าร้าน',
    permissions: ['POS_READ', 'POS_WRITE', 'POS_DELETE', 'SALES_REPORT']
  },
  {
    name: 'POS Staff',
    allowedPages: ['pos'],
    description: 'พนักงานขายหน้าร้าน',
    permissions: ['POS_READ', 'POS_WRITE']
  },
  {
    name: 'Gifts Manager',
    allowedPages: ['gifts'],
    description: 'ผู้จัดการของแถม',
    permissions: ['GIFTS_READ', 'GIFTS_WRITE', 'GIFTS_DELETE', 'PROMOTION_MANAGE']
  },
  {
    name: 'Gifts Staff',
    allowedPages: ['gifts'],
    description: 'พนักงานของแถม',
    permissions: ['GIFTS_READ', 'GIFTS_WRITE']
  },
  {
    name: 'Multi Department',
    allowedPages: ['accounting', 'hr', 'stock'],
    description: 'พนักงานหลายแผนก (บัญชี, HR, คลังสินค้า)',
    permissions: ['ACCOUNTING_READ', 'HR_READ', 'STOCK_READ', 'ACCOUNTING_WRITE', 'HR_WRITE', 'STOCK_WRITE']
  },
  {
    name: 'Supervisor',
    allowedPages: ['accounting', 'hr', 'stock', 'marketing'],
    description: 'หัวหน้างาน (บัญชี, HR, คลังสินค้า, การตลาด)',
    permissions: ['ACCOUNTING_READ', 'HR_READ', 'STOCK_READ', 'MARKETING_READ', 'SUPERVISOR_REPORT']
  },
  {
    name: 'Branch Manager',
    allowedPages: ['pos', 'stock', 'accounting'],
    description: 'ผู้จัดการสาขา (POS, คลังสินค้า, บัญชี)',
    permissions: ['POS_READ', 'POS_WRITE', 'STOCK_READ', 'ACCOUNTING_READ', 'BRANCH_REPORT']
  },
  {
    name: 'Guest',
    allowedPages: ['none'],
    description: 'ผู้เยี่ยมชม - ไม่สามารถเข้าถึงระบบได้',
    permissions: []
  }
];

// ฟังก์ชันสำหรับเชื่อมต่อฐานข้อมูล
async function connectDB() {
  try {
    // ใช้ connection string เดียวกับ server.js
    const mongoURI = process.env.MONGO_URI
      || process.env.MONGODB_URI
      || 'mongodb://127.0.0.1:27017/myAccountingDB';

    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 30000,
    });
    console.log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ');
    console.log('📍 Database URI:', mongoURI.replace(/\/\/.*@/, '//***:***@')); // ซ่อน password
  } catch (error) {
    console.error('❌ เชื่อมต่อฐานข้อมูลล้มเหลว:', error);
    process.exit(1);
  }
}

// ฟังก์ชันสำหรับ seed ข้อมูลบทบาท
async function seedRoles() {
  try {
    console.log('🌱 เริ่มต้น seed ข้อมูลบทบาท...');

    // ตรวจสอบว่ามีข้อมูลบทบาทในฐานข้อมูลแล้วหรือไม่
    const existingRolesCount = await UserRole.countDocuments({ deleted_at: null });

    if (existingRolesCount > 0) {
      console.log(`⚠️ พบข้อมูลบทบาทในฐานข้อมูลแล้ว (${existingRolesCount} รายการ)`);
      console.log('💡 หากต้องการ reset ข้อมูล ให้รันคำสั่ง: npm run seed:roles --force');
      return;
    }

    // เพิ่มข้อมูลบทบาท
    let successCount = 0;
    let errorCount = 0;

    for (const roleData of defaultRoles) {
      try {
        // ตรวจสอบว่ามีบทบาทชื่อนี้อยู่แล้วหรือไม่
        const existingRole = await UserRole.findOne({
          name: roleData.name,
          deleted_at: null
        });

        if (existingRole) {
          console.log(`⚠️ บทบาท "${roleData.name}" มีอยู่แล้ว - ข้าม`);
          continue;
        }

        // สร้างบทบาทใหม่
        const newRole = new UserRole(roleData);
        await newRole.save();

        console.log(`✅ เพิ่มบทบาท "${roleData.name}" สำเร็จ`);
        successCount++;

      } catch (error) {
        console.error(`❌ เพิ่มบทบาท "${roleData.name}" ล้มเหลว:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 สรุปผลการ seed:');
    console.log(`✅ สำเร็จ: ${successCount} รายการ`);
    console.log(`❌ ล้มเหลว: ${errorCount} รายการ`);
    console.log(`📋 รวมทั้งหมด: ${defaultRoles.length} รายการ`);

    if (successCount > 0) {
      console.log('\n🎉 seed ข้อมูลบทบาทเสร็จสิ้น!');
    }

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการ seed ข้อมูล:', error);
    throw error;
  }
}

// ฟังก์ชันสำหรับลบข้อมูลและ seed ใหม่ (force mode)
async function forceResetRoles() {
  try {
    console.log('🔄 กำลังลบข้อมูลบทบาททั้งหมด...');

    // ลบข้อมูลเก่า (soft delete)
    await UserRole.updateMany(
      { deleted_at: null },
      { deleted_at: new Date() }
    );

    console.log('✅ ลบข้อมูลเก่าเสร็จสิ้น');

    // seed ข้อมูลใหม่
    await seedRoles();

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการ reset ข้อมูล:', error);
    throw error;
  }
}

// ฟังก์ชันหลักสำหรับรันจาก command line
async function main() {
  try {
    await connectDB();

    // ตรวจสอบ argument --force
    const forceMode = process.argv.includes('--force');

    if (forceMode) {
      await forceResetRoles();
    } else {
      await seedRoles();
    }

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 ปิดการเชื่อมต่อฐานข้อมูลแล้ว');
    process.exit(0);
  }
}

// Export functions for use in other modules
module.exports = {
  seedRoles,
  forceResetRoles,
  defaultRoles
};

// รันเมื่อเรียกไฟล์นี้โดยตรง
if (require.main === module) {
  main();
}