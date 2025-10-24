const mongoose = require('mongoose');
const User = require('../models/User/User');
const UserRole = require('../models/User/UserRole');
const Employee = require('../models/HR/Employee');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function checkUserPermissions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all users and their permissions
    const users = await User.find()
      .populate('role', 'name permissions allowedPages')
      .populate('employee', 'name employeeId')
      .select('username role employee checkinBranches')
      .lean();

    console.log('\n📊 User Permissions Report:\n');

    for (const user of users) {
      console.log(`👤 User: ${user.username} (${user.employee?.name || 'No employee'})`);
      console.log(`   Role: ${user.role?.name || 'No role'}`);
      console.log(`   Permissions: ${user.role?.permissions?.join(', ') || 'None'}`);
      console.log(`   Has view_zones: ${user.role?.permissions?.includes('view_zones') ? '✅ YES' : '❌ NO'}`);
      console.log(`   Checkin Branches: ${user.checkinBranches?.length || 0} branches`);
      console.log('');
    }

    // Find all roles and their permissions
    console.log('\n🔐 Role Permissions Summary:\n');
    const roles = await UserRole.find().lean();

    for (const role of roles) {
      console.log(`🎭 Role: ${role.name}`);
      console.log(`   Permissions: ${role.permissions?.join(', ') || 'None'}`);
      console.log(`   Has view_zones: ${role.permissions?.includes('view_zones') ? '✅ YES' : '❌ NO'}`);
      console.log('');
    }

    // Check if any user has view_zones permission
    const usersWithViewZones = users.filter(u => u.role?.permissions?.includes('view_zones'));
    console.log(`\n📈 Summary:`);
    console.log(`   Total users: ${users.length}`);
    console.log(`   Users with view_zones: ${usersWithViewZones.length}`);
    console.log(`   Users with checkin branches: ${users.filter(u => u.checkinBranches?.length > 0).length}`);

    if (usersWithViewZones.length === 0) {
      console.log('\n⚠️  WARNING: No users have view_zones permission!');
      console.log('   This is why the zone API returns 401 Unauthorized.');
      console.log('   You need to grant view_zones permission to at least one user role.');
    }

  } catch (error) {
    console.error('❌ Error checking permissions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the script
checkUserPermissions().catch(console.error);