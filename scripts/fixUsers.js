const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User/User');
const UserRole = require('../models/User/UserRole');

async function fixUsers() {
  try {
    console.log('🔧 Starting user fixes...');

    // เชื่อมต่อฐานข้อมูล
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // หา Admin role
    const adminRole = await UserRole.findOne({ name: 'Admin', deleted_at: null });
    if (!adminRole) {
      console.error('❌ Admin role not found!');
      return;
    }

    // หาผู้ใช้ที่ไม่มี role
    const usersWithoutRole = await User.find({
      $or: [
        { role: null },
        { role: { $exists: false } }
      ]
    });

    console.log(`\n🔍 Found ${usersWithoutRole.length} users without role:`);

    let fixedCount = 0;
    for (const user of usersWithoutRole) {
      try {
        user.role = adminRole._id;
        await user.save();
        console.log(`✅ Fixed user: ${user.username} -> Admin role`);
        fixedCount++;
      } catch (error) {
        console.error(`❌ Error fixing user ${user.username}:`, error.message);
      }
    }

    console.log(`\n📊 Fix Summary:`);
    console.log(`✅ Fixed: ${fixedCount} users`);
    console.log('🎉 User fixes completed successfully!');

  } catch (error) {
    console.error('❌ Fix error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

fixUsers();
