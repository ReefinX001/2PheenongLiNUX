/**
 * คืนสิทธิ์การเช็กอินให้กับ users ตามที่เคยมี แต่ให้เฉพาะ admin มีสิทธิ์ทุกสาขา
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function restoreOriginalPermissions() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Import models
        const User = require('./models/User/User');
        const Branch = require('./models/Account/Branch');

        console.log('\n🔍 === GETTING BRANCH INFORMATION ===');

        // Get specific branches for restoration
        const targetBranches = await Branch.find({
            _id: { $in: [
                '68541903ac950b3b770224ae', // สาขาโคกโพธิ์
                '68541687f88094540c0e5af1'  // สำนักงานใหญ่
            ]}
        }).select('_id name branch_code').lean();

        const allBranches = await Branch.find({ deleted_at: null }).select('_id name branch_code').lean();

        console.log('Target branches for restoration:');
        targetBranches.forEach(branch => {
            console.log(`- ${branch.name} (${branch.branch_code})`);
        });

        console.log(`Total branches available: ${allBranches.length}`);

        console.log('\n🔄 === RESTORING USER PERMISSIONS ===');

        // 1. Give admin full access to all branches
        console.log('\n1️⃣ Setting up main admin user...');
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
            console.log('✅ Admin user has full access to all branches');
        } else {
            console.log('ℹ️ Admin user already has full access');
        }

        // 2. Restore specific users to their original branches
        console.log('\n2️⃣ Restoring specific users...');

        const usersToRestore = [
            {
                username: 'Gene',
                employeeName: 'มุคลิศ จูโมง',
                branchesToAdd: ['68541903ac950b3b770224ae', '68541687f88094540c0e5af1'] // โคกโพธิ์ + สำนักงานใหญ่
            },
            {
                username: 'admin1',
                employeeName: 'นิมะ มะยี',
                branchesToAdd: ['68541903ac950b3b770224ae', '68541687f88094540c0e5af1'] // โคกโพธิ์ + สำนักงานใหญ่
            },
            {
                username: 'admin4',
                employeeName: 'ฮาฟิลด้า ยีมูซอ',
                branchesToAdd: ['68541687f88094540c0e5af1'] // สำนักงานใหญ่
            }
        ];

        let successCount = 0;
        let errorCount = 0;

        for (const userInfo of usersToRestore) {
            try {
                console.log(`🔧 Restoring ${userInfo.employeeName} (${userInfo.username})...`);

                // Find user by username
                const user = await User.findOne({ username: userInfo.username });

                if (!user) {
                    console.log(`   ⚠️ User ${userInfo.username} not found`);
                    continue;
                }

                const updateResult = await User.updateOne(
                    { _id: user._id },
                    {
                        $addToSet: {
                            checkinBranches: { $each: userInfo.branchesToAdd }
                        }
                    }
                );

                if (updateResult.modifiedCount > 0) {
                    console.log(`   ✅ Restored ${userInfo.branchesToAdd.length} branches to ${userInfo.employeeName}`);
                    successCount++;
                } else {
                    console.log(`   ℹ️ ${userInfo.employeeName} already has these branches`);
                }

            } catch (error) {
                console.error(`   ❌ Error restoring ${userInfo.employeeName}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n📋 === VERIFICATION ===');

        // Verify admin has full access
        const verifyAdmin = await User.findOne({ username: 'admin' })
            .select('username checkinBranches allowedBranches')
            .lean();

        console.log(`✅ Admin user: ${verifyAdmin.checkinBranches?.length || 0}/${allBranches.length} branches`);

        // Verify restored users
        console.log('\nRestored users:');
        for (const userInfo of usersToRestore) {
            const user = await User.findOne({ username: userInfo.username })
                .select('username checkinBranches')
                .lean();

            if (user) {
                console.log(`✅ ${userInfo.employeeName}: ${user.checkinBranches?.length || 0} branches`);
            }
        }

        console.log(`\n🎉 === SUMMARY ===`);
        console.log(`✅ Admin has full access to all ${allBranches.length} branches`);
        console.log(`✅ Successfully restored: ${successCount} users`);
        console.log(`❌ Failed to restore: ${errorCount} users`);
        console.log(`\n🔐 Permissions restored! Admin has full access, others have specific branch access.`);

    } catch (error) {
        console.error('❌ Error restoring permissions:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

restoreOriginalPermissions();