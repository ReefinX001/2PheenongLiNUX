// redistribute-work-schedules.js
const mongoose = require('mongoose');
const User = require('./models/User/User');
const Employee = require('./models/HR/Employee');
const WorkSchedule = require('./models/HR/WorkSchedule');
const Zone = require('./models/HR/zoneModel');
const Branch = require('./models/Account/Branch');

async function redistributeWorkSchedules() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/accounting-system');
    console.log('Connected to MongoDB');

    // Get all branches and zones for reference
    const allBranches = await Branch.find({ deleted_at: null }).lean();
    const allZones = await Zone.find({ deleted_at: null }).lean();

    console.log(`Found ${allBranches.length} branches and ${allZones.length} zones`);

    // Create a map for easy lookup
    const branchMap = {};
    allBranches.forEach(branch => {
      branchMap[branch._id.toString()] = branch;
    });
    allZones.forEach(zone => {
      branchMap[zone._id.toString()] = zone;
    });

    // Get all users with employees and their current work schedules
    const usersWithEmployees = await User.find()
      .populate('employee')
      .lean();

    const usersWithEmployeeData = usersWithEmployees.filter(u => u.employee);
    console.log(`Processing ${usersWithEmployeeData.length} users with employee data`);

    // Get all current work schedules
    const currentSchedules = await WorkSchedule.find({
      deleted_at: null,
      status: 'active'
    }).lean();

    console.log(`Found ${currentSchedules.length} current active work schedules`);

    // Group users by their primary branch
    const usersByBranch = {};
    const usersWithoutPrimaryBranch = [];

    for (const user of usersWithEmployeeData) {
      const primaryBranch = user.employee.primaryBranch;
      if (primaryBranch) {
        if (!usersByBranch[primaryBranch]) {
          usersByBranch[primaryBranch] = [];
        }
        usersByBranch[primaryBranch].push(user);
      } else {
        usersWithoutPrimaryBranch.push(user);
      }
    }

    console.log(`\nUsers by primary branch:`);
    for (const [branchId, users] of Object.entries(usersByBranch)) {
      const branchInfo = branchMap[branchId];
      const branchName = branchInfo ?
        `${branchInfo.branch_code || branchInfo.name}` :
        'Unknown Branch';
      console.log(`${branchName}: ${users.length} users`);
    }

    if (usersWithoutPrimaryBranch.length > 0) {
      console.log(`\nUsers without primary branch: ${usersWithoutPrimaryBranch.length}`);
      usersWithoutPrimaryBranch.forEach(user => {
        console.log(`- ${user.username} (${user.employee.name})`);
      });
    }

    // Find the admin user for createdBy field
    const adminUser = await User.findOne({
      username: 'admin'
    });

    const createdById = adminUser ? adminUser._id : usersWithEmployeeData[0]._id;

    // Create a standard work schedule template
    const standardWorkDays = [
      { day: 'monday', startTime: '08:00', endTime: '17:00', breakTime: { start: '12:00', end: '13:00', duration: 60 } },
      { day: 'tuesday', startTime: '08:00', endTime: '17:00', breakTime: { start: '12:00', end: '13:00', duration: 60 } },
      { day: 'wednesday', startTime: '08:00', endTime: '17:00', breakTime: { start: '12:00', end: '13:00', duration: 60 } },
      { day: 'thursday', startTime: '08:00', endTime: '17:00', breakTime: { start: '12:00', end: '13:00', duration: 60 } },
      { day: 'friday', startTime: '08:00', endTime: '17:00', breakTime: { start: '12:00', end: '13:00', duration: 60 } },
      { day: 'saturday', startTime: '08:00', endTime: '12:00', breakTime: { start: '10:00', end: '10:15', duration: 15 } }
    ];

    // Keep track of changes
    let schedulesUpdated = 0;
    let schedulesCreated = 0;
    let errors = [];

    // Process each branch
    for (const [branchId, users] of Object.entries(usersByBranch)) {
      const branchInfo = branchMap[branchId];
      const branchName = branchInfo ?
        `${branchInfo.branch_code || branchInfo.name}` :
        'Unknown Branch';

      console.log(`\nProcessing ${branchName} with ${users.length} users...`);

      for (const user of users) {
        try {
          // Check if user already has a work schedule
          const existingSchedule = await WorkSchedule.findOne({
            $or: [
              { userId: user._id },
              { employeeId: user.employee._id }
            ],
            status: 'active',
            deleted_at: null
          });

          if (existingSchedule) {
            // Update existing schedule to correct branch if needed
            if (existingSchedule.branchId !== branchId) {
              await WorkSchedule.findByIdAndUpdate(existingSchedule._id, {
                branchId: branchId,
                updatedAt: new Date()
              });
              schedulesUpdated++;
              console.log(`  Updated schedule for ${user.username} to branch ${branchName}`);
            } else {
              console.log(`  ${user.username} already has correct branch assignment`);
            }
          } else {
            // Create new work schedule
            const newSchedule = new WorkSchedule({
              employeeId: user.employee._id,
              userId: user._id,
              branchId: branchId,
              scheduleType: 'regular',
              name: `กะงานประจำ - ${user.employee.name}`,
              description: `ตารางงานประจำสำหรับ ${user.employee.name} ที่สาขา ${branchName}`,
              workDays: standardWorkDays,
              startDate: new Date(),
              endDate: null,
              status: 'active',
              isTemplate: false,
              overtimeAllowed: true,
              maxOvertimeHours: 4,
              createdBy: createdById
            });

            await newSchedule.save();
            schedulesCreated++;
            console.log(`  Created new schedule for ${user.username} at branch ${branchName}`);
          }
        } catch (error) {
          errors.push(`Error processing ${user.username}: ${error.message}`);
          console.error(`  Error processing ${user.username}:`, error.message);
        }
      }
    }

    // Handle users without primary branch - assign to main office
    if (usersWithoutPrimaryBranch.length > 0) {
      const mainOfficeBranch = allBranches.find(b =>
        b.branch_code === '00000' ||
        b.name.includes('สำนักงานใหญ่')
      );

      if (mainOfficeBranch) {
        console.log(`\nAssigning users without primary branch to main office: ${mainOfficeBranch.name}`);

        for (const user of usersWithoutPrimaryBranch) {
          try {
            // Check if user already has a work schedule
            const existingSchedule = await WorkSchedule.findOne({
              $or: [
                { userId: user._id },
                { employeeId: user.employee._id }
              ],
              status: 'active',
              deleted_at: null
            });

            if (!existingSchedule) {
              const newSchedule = new WorkSchedule({
                employeeId: user.employee._id,
                userId: user._id,
                branchId: mainOfficeBranch._id.toString(),
                scheduleType: 'regular',
                name: `กะงานประจำ - ${user.employee.name}`,
                description: `ตารางงานประจำสำหรับ ${user.employee.name} ที่สำนักงานใหญ่`,
                workDays: standardWorkDays,
                startDate: new Date(),
                endDate: null,
                status: 'active',
                isTemplate: false,
                overtimeAllowed: true,
                maxOvertimeHours: 4,
                createdBy: createdById
              });

              await newSchedule.save();
              schedulesCreated++;
              console.log(`  Created schedule for ${user.username} at main office`);
            }
          } catch (error) {
            errors.push(`Error processing ${user.username}: ${error.message}`);
            console.error(`  Error processing ${user.username}:`, error.message);
          }
        }
      }
    }

    // Summary
    console.log(`\n=== REDISTRIBUTION SUMMARY ===`);
    console.log(`Schedules updated: ${schedulesUpdated}`);
    console.log(`Schedules created: ${schedulesCreated}`);
    console.log(`Errors encountered: ${errors.length}`);

    if (errors.length > 0) {
      console.log(`\nErrors:`);
      errors.forEach(error => console.log(`- ${error}`));
    }

    // Verify final distribution
    const finalSchedulesByBranch = await WorkSchedule.aggregate([
      { $match: { deleted_at: null, status: 'active' } },
      { $group: {
          _id: '$branchId',
          count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]);

    console.log(`\n=== FINAL DISTRIBUTION ===`);
    for (const branchGroup of finalSchedulesByBranch) {
      const branchInfo = branchMap[branchGroup._id];
      const branchName = branchInfo ?
        `${branchInfo.branch_code || branchInfo.name}` :
        'Unknown Branch';
      console.log(`${branchName}: ${branchGroup.count} schedules`);
    }

    return {
      schedulesUpdated,
      schedulesCreated,
      errors,
      finalDistribution: finalSchedulesByBranch
    };

  } catch (error) {
    console.error('Error redistributing work schedules:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  require('dotenv').config();
  redistributeWorkSchedules()
    .then(result => {
      console.log('\nRedistribution completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Redistribution failed:', error);
      process.exit(1);
    });
}

module.exports = redistributeWorkSchedules;