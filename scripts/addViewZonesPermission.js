const mongoose = require('mongoose');
const UserRole = require('../models/User/UserRole');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function addViewZonesPermission() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Roles that should have view_zones permission
    const rolesToUpdate = [
      'Super Admin',
      'Admin',
      'HR',
      'ผู้จัดการร้าน',
      'CEO'
    ];

    for (const roleName of rolesToUpdate) {
      const role = await UserRole.findOne({ name: roleName });

      if (role) {
        // Check if view_zones already exists
        if (!role.permissions.includes('view_zones')) {
          role.permissions.push('view_zones');
          await role.save();
          console.log(`✅ Added view_zones permission to role: ${roleName}`);
        } else {
          console.log(`ℹ️  Role ${roleName} already has view_zones permission`);
        }
      } else {
        console.log(`⚠️  Role ${roleName} not found`);
      }
    }

    // Also add other HR-related permissions
    const hrPermissions = [
      'view_zones',
      'create_zones',
      'edit_zones',
      'view_attendance',
      'manage_schedules'
    ];

    // Update HR role specifically
    const hrRole = await UserRole.findOne({ name: 'HR' });
    if (hrRole) {
      let updated = false;
      for (const perm of hrPermissions) {
        if (!hrRole.permissions.includes(perm)) {
          hrRole.permissions.push(perm);
          updated = true;
        }
      }
      if (updated) {
        await hrRole.save();
        console.log(`✅ Updated HR role with permissions: ${hrPermissions.join(', ')}`);
      }
    }

    console.log('\n🎉 Permissions updated successfully!');
    console.log('Now users with the following roles can access zone API:');
    console.log('   - Super Admin');
    console.log('   - Admin');
    console.log('   - HR');
    console.log('   - ผู้จัดการร้าน');
    console.log('   - CEO');

  } catch (error) {
    console.error('❌ Error updating permissions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the script
addViewZonesPermission().catch(console.error);