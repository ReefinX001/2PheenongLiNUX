/**
 * ตรวจสอบ users ในฐานข้อมูล production และแก้ไข checkinBranches
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./models/User/User');
const Zone = require('./models/HR/zoneModel');
const Branch = require('./models/Account/Branch');
const Employee = require('./models/HR/Employee');

async function checkProductionUsers() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB successfully\n');

        // 1. ตรวจสอบ branch IDs ที่ zones ใช้
        console.log('📍 === TARGET BRANCH IDS ===');
        const zones = await Zone.find({ deleted_at: null })
            .populate('branchId', 'name branch_code')
            .lean();

        const targetBranchIds = zones.map(zone => zone.branchId._id.toString());
        console.log('Target Branch IDs:', targetBranchIds);
        zones.forEach(zone => {
            console.log(`- ${zone.name} → ${zone.branchId.name} (${zone.branchId._id})`);
        });

        // 2. ตรวจสอบ users ทั้งหมดในระบบ
        console.log('\n👥 === ALL USERS ANALYSIS ===');
        const allUsers = await User.find({ isActive: { $ne: false } })
            .populate('employee', 'name position department')
            .populate('checkinBranches', 'name branch_code')
            .populate('allowedBranches', 'name branch_code')
            .select('username employee checkinBranches allowedBranches')
            .lean();

        console.log(`Total active users: ${allUsers.length}`);

        // 3. แยกประเภท users
        const usersWithCheckinBranches = allUsers.filter(u => u.checkinBranches && u.checkinBranches.length > 0);
        const usersWithTargetBranches = allUsers.filter(u =>
            u.checkinBranches?.some(b => targetBranchIds.includes(b._id.toString()))
        );
        const usersWithAllowedButNoCheckin = allUsers.filter(u =>
            u.allowedBranches?.some(b => targetBranchIds.includes(b._id.toString())) &&
            (!u.checkinBranches || u.checkinBranches.length === 0)
        );

        console.log(`Users with checkinBranches: ${usersWithCheckinBranches.length}`);
        console.log(`Users with target checkinBranches: ${usersWithTargetBranches.length}`);
        console.log(`Users with allowedBranches but no checkinBranches: ${usersWithAllowedButNoCheckin.length}`);

        // 4. แสดงรายละเอียด users ที่มี checkinBranches ตรงกับ target
        console.log('\n✅ === USERS WITH TARGET CHECKIN BRANCHES ===');
        if (usersWithTargetBranches.length > 0) {
            usersWithTargetBranches.forEach((user, index) => {
                console.log(`${index + 1}. ${user.employee?.name || user.username}`);
                console.log(`   - checkinBranches: [${user.checkinBranches?.map(b => `${b.name}(${b._id})`).join(', ')}]`);
            });
        } else {
            console.log('❌ ไม่มี users ที่มี checkinBranches ตรงกับ target branches');
        }

        // 5. แสดง users ที่ควรจะได้รับ checkinBranches
        console.log('\n💡 === USERS THAT SHOULD HAVE CHECKIN BRANCHES ===');
        if (usersWithAllowedButNoCheckin.length > 0) {
            usersWithAllowedButNoCheckin.forEach((user, index) => {
                const relevantBranches = user.allowedBranches.filter(b =>
                    targetBranchIds.includes(b._id.toString())
                );
                console.log(`${index + 1}. ${user.employee?.name || user.username}`);
                console.log(`   - Should get checkinBranches: [${relevantBranches.map(b => `${b.name}(${b._id})`).join(', ')}]`);
            });
        } else {
            console.log('ไม่มี users ที่ต้องแก้ไข checkinBranches');
        }

        // 6. สำหรับแต่ละ target branch ดูว่ามี users อะไรบ้าง
        console.log('\n🔍 === USERS BY TARGET BRANCH ===');
        for (const zone of zones) {
            const branchId = zone.branchId._id.toString();
            console.log(`\nBranch: ${zone.branchId.name} (${branchId})`);

            const usersInCheckin = allUsers.filter(u =>
                u.checkinBranches?.some(b => b._id.toString() === branchId)
            );
            const usersInAllowed = allUsers.filter(u =>
                u.allowedBranches?.some(b => b._id.toString() === branchId)
            );

            console.log(`  checkinBranches: ${usersInCheckin.length} users`);
            console.log(`  allowedBranches: ${usersInAllowed.length} users`);

            if (usersInCheckin.length === 0 && usersInAllowed.length > 0) {
                console.log(`  💡 Suggestion: Copy ${usersInAllowed.length} users from allowedBranches to checkinBranches`);
            }
        }

        // 7. ถามว่าจะแก้ไขหรือไม่
        console.log('\n🔧 === FIX SUGGESTIONS ===');
        if (usersWithAllowedButNoCheckin.length > 0) {
            console.log('คำถาม: ต้องการให้ copy allowedBranches ไป checkinBranches สำหรับ users ที่เกี่ยวข้องหรือไม่?');
            console.log('(จะทำให้ users สามารถเช็คอินได้ตาม zones ที่กำหนด)');

            // สร้าง script สำหรับ fix
            await createFixScript(usersWithAllowedButNoCheckin, targetBranchIds);
        } else {
            console.log('✅ ไม่มีข้อมูลที่ต้องแก้ไข users มี checkinBranches ครบถ้วนแล้ว');
        }

        console.log('\n✅ Analysis เสร็จสิ้น');

    } catch (error) {
        console.error('❌ Error during analysis:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

async function createFixScript(usersToFix, targetBranchIds) {
    console.log('\n📝 === CREATING FIX SCRIPT ===');

    const fixCommands = [];

    for (const user of usersToFix) {
        const relevantBranches = user.allowedBranches
            .filter(b => targetBranchIds.includes(b._id.toString()))
            .map(b => b._id);

        if (relevantBranches.length > 0) {
            fixCommands.push({
                userId: user._id,
                username: user.username,
                employeeName: user.employee?.name || user.username,
                branchesToAdd: relevantBranches
            });
        }
    }

    console.log(`จะแก้ไข ${fixCommands.length} users:`);
    fixCommands.forEach((cmd, index) => {
        console.log(`${index + 1}. ${cmd.employeeName} → เพิ่ม ${cmd.branchesToAdd.length} branches`);
    });

    // สร้างไฟล์ fix script
    const fixScriptContent = `
/**
 * Fix Users checkinBranches Script
 * Auto-generated fix script
 */

