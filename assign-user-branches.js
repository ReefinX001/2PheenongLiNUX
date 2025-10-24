// assign-user-branches.js
const mongoose = require('mongoose');
const User = require('./models/User/User');
const Employee = require('./models/HR/Employee');
const WorkSchedule = require('./models/HR/WorkSchedule');
const Zone = require('./models/HR/zoneModel');
const Branch = require('./models/Account/Branch');

async function assignUserBranches() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/accounting-system');
    console.log('Connected to MongoDB');

    // Get all branches
    const allBranches = await Branch.find({ deleted_at: null }).lean();
    console.log(`Found ${allBranches.length} branches`);

    // Create branch distribution based on user count
    const branchDistribution = [];
    const usersPerBranch = Math.ceil(49 / allBranches.length); // Distribute 49 users across branches

    allBranches.forEach((branch, index) => {
      branchDistribution.push({
        branchId: branch._id.toString(),
        branchCode: branch.branch_code,
        branchName: branch.name,
        userCount: 0,
        maxUsers: usersPerBranch
      });
    });

    // Get all users with employees
    const usersWithEmployees = await User.find()
      .populate('employee')
      .lean();

    const usersWithEmployeeData = usersWithEmployees.filter(u => u.employee);
    console.log(`Processing ${usersWithEmployeeData.length} users`);

    // Special assignments for key users
    const specialAssignments = {
      'admin': '68541687f88094540c0e5af1', // สำนักงานใหญ่
      'bossmean': '68541687f88094540c0e5af1', // สำนักงานใหญ่
      'Gene': '6854179e50af62804785c702', // สาขาหาดใหญ่
    };

    let assignmentCount = 0;
    let errors = [];

    // First, handle special assignments
    for (const user of usersWithEmployeeData) {
      if (specialAssignments[user.username]) {
        const assignedBranchId = specialAssignments[user.username];
        const branchInfo = allBranches.find(b => b._id.toString() === assignedBranchId);

        try {
          await Employee.findByIdAndUpdate(user.employee._id, {
            primaryBranch: assignedBranchId,
            checkinBranches: [assignedBranchId],
            updatedAt: new Date()
          });

          console.log(`Special assignment: ${user.username} -> ${branchInfo.branch_code} (${branchInfo.name})`);
          assignmentCount++;

          // Update distribution count
          const branchDist = branchDistribution.find(b => b.branchId === assignedBranchId);
          if (branchDist) {
            branchDist.userCount++;
          }
        } catch (error) {
          errors.push(`Error assigning ${user.username}: ${error.message}`);
        }
      }
    }

    // Then assign remaining users to branches in round-robin fashion
    let currentBranchIndex = 0;
    for (const user of usersWithEmployeeData) {
      if (!specialAssignments[user.username]) {
        // Find the next branch with available slots
        let attempts = 0;
        while (attempts < allBranches.length) {
          const currentBranch = branchDistribution[currentBranchIndex];

          if (currentBranch.userCount < currentBranch.maxUsers) {
            try {
              await Employee.findByIdAndUpdate(user.employee._id, {
                primaryBranch: currentBranch.branchId,
                checkinBranches: [currentBranch.branchId],
                updatedAt: new Date()
              });

              console.log(`Assigned: ${user.username} -> ${currentBranch.branchCode} (${currentBranch.branchName})`);
              currentBranch.userCount++;
              assignmentCount++;
              break;
            } catch (error) {
              errors.push(`Error assigning ${user.username}: ${error.message}`);
              break;
            }
          }

          currentBranchIndex = (currentBranchIndex + 1) % allBranches.length;
          attempts++;
        }

        currentBranchIndex = (currentBranchIndex + 1) % allBranches.length;
      }
    }

    // Summary
    console.log(`\n=== ASSIGNMENT SUMMARY ===`);
    console.log(`Total assignments: ${assignmentCount}`);
    console.log(`Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log(`\nErrors:`);
      errors.forEach(error => console.log(`- ${error}`));
    }

    console.log(`\n=== BRANCH DISTRIBUTION ===`);
    branchDistribution.forEach(branch => {
      console.log(`${branch.branchCode} (${branch.branchName}): ${branch.userCount} users`);
    });

    // Now find user "Reena" and make sure she gets assigned
    const reenaUser = await User.findOne({ username: /reena/i }).populate('employee');
    if (reenaUser && reenaUser.employee) {
      if (!reenaUser.employee.primaryBranch) {
        // Assign Reena to main office
        const mainOffice = allBranches.find(b => b.branch_code === '00000');
        if (mainOffice) {
          await Employee.findByIdAndUpdate(reenaUser.employee._id, {
            primaryBranch: mainOffice._id.toString(),
            checkinBranches: [mainOffice._id.toString()],
            updatedAt: new Date()
          });
          console.log(`\nSpecial: Assigned Reena to main office (${mainOffice.name})`);
        }
      }
    } else {
      console.log(`\nWarning: User "Reena" not found`);
    }

    return {
      assignmentCount,
      errors,
      branchDistribution
    };

  } catch (error) {
    console.error('Error assigning user branches:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  require('dotenv').config();
  assignUserBranches()
    .then(result => {
      console.log('\nBranch assignment completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Branch assignment failed:', error);
      process.exit(1);
    });
}

module.exports = assignUserBranches;