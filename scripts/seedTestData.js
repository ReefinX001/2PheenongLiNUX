const mongoose = require('mongoose');
const Zone = require('../models/HR/zoneModel');
const User = require('../models/User/User');
const Branch = require('../models/Account/Branch');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/accounting';

async function seedTestData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if zones already exist
    const existingZones = await Zone.find();
    console.log(`📊 Found ${existingZones.length} existing zones`);

    if (existingZones.length === 0) {
      // Create test branches first
      const testBranches = await Branch.find().limit(3);
      console.log(`📊 Found ${testBranches.length} branches`);

      if (testBranches.length === 0) {
        // Create test branches
        const branchData = [
          { name: 'สาขาหลัก', branch_code: 'MAIN', address: '123 ถนนสุขุมวิท กรุงเทพฯ' },
          { name: 'สาขาลาดพร้าว', branch_code: 'LPR', address: '456 ถนนลาดพร้าว กรุงเทพฯ' },
          { name: 'สาขาสีลม', branch_code: 'SLM', address: '789 ถนนสีลม กรุงเทพฯ' }
        ];

        for (const branch of branchData) {
          const newBranch = new Branch(branch);
          await newBranch.save();
          testBranches.push(newBranch);
        }
        console.log(`✅ Created ${branchData.length} test branches`);
      }

      // Create test zones
      const zoneData = [
        {
          name: 'พื้นที่เช็คอิน - สาขาหลัก',
          center: { latitude: 13.7563, longitude: 100.5018 }, // Bangkok
          radius: 100,
          branchId: testBranches[0]._id,
          branchName: testBranches[0].name,
          isActive: true
        },
        {
          name: 'พื้นที่เช็คอิน - สาขาลาดพร้าว',
          center: { latitude: 13.7844, longitude: 100.5699 }, // Lat Phrao
          radius: 150,
          branchId: testBranches[1]._id,
          branchName: testBranches[1].name,
          isActive: true
        },
        {
          name: 'พื้นที่เช็คอิน - สาขาสีลม',
          center: { latitude: 13.7249, longitude: 100.5342 }, // Silom
          radius: 120,
          branchId: testBranches[2]._id,
          branchName: testBranches[2].name,
          isActive: true
        }
      ];

      for (const zone of zoneData) {
        const newZone = new Zone(zone);
        await newZone.save();
        console.log(`✅ Created zone: ${zone.name}`);
      }

      console.log(`✅ Created ${zoneData.length} test zones`);
    }

    // Check and update users with checkinBranches
    const zones = await Zone.find().populate('branchId');
    const users = await User.find().limit(10);

    console.log(`📊 Found ${users.length} users`);

    if (users.length > 0 && zones.length > 0) {
      // Assign zones to users randomly
      let updatedUsers = 0;
      for (const user of users) {
        if (!user.checkinBranches || user.checkinBranches.length === 0) {
          // Assign random zone(s) to user
          const randomZones = zones.slice(0, Math.floor(Math.random() * zones.length) + 1);
          user.checkinBranches = randomZones.map(z => z._id);
          await user.save();
          updatedUsers++;
          console.log(`✅ Updated user ${user.username} with ${user.checkinBranches.length} zones`);
        }
      }
      console.log(`✅ Updated ${updatedUsers} users with checkin zones`);
    }

    console.log('🎉 Test data seeding completed!');

    // Display summary
    const finalZoneCount = await Zone.countDocuments();
    const usersWithZones = await User.countDocuments({ checkinBranches: { $ne: [] } });

    console.log('\n📊 Summary:');
    console.log(`   Zones: ${finalZoneCount}`);
    console.log(`   Users with zones: ${usersWithZones}`);

  } catch (error) {
    console.error('❌ Error seeding test data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the script
seedTestData().catch(console.error);