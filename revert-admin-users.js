/**
 * เอาสิทธิ์การเช็กอินทุกสาขาออกจาก admin users อื่น เหลือแค่ user 'admin' เท่านั้น
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function revertOtherAdminUsers() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Import models
        const User = require('./models/User/User');

        console.log('\n🔍 === FINDING ALL ADMIN USERS ===');

        // Find all admin users except the main 'admin'
        const otherAdminUsers = await User.find({
            username: { $regex: /admin/i },
            username: { $ne: 'admin' }, // exclude main admin
            isActive: { $ne: false }
        })
        .select('username checkinBranches allowedBranches')
        .lean();

        console.log(`Found ${otherAdminUsers.length} other admin users to revert:`);
        otherAdminUsers.forEach((user, index) => {
            console.log(`${index + 1}. ${user.username} - checkinBranches: ${user.checkinBranches?.length || 0}, allowedBranches: ${user.allowedBranches?.length || 0}`);
        });

        if (otherAdminUsers.length === 0) {
            console.log('ℹ️ No other admin users found to revert');
            return;
        }

        console.log('\n🔄 === REVERTING OTHER ADMIN USERS ===');

        let successCount = 0;
        let errorCount = 0;

        for (const user of otherAdminUsers) {
            try {
                console.log(`\n🔧 Reverting ${user.username}...`);

                // Clear all branch permissions
                const updateResult = await User.updateOne(
                    { _id: user._id },
                    {
                        $set: {
                            checkinBranches: [],
                            allowedBranches: []
                        }
                    }
                );

                if (updateResult.modifiedCount > 0) {
                    console.log(`   ✅ ${user.username} reverted successfully! (removed all branch access)`);
                    successCount++;
                } else {
                    console.log(`   ⚠️ ${user.username} already has no branch access`);
                }

            } catch (error) {
                console.error(`   ❌ Error reverting ${user.username}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n📋 === VERIFICATION ===');

        // Verify main admin still has full access
        const mainAdmin = await User.findOne({ username: 'admin' })
            .select('username checkinBranches allowedBranches')
            .lean();

        if (mainAdmin) {
            console.log(`✅ Main admin user: ${mainAdmin.checkinBranches?.length || 0} checkinBranches, ${mainAdmin.allowedBranches?.length || 0} allowedBranches`);
        }

        // Verify other admin users have no access
        const verifyOtherAdmins = await User.find({
            username: { $regex: /admin/i },
            username: { $ne: 'admin' },
            isActive: { $ne: false }
        })
        .select('username checkinBranches allowedBranches')
        .lean();

        console.log('\nOther admin users status:');
        verifyOtherAdmins.forEach((user, index) => {
            const hasNoAccess = (!user.checkinBranches || user.checkinBranches.length === 0) &&
                               (!user.allowedBranches || user.allowedBranches.length === 0);
            console.log(`${index + 1}. ${user.username}: ${hasNoAccess ? '✅' : '❌'} ${user.checkinBranches?.length || 0} checkinBranches, ${user.allowedBranches?.length || 0} allowedBranches`);
        });

        console.log(`\n🎉 === SUMMARY ===`);
        console.log(`✅ Successfully reverted: ${successCount} users`);
        console.log(`⚠️ Already had no access: ${otherAdminUsers.length - successCount - errorCount} users`);
        console.log(`❌ Failed to revert: ${errorCount} users`);
        console.log(`\n🔐 Now only the main 'admin' user can check-in at all branches!`);

    } catch (error) {
        console.error('❌ Error reverting admin users:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

revertOtherAdminUsers();