const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User/User');
const UserRole = require('../models/User/UserRole');

async function fixSpecificUser() {
  try {
    console.log('🔧 Starting specific user fix...');

    // เชื่อมต่อฐานข้อมูล
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // หา admin2 user
    const admin2 = await User.findOne({ username: 'admin2' });
    console.log('👤 Found admin2:', admin2 ? 'Yes' : 'No');

    if (admin2) {
      console.log('📋 Current admin2 data:');
      console.log('   Role:', admin2.role);
      console.log('   Role type:', typeof admin2.role);
      console.log('   Role exists:', !!admin2.role);
    }

    // หา Admin role
    const adminRole = await UserRole.findOne({ name: 'Admin', deleted_at: null });
    console.log('🎭 Found Admin role:', adminRole ? 'Yes' : 'No');

    if (adminRole) {
      console.log('📋 Admin role data:');
      console.log('   ID:', adminRole._id);
      console.log('   allowedPages:', adminRole.allowedPages);
    }

    // แก้ไข admin2
    if (admin2 && adminRole) {
      admin2.role = adminRole._id;
      await admin2.save();
      console.log('✅ Fixed admin2 -> Admin role');

      // ตรวจสอบหลังการแก้ไข
      const updatedAdmin2 = await User.findOne({ username: 'admin2' }).populate('role', 'name allowedPages');
      console.log('📋 Updated admin2:');
      console.log('   Role:', updatedAdmin2.role?.name);
      console.log('   allowedPages:', updatedAdmin2.role?.allowedPages);
    } else {
      console.log('❌ Cannot fix: missing user or role');
    }

    console.log('🎉 Specific user fix completed!');

  } catch (error) {
    console.error('❌ Fix error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

fixSpecificUser();
