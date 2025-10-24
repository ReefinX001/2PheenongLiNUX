// Test script to check Transfer data in database
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Transfer = require('../models/Stock/Transfer');
const Branch = require('../models/Account/Branch');
const User = require('../models/User');

async function testTransfers() {
  try {
    console.log('🚀 Testing Transfer data...');

    // Connect to MongoDB
    const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/my-accounting-app';
    await mongoose.connect(dbURI);
    console.log('✅ Connected to MongoDB');

    // Check if Transfer collection exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    const transferCollection = collections.find(col => col.name === 'transfers');

    if (!transferCollection) {
      console.log('⚠️ Transfer collection does not exist');
      console.log('📋 Available collections:', collections.map(c => c.name));

      // Create a sample transfer for testing
      console.log('🔧 Creating sample transfer...');

      // Find or create sample branch and user
      let sampleBranch = await Branch.findOne();
      if (!sampleBranch) {
        sampleBranch = new Branch({
          name: 'สำนักงานใหญ่',
          branch_code: '00001',
          address: '123 ถนนทดสอบ',
          phone: '02-123-4567'
        });
        await sampleBranch.save();
        console.log('✅ Created sample branch');
      }

      let sampleUser = await User.findOne();
      if (!sampleUser) {
        sampleUser = new User({
          username: 'testuser',
          email: 'test@example.com',
          password: 'hashedpassword',
          firstName: 'Test',
          lastName: 'User'
        });
        await sampleUser.save();
        console.log('✅ Created sample user');
      }

      // Create sample transfer
      const sampleTransfer = new Transfer({
        transferNo: 'TRF-TEST-001',
        transferDate: new Date(),
        fromBranch: sampleBranch._id,
        toBranch: sampleBranch._id,
        sender: sampleUser._id,
        receiver: sampleUser._id,
        items: [{
          id: 'TEST001',
          name: 'Test Product',
          brand: 'Test Brand',
          quantity: 1
        }],
        status: 'pending',
        note: 'Test transfer for debugging',
        createdBy: sampleUser._id
      });

      await sampleTransfer.save();
      console.log('✅ Created sample transfer:', sampleTransfer.transferNo);
    }

    // Count total transfers
    const totalTransfers = await Transfer.countDocuments();
    console.log('📊 Total transfers in database:', totalTransfers);

    // Get sample transfers with populate
    console.log('🔍 Testing Transfer.find with populate...');

    const transfers = await Transfer.find()
      .limit(5)
      .populate({
        path: 'fromBranch',
        select: 'name branch_code address phone',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'toBranch',
        select: 'name branch_code address phone',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'sender',
        select: 'username fullName firstName lastName employee',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'receiver',
        select: 'username fullName firstName lastName employee',
        options: { strictPopulate: false }
      })
      .lean();

    console.log('✅ Successfully retrieved', transfers.length, 'transfers');

    if (transfers.length > 0) {
      console.log('📋 Sample transfer structure:');
      console.log(JSON.stringify(transfers[0], null, 2));
    }

    // Test the exact query from getTransfers
    console.log('🧪 Testing exact getTransfers query...');

    const criteria = {};
    const page = 1;
    const limit = 10;

    const testTransfers = await Transfer.find(criteria)
      .sort({ transferDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: 'fromBranch',
        select: 'name branch_code address phone',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'toBranch',
        select: 'name branch_code address phone',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'sender',
        select: 'username fullName firstName lastName employee',
        options: { strictPopulate: false },
        populate: {
          path: 'employee',
          select: 'name position',
          options: { strictPopulate: false }
        }
      })
      .populate({
        path: 'receiver',
        select: 'username fullName firstName lastName employee',
        options: { strictPopulate: false },
        populate: {
          path: 'employee',
          select: 'name position',
          options: { strictPopulate: false }
        }
      })
      .populate({
        path: 'preparedBy',
        select: 'username fullName firstName lastName employee',
        options: { strictPopulate: false },
        populate: {
          path: 'employee',
          select: 'name position',
          options: { strictPopulate: false }
        }
      })
      .populate({
        path: 'receivedBy',
        select: 'username fullName firstName lastName employee',
        options: { strictPopulate: false },
        populate: {
          path: 'employee',
          select: 'name position',
          options: { strictPopulate: false }
        }
      })
      .populate({
        path: 'cancelledBy',
        select: 'username fullName firstName lastName employee',
        options: { strictPopulate: false },
        populate: {
          path: 'employee',
          select: 'name position',
          options: { strictPopulate: false }
        }
      })
      .lean();

    console.log('✅ getTransfers query test successful, found', testTransfers.length, 'transfers');

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run test
if (require.main === module) {
  testTransfers();
}

module.exports = { testTransfers };