const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User/User');

async function fixUsersCheckinBranches() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB successfully\\n');

        const fixCommands = ${JSON.stringify(fixCommands, null, 8)};

        let successCount = 0;
        let errorCount = 0;

        for (const cmd of fixCommands) {
            try {
                console.log(\`🔄 Fixing user: \${cmd.employeeName}\`);

                const result = await User.updateOne(
                    { _id: cmd.userId },
                    {
                        $addToSet: {
                            checkinBranches: { $each: cmd.branchesToAdd }
                        }
                    }
                );

                if (result.modifiedCount > 0) {
                    console.log(\`   ✅ Added \${cmd.branchesToAdd.length} branches to checkinBranches\`);
                    successCount++;
                } else {
                    console.log(\`   ⚠️  No changes made (branches may already exist)\`);
                }
            } catch (error) {
                console.error(\`   ❌ Error fixing \${cmd.employeeName}:\`, error.message);
                errorCount++;
            }
        }

        console.log(\`\\n🎉 Fix completed: \${successCount} success, \${errorCount} errors\`);

    } catch (error) {
        console.error('❌ Error during fix:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\\n🔌 Disconnected from MongoDB');
    }
}

fixUsersCheckinBranches();
`;

    const fs = require('fs');
    fs.writeFileSync('./fix-users-checkin-branches.js', fixScriptContent);
    console.log('\n📄 Created fix script: ./fix-users-checkin-branches.js');
    console.log('💡 Run with: node fix-users-checkin-branches.js');
}

// เรียกใช้ check function
checkProductionUsers();