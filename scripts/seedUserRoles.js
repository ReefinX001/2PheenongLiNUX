const mongoose = require('mongoose');
const UserRole = require('../models/User/UserRole');
const connectDB = require('../config/db');

const roles = [
  {
    name: 'Admin',
    description: 'ผู้ดูแลระบบ มีสิทธิ์เข้าถึงทุกอย่าง',
    permissions: ['*'],
    allowedPages: ['*']
  },
  {
    name: 'Super Admin',
    description: 'ผู้ดูแลระบบสูงสุด มีสิทธิ์เข้าถึงทุกอย่าง',
    permissions: ['*'],
    allowedPages: ['*']
  },
  {
    name: 'ผู้จัดการร้าน',
    description: 'ผู้จัดการสาขา รับผิดชอบการดำเนินงานของร้าน',
    permissions: ['READ_BRANCH', 'CREATE_BRANCH', 'EDIT_BRANCH', 'MANAGE_STAFF', 'VIEW_REPORTS'],
    allowedPages: ['pos', 'stock', 'hr', 'accounting']
  },
  {
    name: 'CEO',
    description: 'ผู้บริหารสูงสุด เข้าถึงได้ทุกระบบ',
    permissions: ['READ_ALL', 'VIEW_REPORTS', 'APPROVE_ALL'],
    allowedPages: ['*']
  },
  {
    name: 'กราฟิกดีไซน์',
    description: 'รับผิดชอบงานออกแบบกราฟิก โลโก้ และสื่อโฆษณา',
    permissions: ['READ_DESIGN', 'CREATE_DESIGN', 'EDIT_DESIGN', 'VIEW_REPORTS'],
    allowedPages: ['marketing']
  },
  {
    name: 'นักพัฒนา',
    description: 'รับผิดชอบงานพัฒนาระบบ และดูแลเทคนิค',
    permissions: ['READ_CODE', 'CREATE_CODE', 'EDIT_CODE', 'DEPLOY', 'VIEW_REPORTS'],
    allowedPages: ['*']
  },
  {
    name: 'คอนเทนต์ครีเอเตอร์',
    description: 'รับผิดชอบงานสร้างเนื้อหา บทความ และสื่อการตลาด',
    permissions: ['READ_CONTENT', 'CREATE_CONTENT', 'EDIT_CONTENT', 'VIEW_REPORTS'],
    allowedPages: ['marketing']
  },
  {
    name: 'ครีเอทีฟ',
    description: 'รับผิดชอบงานสร้างสรรค์ ไอเดีย และแนวคิดการตลาด',
    permissions: ['READ_CREATIVE', 'CREATE_CREATIVE', 'EDIT_CREATIVE', 'VIEW_REPORTS'],
    allowedPages: ['marketing']
  },
  {
    name: 'การตลาด',
    description: 'รับผิดชอบงานการตลาด โฆษณา และประชาสัมพันธ์',
    permissions: ['READ_MARKETING', 'CREATE_MARKETING', 'EDIT_MARKETING', 'VIEW_REPORTS'],
    allowedPages: ['marketing']
  },
  {
    name: 'บัญชี',
    description: 'รับผิดชอบงานบัญชี การเงิน และรายงานทางการเงิน',
    permissions: ['READ_ACCOUNTING', 'CREATE_ACCOUNTING', 'EDIT_ACCOUNTING', 'VIEW_REPORTS'],
    allowedPages: ['accounting']
  },
  {
    name: 'HR',
    description: 'รับผิดชอบงานบุคคล การจัดการพนักงาน และสวัสดิการ',
    permissions: ['READ_HR', 'CREATE_HR', 'EDIT_HR', 'VIEW_REPORTS'],
    allowedPages: ['hr']
  },
  {
    name: 'คลังสินค้า',
    description: 'รับผิดชอบงานจัดการสต็อก สินค้า และคลังสินค้า',
    permissions: ['READ_STOCK', 'CREATE_STOCK', 'EDIT_STOCK', 'VIEW_REPORTS'],
    allowedPages: ['stock']
  },
  {
    name: 'POS',
    description: 'รับผิดชอบงานขายหน้าร้าน และระบบ Point of Sale',
    permissions: ['READ_POS', 'CREATE_POS', 'EDIT_POS', 'VIEW_REPORTS'],
    allowedPages: ['pos']
  },
  {
    name: 'สินเชื่อ',
    description: 'รับผิดชอบงานสินเชื่อ การอนุมัติ และติดตามหนี้',
    permissions: ['READ_LOAN', 'CREATE_LOAN', 'EDIT_LOAN', 'APPROVE_LOAN', 'VIEW_REPORTS'],
    allowedPages: ['loan']
  },
  {
    name: 'ของแถม',
    description: 'รับผิดชอบงานจัดการของแถมและโปรโมชั่น',
    permissions: ['READ_GIFTS', 'CREATE_GIFTS', 'EDIT_GIFTS', 'VIEW_REPORTS'],
    allowedPages: ['gifts']
  },
  {
    name: 'พนักงานทั่วไป',
    description: 'พนักงานทั่วไป มีสิทธิ์เข้าถึงข้อมูลพื้นฐาน',
    permissions: ['READ_BASIC'],
    allowedPages: []
  }
];

async function seedUserRoles() {
  try {
    await connectDB();

    console.log('🚀 Starting UserRole seeding...');

    let createdCount = 0;
    let existingCount = 0;

    for (const roleData of roles) {
      const existingRole = await UserRole.findOne({ name: roleData.name });
      if (!existingRole) {
        const role = new UserRole(roleData);
        await role.save();
        console.log(`✅ Created role: ${roleData.name}`);
        createdCount++;
      } else {
        console.log(`⚠️  Role already exists: ${roleData.name}`);
        existingCount++;
      }
    }

    console.log('\n📊 Seeding Summary:');
    console.log(`✅ Created: ${createdCount} roles`);
    console.log(`⚠️  Already existed: ${existingCount} roles`);
    console.log(`📝 Total processed: ${roles.length} roles`);
    console.log('\n🎉 UserRole seeding completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('❌ UserRole seeding failed:', error);
    process.exit(1);
  }
}

// เรียกใช้ฟังก์ชัน
if (require.main === module) {
  seedUserRoles();
}

module.exports = { seedUserRoles, roles };
