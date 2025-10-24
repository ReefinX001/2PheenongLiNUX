/**
 * ตรวจสอบสถานะตารางงานของ users
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function checkWorkSchedules() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Import models
        const WorkSchedule = require('./models/HR/WorkSchedule');
        const User = require('./models/User/User');
        const Branch = require('./models/Account/Branch');
        const Employee = require('./models/HR/Employee');

        console.log('\n📋 === WORK SCHEDULE ANALYSIS ===');

        // 1. Check total work schedules
        const totalSchedules = await WorkSchedule.countDocuments({ deleted_at: null });
        console.log(`Total active work schedules: ${totalSchedules}`);

        // 2. Check work schedules by branch
        const branches = await Branch.find({ deleted_at: null }).select('name branch_code').lean();
        console.log(`\n🏢 Work schedules by branch:`);

        for (const branch of branches) {
            const scheduleCount = await WorkSchedule.countDocuments({
                branchId: branch._id,
                deleted_at: null
            });
            console.log(`  - ${branch.name} (${branch.branch_code}): ${scheduleCount} schedules`);
        }

        // 3. Check recent work schedules
        const recentSchedules = await WorkSchedule.find({ deleted_at: null })
            .populate('userId', 'username')
            .populate('branchId', 'name branch_code')
            .sort({ created_at: -1 })
            .limit(10)
            .lean();

        console.log(`\n🕒 Recent work schedules (last 10):`);
        if (recentSchedules.length > 0) {
            recentSchedules.forEach((schedule, index) => {
                console.log(`${index + 1}. ${schedule.userId?.username || 'Unknown'} at ${schedule.branchId?.name || 'Unknown'} - ${schedule.scheduleType || 'N/A'}`);
            });
        } else {
            console.log('❌ No work schedules found');
        }

        // 4. Check users without work schedules
        const usersWithSchedules = await WorkSchedule.distinct('userId', { deleted_at: null });
        const totalActiveUsers = await User.countDocuments({ isActive: { $ne: false } });
        const usersWithoutSchedules = totalActiveUsers - usersWithSchedules.length;

        console.log(`\n👥 User schedule coverage:`);
        console.log(`  - Total active users: ${totalActiveUsers}`);
        console.log(`  - Users with schedules: ${usersWithSchedules.length}`);
        console.log(`  - Users without schedules: ${usersWithoutSchedules}`);

        // 5. Sample users without schedules
        const allUsers = await User.find({
            isActive: { $ne: false },
            _id: { $nin: usersWithSchedules }
        })
        .populate('employee', 'name')
        .select('username employee')
        .limit(10)
        .lean();

        if (allUsers.length > 0) {
            console.log(`\n❌ Sample users without work schedules:`);
            allUsers.forEach((user, index) => {
                console.log(`${index + 1}. ${user.employee?.name || user.username}`);
            });
        }

        console.log(`\n📝 === CONCLUSION ===`);
        if (totalSchedules === 0) {
            console.log('🚨 ปัญหา: ไม่มีตารางงาน (Work Schedule) ใดๆ ในระบบ!');
            console.log('💡 นี่คือสาเหตุที่ stats แสดง:');
            console.log('   - พนักงานทั้งหมด: 26/16 คน ✅');
            console.log('   - มีตารางงาน: 0 คน ❌');
            console.log('   - ยังไม่มีตารางงาน: 26/16 คน ❌');
            console.log('   - เข้างานวันนี้: 0 คน ❌');
            console.log('\n🔧 ต้องสร้างตารางงานให้กับพนักงานก่อน!');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

checkWorkSchedules();