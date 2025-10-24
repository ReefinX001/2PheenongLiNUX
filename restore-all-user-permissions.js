/**
 * คืนสิทธิ์การเช็กอินให้กับ users ทุกคนตาม allowedBranches ที่เคยมี
 * โดยให้เฉพาะ admin มีสิทธิ์ทุกสาขา
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function restoreAllUserPermissions() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Import models
        const User = require('./models/User/User');
        const Branch = require('./models/Account/Branch');

        console.log('\n🔍 === ANALYZING CURRENT STATE ===');

        // Get all users who have allowedBranches but no checkinBranches
        const usersToRestore = await User.find({
            isActive: { $ne: false },
            allowedBranches: { $exists: true, $ne: [] },
            $or: [
                { checkinBranches: { $exists: false } },
                { checkinBranches: { $size: 0 } }
            ]
        })
        .select('username allowedBranches')
        .lean();

        console.log(`Found ${usersToRestore.length} users who need checkinBranches restored from their allowedBranches`);

        if (usersToRestore.length === 0) {
            console.log('ℹ️ No users found who need restoration');

            // Still ensure admin has full access
            const allBranches = await Branch.find({ deleted_at: null }).select('_id').lean();
            const allBranchIds = allBranches.map(b => b._id);

            await User.updateOne(
                { username: 'admin' },
                {
                    $set: {
                        checkinBranches: allBranchIds,
                        allowedBranches: allBranchIds
                    }
                }
            );
            console.log('✅ Admin user confirmed to have full access');
            return;
        }

        console.log('\n🔄 === RESTORING USER PERMISSIONS ===');

        let successCount = 0;
        let errorCount = 0;

        for (const user of usersToRestore) {
            try {
                console.log(`🔧 Restoring ${user.username}...`);

                // Copy allowedBranches to checkinBranches
                const updateResult = await User.updateOne(
                    { _id: user._id },
                    {
                        $set: {
                            checkinBranches: user.allowedBranches
                        }
                    }
                );

                if (updateResult.modifiedCount > 0) {
                    console.log(`   ✅ Restored ${user.allowedBranches.length} branches to ${user.username}`);
                    successCount++;
                } else {
                    console.log(`   ℹ️ ${user.username} already has checkinBranches`);
                }

            } catch (error) {
                console.error(`   ❌ Error restoring ${user.username}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n🔐 === ENSURING ADMIN HAS FULL ACCESS ===');

        // Ensure admin has access to all branches
        const allBranches = await Branch.find({ deleted_at: null }).select('_id name branch_code').lean();
        const allBranchIds = allBranches.map(b => b._id);

        const adminUpdate = await User.updateOne(
            { username: 'admin' },
            {
                $set: {
                    checkinBranches: allBranchIds,
                    allowedBranches: allBranchIds
                }
            }
        );

        if (adminUpdate.modifiedCount > 0) {
            console.log('✅ Admin user updated to have full access to all branches');
        } else {
            console.log('ℹ️ Admin user already has full access');
        }

        console.log('\n📋 === VERIFICATION ===');

        // Count users with checkinBranches
        const usersWithCheckin = await User.countDocuments({
            isActive: { $ne: false },
            checkinBranches: { $exists: true, $ne: [] }
        });

        // Verify admin
        const adminUser = await User.findOne({ username: 'admin' })
            .select('checkinBranches allowedBranches')
            .lean();

        console.log(`✅ Total users with checkinBranches: ${usersWithCheckin}`);
        console.log(`✅ Admin has access to: ${adminUser.checkinBranches?.length || 0}/${allBranches.length} branches`);

        console.log(`\n🎉 === SUMMARY ===`);
        console.log(`✅ Successfully restored: ${successCount} users`);
        console.log(`⚠️ Already had access: ${usersToRestore.length - successCount - errorCount} users`);
        console.log(`❌ Failed to restore: ${errorCount} users`);
        console.log(`\n🔐 All users now have their original branch access restored!`);
        console.log(`👑 Admin can check-in at all ${allBranches.length} branches`);

    } catch (error) {
        console.error('❌ Error restoring permissions:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

restoreAllUserPermissions();