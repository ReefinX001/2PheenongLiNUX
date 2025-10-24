// analyze-branch-schedules.js
const mongoose = require('mongoose');
const User = require('./models/User/User');
const Employee = require('./models/HR/Employee');
const WorkSchedule = require('./models/HR/WorkSchedule');
const Zone = require('./models/HR/zoneModel');
const Branch = require('./models/Account/Branch');

async function analyzeBranchSchedules() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/accounting-system');
    console.log('Connected to MongoDB');

    // Get all branches
    const allBranches = await Branch.find({ deleted_at: null }).lean();
    console.log(`\nTotal Branches: ${allBranches.length}`);
    allBranches.forEach((branch, index) => {
      console.log(`${index + 1}. ${branch.branch_code} - ${branch.name} (${branch._id})`);
    });

    // Get all zones
    const allZones = await Zone.find({ deleted_at: null }).lean();
    console.log(`\nTotal Zones: ${allZones.length}`);
    allZones.forEach((zone, index) => {
      console.log(`${index + 1}. ${zone.branch_code || 'No code'} - ${zone.name} (${zone._id})`);
    });

    // Get all users with employees
    const usersWithEmployees = await User.find()
      .populate('employee')
      .lean();

    const usersWithEmployeeData = usersWithEmployees.filter(u => u.employee);
    console.log(`\nUsers with Employee records: ${usersWithEmployeeData.length}`);

    // Analyze work schedules by branch
    const schedulesByBranch = await WorkSchedule.aggregate([
      { $match: { deleted_at: null, status: 'active' } },
      { $group: {
          _id: '$branchId',
          count: { $sum: 1 },
          schedules: { $push: { employeeId: '$employeeId', userId: '$userId', name: '$name' } }
      }},
      { $sort: { count: -1 } }
    ]);

    console.log(`\nWork Schedules by Branch:`);
    for (const branchGroup of schedulesByBranch) {
      const branchInfo = allBranches.find(b => b._id.toString() === branchGroup._id) ||
                        allZones.find(z => z._id.toString() === branchGroup._id);
      const branchName = branchInfo ? `${branchInfo.branch_code || branchInfo.name}` : 'Unknown';
      console.log(`\n${branchName} (${branchGroup._id}): ${branchGroup.count} schedules`);
    }

    // Find users without schedules
    const usersWithoutSchedules = [];
    for (const user of usersWithEmployeeData) {
      const schedule = await WorkSchedule.findOne({
        $or: [
          { userId: user._id },
          { employeeId: user.employee._id }
        ],
        status: 'active',
        deleted_at: null
      });

      if (!schedule) {
        usersWithoutSchedules.push({
          userId: user._id,
          employeeId: user.employee._id,
          username: user.username,
          employeeName: user.employee.name,
          primaryBranch: user.employee.primaryBranch,
          checkinBranches: user.employee.checkinBranches || []
        });
      }
    }

    console.log(`\nUsers without work schedules: ${usersWithoutSchedules.length}`);
    usersWithoutSchedules.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.employeeName})`);
      console.log(`   Primary Branch: ${user.primaryBranch}`);
      console.log(`   Checkin Branches: ${user.checkinBranches.join(', ')}`);
    });

    // Analyze user branch distribution
    const usersByBranch = {};
    for (const user of usersWithEmployeeData) {
      const primaryBranch = user.employee.primaryBranch;
      if (primaryBranch) {
        if (!usersByBranch[primaryBranch]) {
          usersByBranch[primaryBranch] = [];
        }
        usersByBranch[primaryBranch].push({
          username: user.username,
          name: user.employee.name,
          checkinBranches: user.employee.checkinBranches || []
        });
      }
    }

    console.log(`\nUsers by Primary Branch:`);
    for (const [branchId, users] of Object.entries(usersByBranch)) {
      const branchInfo = allBranches.find(b => b._id.toString() === branchId) ||
                        allZones.find(z => z._id.toString() === branchId);
      const branchName = branchInfo ? `${branchInfo.branch_code || branchInfo.name}` : 'Unknown';
      console.log(`\n${branchName} (${branchId}): ${users.length} users`);
      users.slice(0, 5).forEach(user => {
        console.log(`  - ${user.username} (${user.name})`);
      });
      if (users.length > 5) {
        console.log(`  ... and ${users.length - 5} more`);
      }
    }

    return {
      allBranches,
      allZones,
      usersWithEmployeeData,
      schedulesByBranch,
      usersWithoutSchedules,
      usersByBranch
    };

  } catch (error) {
    console.error('Error analyzing branch schedules:', error);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  require('dotenv').config();
  analyzeBranchSchedules();
}

module.exports = analyzeBranchSchedules;