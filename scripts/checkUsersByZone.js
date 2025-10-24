const mongoose = require('mongoose');
const User = require('../models/User/User');
const Zone = require('../models/HR/zoneModel');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function checkUsersByZone() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all zones
    const zones = await Zone.find().lean();
    console.log(`\n📊 Found ${zones.length} zones:`);

    for (const zone of zones) {
      console.log(`\n🏢 Zone: ${zone.name} (${zone._id})`);

      // Count users with this zone in their checkinBranches
      const usersWithZone = await User.find({
        checkinBranches: zone._id
      }).select('username fullName firstName lastName checkinBranches').lean();

      console.log(`   👥 Users with this zone in checkinBranches: ${usersWithZone.length}`);

      // Show first 10 users
      usersWithZone.slice(0, 10).forEach((user, index) => {
        const displayName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
        console.log(`     ${index + 1}. ${displayName} (${user.username})`);
      });

      if (usersWithZone.length > 10) {
        console.log(`     ... and ${usersWithZone.length - 10} more`);
      }
    }

    // Check if users have multiple zones
    console.log(`\n🔍 Checking users with multiple zones:`);
    const usersWithMultipleZones = await User.find({
      checkinBranches: { $exists: true, $ne: [] }
    }).select('username fullName firstName lastName checkinBranches').lean();

    console.log(`\n📊 Users with checkinBranches (total: ${usersWithMultipleZones.length}):`);

    // Group by number of zones
    const zoneCountMap = {};
    usersWithMultipleZones.forEach(user => {
      const count = user.checkinBranches?.length || 0;
      zoneCountMap[count] = (zoneCountMap[count] || 0) + 1;
    });

    Object.entries(zoneCountMap).forEach(([count, users]) => {
      console.log(`   ${users} users have ${count} zone(s)`);
    });

    // Show some examples of users with their zones
    console.log(`\n👤 Example users and their zones:`);
    usersWithMultipleZones.slice(0, 10).forEach((user, index) => {
      const displayName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
      console.log(`   ${index + 1}. ${displayName} (${user.username}): ${user.checkinBranches?.length || 0} zones`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

checkUsersByZone().catch(console.error);