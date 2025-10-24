// Script to fix zone permissions for users who need access
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const User = require('../models/User/User');
const Role = require('../models/User/UserRole');

async function fixZonePermissions() {
    console.log('🔧 Fixing Zone API Permissions');
    console.log('===============================\n');

    try {
        await connectDB();
        console.log('✅ Connected to database\n');

        // Find roles that should have view_zones permission but don't
        const rolesNeedingPermission = [
            'บัญชี',
            'HR',
            'ผู้จัดการร้าน',
            'POS',
            'คลังสินค้า',
            'การตลาด',
            'สินเชื่อ',
            'ครีเอทีฟ',
            'กราฟิกดีไซน์',
            'คอนเทนต์ครีเอเตอร์'
        ];

        let updatedRoles = 0;
        let updatedUsers = 0;

        for (const roleName of rolesNeedingPermission) {
            const role = await Role.findOne({ name: roleName });

            if (role) {
                if (!role.permissions.includes('view_zones')) {
                    role.permissions.push('view_zones');
                    await role.save();
                    console.log(`✅ Added view_zones permission to role: ${roleName}`);
                    updatedRoles++;
                } else {
                    console.log(`ℹ️  Role ${roleName} already has view_zones permission`);
                }
            } else {
                console.log(`⚠️  Role ${roleName} not found`);
            }
        }

        // Find users with roles that should have permissions but user object doesn't reflect it
        const usersNeedingUpdate = await User.find({}).populate('role');

        for (const user of usersNeedingUpdate) {
            if (user.role && user.role.permissions && user.role.permissions.includes('view_zones')) {
                // Make sure user permissions match role permissions
                if (!user.permissions || !user.permissions.includes('view_zones')) {
                    user.permissions = user.role.permissions;
                    await user.save();
                    console.log(`✅ Updated permissions for user: ${user.username}`);
                    updatedUsers++;
                }
            }
        }

        console.log('\n📊 Summary:');
        console.log(`   Roles updated: ${updatedRoles}`);
        console.log(`   Users updated: ${updatedUsers}`);

        // Verify the fix by checking current state
        const usersWithViewZones = await User.find({}).populate('role');
        const accessibleUsers = usersWithViewZones.filter(u =>
            u.role?.permissions?.includes('view_zones') ||
            u.role?.permissions?.includes('*')
        );

        console.log(`\n✅ Users now with zone access: ${accessibleUsers.length}`);
        console.log('Users with access:');
        accessibleUsers.slice(0, 5).forEach(user => {
            console.log(`   - ${user.username} (${user.role?.name})`);
        });

        if (accessibleUsers.length > 5) {
            console.log(`   ... and ${accessibleUsers.length - 5} more users`);
        }

    } catch (error) {
        console.error('❌ Fix failed:', error.message);
        console.error(error.stack);
    } finally {
        mongoose.connection.close();
        console.log('\n👋 Disconnected from database');
        process.exit(0);
    }
}

// Run the fix
fixZonePermissions();