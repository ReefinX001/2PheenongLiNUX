const mongoose = require('mongoose');
const connectDB = require('../config/db');
const UserRole = require('../models/User/UserRole');

const roleUpdates = {
  'Super Admin': ['*'],
  'Admin': ['*'],
  'CEO': ['*'],
  'นักพัฒนา': ['*'],
  'ผู้จัดการร้าน': ['pos'],
  'กราฟิกดีไซน์': [],
  'คอนเทนต์ครีเอเตอร์': [],
  'ครีเอทีฟ': [],
  'การตลาด': ['marketing'],
  'บัญชี': ['accounting'],
  'HR': ['hr'],
  'คลังสินค้า': ['stock'],
  'POS': ['pos'],
  'สินเชื่อ': ['loan'],
  'ของแถม': ['gifts'],
  'พนักงานทั่วไป': []
};

async function updateRoles() {
  try {
    console.log('🔄 Starting role updates...');

    // เชื่อมต่อฐานข้อมูล
    await connectDB();
    console.log('✅ Connected to MongoDB');

    let updatedCount = 0;
    let notFoundCount = 0;

    for (const [roleName, allowedPages] of Object.entries(roleUpdates)) {
      try {
        const role = await UserRole.findOne({ name: roleName, deleted_at: null });

        if (role) {
          role.allowedPages = allowedPages;
          await role.save();
          console.log(`✅ Updated role: ${roleName} -> ${JSON.stringify(allowedPages)}`);
          updatedCount++;
        } else {
          console.log(`⚠️  Role not found: ${roleName}`);
          notFoundCount++;
        }
      } catch (error) {
        console.error(`❌ Error updating role ${roleName}:`, error.message);
      }
    }

    console.log('\n📊 Update Summary:');
    console.log(`✅ Updated: ${updatedCount} roles`);
    console.log(`⚠️  Not found: ${notFoundCount} roles`);
    console.log('🎉 Role updates completed successfully!');

  } catch (error) {
    console.error('❌ Update error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

updateRoles();
