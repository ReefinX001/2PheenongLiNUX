/**
 * สร้างตารางงานตัวอย่างสำหรับ employees ที่ไม่มีตารางงาน
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function createSampleWorkSchedules() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Import models
        const WorkSchedule = require('./models/HR/WorkSchedule');
        const User = require('./models/User/User');
        const Employee = require('./models/HR/Employee');
        const Branch = require('./models/Account/Branch');

        console.log('\n📋 === CREATING SAMPLE WORK SCHEDULES ===');

        // 1. Get all active employees without work schedules
        const usersWithSchedules = await WorkSchedule.distinct('employeeId', { deleted_at: null });
        console.log(`Found ${usersWithSchedules.length} employees with existing schedules`);

        const employeesWithoutSchedules = await Employee.find({
            deleted_at: null,
            _id: { $nin: usersWithSchedules }
        })
        .populate('userId', 'username')
        .populate('primaryBranch', 'name branch_code')
        .limit(20); // Limit to first 20 employees for testing

        console.log(`Found ${employeesWithoutSchedules.length} employees without work schedules`);

        if (employeesWithoutSchedules.length === 0) {
            console.log('ℹ️ All employees already have work schedules!');
            return;
        }

        // 2. Get default branch (first branch) for creating schedules
        const defaultBranch = await Branch.findOne({ deleted_at: null }).sort({ created_at: 1 });
        if (!defaultBranch) {
            console.error('❌ No branches found! Cannot create work schedules.');
            return;
        }

        console.log(`Using default branch: ${defaultBranch.name} (${defaultBranch.branch_code})`);

        // 3. Get first user as creator
        const adminUser = await User.findOne({
            isActive: { $ne: false }
        }).sort({ created_at: 1 });

        if (!adminUser) {
            console.error('❌ No admin user found! Cannot create work schedules.');
            return;
        }

        console.log(`Using creator: ${adminUser.username}`);

        // 4. Create standard work schedule template
        const standardWorkDays = [
            { day: 'monday', startTime: '08:00', endTime: '17:00', breakTime: { start: '12:00', end: '13:00', duration: 60 } },
            { day: 'tuesday', startTime: '08:00', endTime: '17:00', breakTime: { start: '12:00', end: '13:00', duration: 60 } },
            { day: 'wednesday', startTime: '08:00', endTime: '17:00', breakTime: { start: '12:00', end: '13:00', duration: 60 } },
            { day: 'thursday', startTime: '08:00', endTime: '17:00', breakTime: { start: '12:00', end: '13:00', duration: 60 } },
            { day: 'friday', startTime: '08:00', endTime: '17:00', breakTime: { start: '12:00', end: '13:00', duration: 60 } }
        ];

        // 5. Create work schedules for employees
        let successCount = 0;
        let errorCount = 0;

        for (const employee of employeesWithoutSchedules) {
            try {
                const workSchedule = new WorkSchedule({
                    employeeId: employee._id,
                    userId: employee.userId?._id,
                    branchId: employee.primaryBranch?._id || defaultBranch._id,
                    scheduleType: 'regular',
                    name: `ตารางงานมาตรฐาน - ${employee.name}`,
                    description: 'ตารางงานมาตรฐาน จันทร์-ศุกร์ 08:00-17:00',
                    workDays: standardWorkDays,
                    startDate: new Date(),
                    endDate: null, // Ongoing schedule
                    status: 'active',
                    isTemplate: false,
                    overtimeAllowed: true,
                    maxOvertimeHours: 4,
                    createdBy: adminUser._id,
                    approvedBy: adminUser._id,
                    approvalDate: new Date()
                });

                await workSchedule.save();
                console.log(`✅ Created schedule for: ${employee.name} (${employee.userId?.username || 'No User'})`);
                successCount++;

            } catch (error) {
                console.error(`❌ Failed to create schedule for ${employee.name}:`, error.message);
                errorCount++;
            }
        }

        console.log(`\n📊 === SUMMARY ===`);
        console.log(`✅ Successfully created: ${successCount} work schedules`);
        console.log(`❌ Failed to create: ${errorCount} work schedules`);

        // 6. Create a few work schedule templates
        console.log(`\n📝 Creating work schedule templates...`);

        const templates = [
            {
                name: 'มาตรฐาน จันทร์-ศุกร์',
                description: 'ตารางงานมาตรฐาน 8 ชั่วโมงต่อวัน',
                workDays: standardWorkDays,
                templateName: 'standard-weekdays'
            },
            {
                name: 'กะเช้า 6 วัน',
                description: 'ตารางงานกะเช้า จันทร์-เสาร์',
                workDays: [
                    ...standardWorkDays,
                    { day: 'saturday', startTime: '08:00', endTime: '16:00', breakTime: { start: '12:00', end: '13:00', duration: 60 } }
                ],
                templateName: 'morning-6days'
            },
            {
                name: 'กะดึก',
                description: 'ตารางงานกะดึก จันทร์-ศุกร์',
                workDays: [
                    { day: 'monday', startTime: '22:00', endTime: '06:00', breakTime: { start: '02:00', end: '03:00', duration: 60 } },
                    { day: 'tuesday', startTime: '22:00', endTime: '06:00', breakTime: { start: '02:00', end: '03:00', duration: 60 } },
                    { day: 'wednesday', startTime: '22:00', endTime: '06:00', breakTime: { start: '02:00', end: '03:00', duration: 60 } },
                    { day: 'thursday', startTime: '22:00', endTime: '06:00', breakTime: { start: '02:00', end: '03:00', duration: 60 } },
                    { day: 'friday', startTime: '22:00', endTime: '06:00', breakTime: { start: '02:00', end: '03:00', duration: 60 } }
                ],
                templateName: 'night-shift'
            }
        ];

        let templateCount = 0;
        for (const template of templates) {
            try {
                const workScheduleTemplate = new WorkSchedule({
                    employeeId: employeesWithoutSchedules[0]._id, // Use first employee as placeholder
                    branchId: defaultBranch._id,
                    scheduleType: template.workDays.length > 5 ? 'shift' : 'regular',
                    name: template.name,
                    description: template.description,
                    workDays: template.workDays,
                    startDate: new Date(),
                    endDate: null,
                    status: 'active',
                    isTemplate: true,
                    templateName: template.templateName,
                    overtimeAllowed: true,
                    maxOvertimeHours: 4,
                    createdBy: adminUser._id,
                    approvedBy: adminUser._id,
                    approvalDate: new Date()
                });

                await workScheduleTemplate.save();
                console.log(`✅ Created template: ${template.name}`);
                templateCount++;

            } catch (error) {
                console.error(`❌ Failed to create template ${template.name}:`, error.message);
            }
        }

        console.log(`✅ Created ${templateCount} work schedule templates`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

createSampleWorkSchedules();