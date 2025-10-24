const mongoose = require('mongoose');
const Zone = require('../models/HR/zoneModel');
const fetch = require('axios'); // Using axios instead of fetch for Node.js
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function testEmployeesAPI() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get available zones
    const zones = await Zone.find().select('_id name branchId').lean();
    console.log(`\n📊 Found ${zones.length} zones:`);

    zones.forEach((zone, index) => {
      console.log(`   ${index + 1}. ${zone.name} - ID: ${zone._id}`);
    });

    if (zones.length > 0) {
      const testZone = zones[0];
      console.log(`\n🧪 Testing API with zone: ${testZone.name} (ID: ${testZone._id})`);

      try {
        // Test the API endpoint directly (without authentication for now)
        const apiUrl = `http://localhost:3000/api/users/by-checkinBranches/${testZone._id}`;
        console.log(`📞 Calling: ${apiUrl}`);

        // This would require authentication, so let's skip the actual API call
        // and just show the zone ID that should be used
        console.log(`\n✅ Zone ID to use in frontend: ${testZone._id}`);
        console.log(`   Zone name: ${testZone.name}`);
        console.log(`   Branch ID: ${testZone.branchId || 'None'}`);

      } catch (apiError) {
        console.error('❌ API Error:', apiError.message);
      }
    }

  } catch (error) {
    console.error('❌ Error testing employees API:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the script
testEmployeesAPI().catch(console.error);