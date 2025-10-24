// create-reena-employee.js
const mongoose = require('mongoose');
const User = require('./models/User/User');
const Employee = require('./models/HR/Employee');
const Branch = require('./models/Account/Branch');

async function createReenaEmployee() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/accounting-system');
    console.log('Connected to MongoDB');

    // Find Reena user
    const reenaUser = await User.findOne({ username: 'Reena' });
    if (!reenaUser) {
      console.log('Reena user not found');
      return;
    }

    console.log(`Found Reena user: ${reenaUser.username}`);

    // Check if she already has an employee record
    if (reenaUser.employee) {
      console.log('Reena already has an employee record');
      const employee = await Employee.findById(reenaUser.employee);
      if (employee) {
        console.log(`Employee: ${employee.name}, Branch: ${employee.primaryBranch}`);
        return;
      } else {
        console.log('Employee record is missing, will create new one');
      }
    }

    // Get main office branch for assignment
    const mainOffice = await Branch.findOne({ branch_code: '00000' });
    if (!mainOffice) {
      console.log('Main office branch not found');
      return;
    }

    // Find admin user for createdBy
    const adminUser = await User.findOne({ username: 'admin' });
    const createdById = adminUser ? adminUser._id : reenaUser._id;

    // Create employee record for Reena
    const newEmployee = new Employee({
      name: 'รีนา',
      employeeId: 'EMP-REENA-001',
      department: 'บัญชี',
      position: 'เจ้าหน้าที่บัญชี',
      email: reenaUser.email || 'reena@company.com',
      phone: '0800000001',
      citizenId: '1234567890123',
      primaryBranch: mainOffice._id,
      checkinBranches: [mainOffice._id],
      startDate: new Date(),
      status: 'active',
      createdBy: createdById
    });

    await newEmployee.save();
    console.log('Created employee record for Reena');

    // Link employee to user
    await User.findByIdAndUpdate(reenaUser._id, {
      employee: newEmployee._id
    });

    console.log('Linked employee record to Reena user');
    console.log(`Employee ID: ${newEmployee._id}`);
    console.log(`Assigned to branch: ${mainOffice.branch_code} (${mainOffice.name})`);

    return {
      user: reenaUser,
      employee: newEmployee,
      branch: mainOffice
    };

  } catch (error) {
    console.error('Error creating Reena employee:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  require('dotenv').config();
  createReenaEmployee()
    .then(() => {
      console.log('Reena employee creation completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed to create Reena employee:', error);
      process.exit(1);
    });
}

module.exports = createReenaEmployee;