// scripts/testLogin.js
// Test script สำหรับทดสอบ login function

const { connectDB } = require('../config/db');
const User = require('../models/User/User');
const Employee = require('../models/HR/Employee');
const UserRole = require('../models/User/UserRole');

async function testCreateSession() {
  try {
    console.log('🔄 Connecting to database...');
    await connectDB();
    console.log('✅ Database connected');

    // หา user ตัวแรก (ไม่ populate เพื่อหลีกเลี่ยง error)
    const user = await User.findOne({});
    if (!user) {
      console.log('❌ No users found in database');
      return;
    }

    console.log('👤 Testing with user:', user.username);

    // ทดสอบ createSession
    const testToken = 'test-token-' + Date.now();
    const testIP = '127.0.0.1';
    const testDevice = 'Test Device';
    const testUserAgent = 'Test User Agent';
    const testDeviceType = 'web';

    console.log('🔄 Testing createSession...');
    await user.createSession(testToken, testIP, testDevice, testUserAgent, testDeviceType);

    console.log('✅ createSession test passed!');

    // ทดสอบ validateSession
    console.log('🔄 Testing validateSession...');
    const validation = user.validateSession(testToken, testIP);
    console.log('✅ validateSession result:', validation);

    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('❌ Stack trace:', error.stack);
    process.exit(1);
  }
}

// เรียกใช้ถ้า run โดยตรง
if (require.main === module) {
  testCreateSession();
}

module.exports = testCreateSession;
