/**
 * ตรวจสอบ admin users ทั้งหมดในระบบ
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function checkAllAdminUsers() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const User = require('./models/User/User');
        const Employee = require('./models/HR/Employee');

        console.log('\n👥 === ALL ADMIN-LIKE USERS ===');

        // Find all users with admin-like usernames
        const adminUsers = await User.find({
            username: { $regex: /admin/i },
            isActive: { $ne: false }
        })
        .select('username role checkinBranches allowedBranches')
        .lean();

        console.log(`Found ${adminUsers.length} admin-like users:`);

        adminUsers.forEach((user, index) => {
            console.log(`\n${index + 1}. ${user.username}`);
            console.log(`   - Role: ${user.role || 'No role'}`);
            console.log(`   - checkinBranches: ${user.checkinBranches?.length || 0} branches`);
            console.log(`   - allowedBranches: ${user.allowedBranches?.length || 0} branches`);
        });

        // Check total branches for reference
        const Branch = require('./models/Account/Branch');
        const totalBranches = await Branch.countDocuments({ deleted_at: null });

        console.log(`\n📊 === SUMMARY ===`);
        console.log(`Total active branches in system: ${totalBranches}`);

        const usersWithFullAccess = adminUsers.filter(u => u.checkinBranches?.length === totalBranches);
        console.log(`Admin users with full branch access: ${usersWithFullAccess.length}/${adminUsers.length}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

checkAllAdminUsers();