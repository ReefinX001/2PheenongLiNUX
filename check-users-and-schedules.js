// check-users-and-schedules.js
const mongoose = require('mongoose');
const User = require('./models/User/User');
const Employee = require('./models/HR/Employee');
const WorkSchedule = require('./models/HR/WorkSchedule');
const Zone = require('./models/HR/zoneModel');

async function checkUsersAndSchedules() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/accounting-system');
    console.log('Connected to MongoDB');

    // Count total users
    const totalUsers = await User.countDocuments();
    console.log(`\nTotal Users: ${totalUsers}`);

    // Count users with employees
    const usersWithEmployees = await User.find()
      .populate('employee')
      .lean();

    console.log(`\nUsers with Employee records: ${usersWithEmployees.filter(u => u.employee).length}`);

    // Check existing work schedules
    const totalSchedules = await WorkSchedule.countDocuments({ deleted_at: null });
    const activeSchedules = await WorkSchedule.countDocuments({
      status: 'active',
      deleted_at: null,
      startDate: { $lte: new Date() },
      $or: [
        { endDate: null },
        { endDate: { $gte: new Date() } }
      ]
    });

    console.log(`\nTotal Work Schedules: ${totalSchedules}`);
    console.log(`Active Work Schedules: ${activeSchedules}`);

    // Find users without work schedules
    const usersWithoutSchedules = [];
    for (const user of usersWithEmployees) {
      if (user.employee) {
        const schedule = await WorkSchedule.findOne({
          $or: [
            { userId: user._id },
            { employeeId: user.employee._id }
          ],
          status: 'active',
          deleted_at: null,
          startDate: { $lte: new Date() },
          $or: [
            { endDate: null },
            { endDate: { $gte: new Date() } }
          ]
        });

        if (!schedule) {
          usersWithoutSchedules.push({
            userId: user._id,
            employeeId: user.employee._id,
            username: user.username,
            employeeName: user.employee.name,
            primaryBranch: user.employee.primaryBranch
          });
        }
      }
    }

    console.log(`\nUsers without active work schedules: ${usersWithoutSchedules.length}`);

    if (usersWithoutSchedules.length > 0) {
      console.log('\nUsers without schedules:');
      usersWithoutSchedules.slice(0, 10).forEach((user, index) => {
        console.log(`${index + 1}. ${user.username} (${user.employeeName}) - Branch: ${user.primaryBranch}`);
      });
      if (usersWithoutSchedules.length > 10) {
        console.log(`... and ${usersWithoutSchedules.length - 10} more`);
      }
    }

    // Check branches
    const branches = await Zone.find({ deleted_at: null }).lean();
    console.log(`\nAvailable Branches: ${branches.length}`);
    if (branches.length > 0) {
      console.log('Branch IDs:');
      branches.forEach(branch => {
        console.log(`- ${branch._id} (${branch.name || 'No name'})`);
      });
    }

    return {
      totalUsers,
      usersWithEmployees: usersWithEmployees.filter(u => u.employee).length,
      totalSchedules,
      activeSchedules,
      usersWithoutSchedules: usersWithoutSchedules.length,
      usersWithoutSchedulesList: usersWithoutSchedules,
      branches
    };

  } catch (error) {
    console.error('Error checking users and schedules:', error);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  require('dotenv').config();
  checkUsersAndSchedules();
}

module.exports = checkUsersAndSchedules;