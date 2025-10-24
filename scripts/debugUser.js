const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User/User');
const UserRole = require('../models/User/UserRole');

async function debugUser() {
  try {
    console.log('🔍 Starting user debug...');

    // เชื่อมต่อฐานข้อมูล
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // ดึงข้อมูลผู้ใช้ทั้งหมด (ไม่ populate employee)
    const users = await User.find({ deleted_at: null })
      .populate('role', 'name allowedPages');

    console.log('\n📊 User Debug Report:');
    console.log('=' .repeat(60));

    for (const user of users) {
      console.log(`\n👤 User: ${user.username}`);
      console.log(`   Role: ${user.role?.name || 'N/A'}`);
      console.log(`   Role allowedPages: ${JSON.stringify(user.role?.allowedPages || [])}`);
      console.log(`   User allowedPages: ${JSON.stringify(user.allowedPages || [])}`);
      console.log(`   User allowedBranches: ${JSON.stringify(user.allowedBranches || [])}`);
      console.log(`   User checkinBranches: ${JSON.stringify(user.checkinBranches || [])}`);
      console.log(`   IsBlocked: ${user.isBlocked || false}`);
    }

    // ดึงข้อมูล Role ทั้งหมด
    const roles = await UserRole.find({ deleted_at: null });

    console.log('\n🎭 Role Debug Report:');
    console.log('=' .repeat(60));

    for (const role of roles) {
      console.log(`\n🎭 Role: ${role.name}`);
      console.log(`   Description: ${role.description || 'N/A'}`);
      console.log(`   allowedPages: ${JSON.stringify(role.allowedPages || [])}`);
      console.log(`   allowedBranches: ${JSON.stringify(role.allowedBranches || [])}`);
      console.log(`   permissions: ${JSON.stringify(role.permissions || [])}`);
    }

    console.log('\n✅ Debug completed successfully!');

  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

debugUser();
