const mongoose = require('mongoose');
const User = require('../models/User/User');
const Zone = require('../models/HR/zoneModel');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function assignUsersToExistingZones() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all zones
    const zones = await Zone.find().lean();
    console.log(`📊 Found ${zones.length} zones`);

    // Get users who don't have these specific zones
    const mainOfficeZoneId = '68c5a0042549ae919d2b8ea9'; // สำนักงานใหญ่
    const kokphoZoneId = '68c64ac11e806bf6107e96fb'; // สาขาโคกโพธิ์

    // Find users who don't have the main office zone
    const usersWithoutMainZone = await User.find({
      checkinBranches: { $ne: mainOfficeZoneId }
    }).select('username fullName firstName lastName checkinBranches').limit(20);

    console.log(`\n👤 Users without main office zone: ${usersWithoutMainZone.length}`);

    // Add main office zone to first 20 users who don't have it
    let updatedCount = 0;
    for (const user of usersWithoutMainZone.slice(0, 20)) {
      if (!user.checkinBranches) {
        user.checkinBranches = [];
      }

      // Add main office zone if not already present
      if (!user.checkinBranches.includes(mainOfficeZoneId)) {
        user.checkinBranches.push(mainOfficeZoneId);
        await user.save();
        updatedCount++;
        const displayName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
        console.log(`   ✅ Added main office zone to: ${displayName} (${user.username})`);
      }
    }

    // Add kokpho zone to some users too
    const usersWithoutKokphoZone = await User.find({
      checkinBranches: { $ne: kokphoZoneId }
    }).select('username fullName firstName lastName checkinBranches').limit(15);

    let kokphoUpdatedCount = 0;
    for (const user of usersWithoutKokphoZone.slice(0, 15)) {
      if (!user.checkinBranches) {
        user.checkinBranches = [];
      }

      // Add kokpho zone if not already present
      if (!user.checkinBranches.includes(kokphoZoneId)) {
        user.checkinBranches.push(kokphoZoneId);
        await user.save();
        kokphoUpdatedCount++;
        const displayName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
        console.log(`   ✅ Added Kokpho zone to: ${displayName} (${user.username})`);
      }
    }

    console.log(`\n🎉 Summary:`);
    console.log(`   📈 Added main office zone to ${updatedCount} users`);
    console.log(`   📈 Added Kokpho zone to ${kokphoUpdatedCount} users`);

    // Show updated counts
    const mainOfficeCount = await User.countDocuments({ checkinBranches: mainOfficeZoneId });
    const kokphoCount = await User.countDocuments({ checkinBranches: kokphoZoneId });

    console.log(`\n📊 Updated counts:`);
    console.log(`   🏢 Main Office Zone: ${mainOfficeCount} users`);
    console.log(`   🏢 Kokpho Zone: ${kokphoCount} users`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

assignUsersToExistingZones().catch(console.error);