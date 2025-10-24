// Script to generate a test user and authentication token
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import models
const User = require('../models/User/User');
const UserRole = require('../models/User/UserRole');
const Employee = require('../models/HR/Employee');

const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_SECRET_KEY';

// Connect to database
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/my-accounting-app', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function generateTestUser() {
  try {
    await connectDB();

    // Check if test user already exists
    let testUser = await User.findOne({ username: 'testuser' });

    if (!testUser) {
      console.log('📝 Creating test user...');

      // Find or create admin role
      let adminRole = await UserRole.findOne({ name: 'Admin' });
      if (!adminRole) {
        adminRole = await UserRole.create({
          name: 'Admin',
          description: 'Administrator role with full access',
          permissions: ['all'],
          isActive: true
        });
        console.log('✅ Created Admin role');
      }

      // Create test employee
      const employee = await Employee.create({
        employeeId: 'EMP-TEST-001',
        name: 'ทดสอบ ระบบ',
        prefix: 'นาย',
        firstName: 'ทดสอบ',
        lastName: 'ระบบ',
        nickname: 'Test',
        citizenId: '1234567890123',
        position: 'System Administrator',
        department: 'IT',
        email: 'test@example.com',
        phone: '0999999999',
        status: 'active',
        startDate: new Date()
      });
      console.log('✅ Created test employee');

      // Create test user
      const hashedPassword = await bcrypt.hash('test123456', 10);
      testUser = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: hashedPassword,
        role: adminRole._id,
        employee: employee._id,
        isActive: true,
        isBlocked: false
      });
      console.log('✅ Created test user');
    } else {
      console.log('✅ Test user already exists');
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: testUser._id,
        username: testUser.username,
        email: testUser.email
      },
      JWT_SECRET,
      { expiresIn: '365d' } // Long expiration for testing
    );

    // Update user with current session
    testUser.currentSession = {
      token: token,
      ip: '127.0.0.1',
      userAgent: 'Test Script',
      loginAt: new Date(),
      lastActivity: new Date()
    };
    await testUser.save();
    console.log('✅ Updated user session');

    console.log('\n' + '='.repeat(60));
    console.log('🎉 TEST USER CREDENTIALS:');
    console.log('='.repeat(60));
    console.log('Username: testuser');
    console.log('Password: test123456');
    console.log('\n📋 Authentication Token (copy this for testing):');
    console.log('-'.repeat(60));
    console.log(token);
    console.log('-'.repeat(60));
    console.log('\n💡 To use in browser console:');
    console.log(`localStorage.setItem('authToken', '${token}');`);
    console.log('\n💡 To use with curl:');
    console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/installment/dashboard/trends`);
    console.log('='.repeat(60));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating test user:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  generateTestUser();
}

module.exports = generateTestUser;