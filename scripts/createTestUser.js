const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User/User');
const UserRole = require('../models/User/UserRole');
const Employee = require('../models/HR/Employee');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/accounting';

async function createTestUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if test user already exists - delete and recreate
    const existingUser = await User.findOne({ username: 'testuser' });
    if (existingUser) {
      await User.deleteOne({ username: 'testuser' });
      console.log('🗑️  Deleted existing test user');
    }

    // Find or create admin role
    let adminRole = await UserRole.findOne({ name: 'admin' });
    if (!adminRole) {
      adminRole = new UserRole({
        name: 'admin',
        displayName: 'Administrator',
        permissions: ['*'], // All permissions
        description: 'System Administrator'
      });
      await adminRole.save();
      console.log('✅ Created admin role');
    }

    // Find or create test employee
    let testEmployee = await Employee.findOne({ name: 'Test User' });
    if (!testEmployee) {
      testEmployee = new Employee({
        employeeId: 'EMP001',
        citizenId: '1234567890123',
        name: 'Test User',
        email: 'test@example.com',
        position: 'System Admin',
        department: 'IT',
        phone: '1234567890',
        startDate: new Date(),
        status: 'active'
      });
      await testEmployee.save();
      console.log('✅ Created test employee');
    }

    // Create test user
    const testUser = new User({
      employee: testEmployee._id,
      username: 'testuser',
      password: 'testpass123', // Will be hashed automatically by pre-save middleware
      role: adminRole._id,
      allowedBranches: ['*'],
      checkinBranches: [],
      defaultBranches: []
    });

    await testUser.save();
    console.log('✅ Created test user successfully!');
    console.log('\n🎉 Test credentials:');
    console.log('   Username: testuser');
    console.log('   Password: testpass123');
    console.log('\n✨ You can now login with these credentials!');

  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the script
createTestUser().catch(console.error);