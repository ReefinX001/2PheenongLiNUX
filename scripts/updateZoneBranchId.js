const mongoose = require('mongoose');
const Zone = require('../models/HR/zoneModel');
const Branch = require('../models/Account/Branch');
require('dotenv').config();

// เชื่อมต่อ MongoDB (ใช้ connection string เดียวกับระบบหลัก)
const mongoURI = process.env.MONGO_URI
  || process.env.MONGODB_URI
  || 'mongodb://127.0.0.1:27017/myAccountingDB';

mongoose.connect(mongoURI, {
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 30000,
});

async function updateZoneBranchIds() {
  try {
    console.log('🔄 Starting zone branchId update...');

    // ดึงข้อมูล zones ทั้งหมด
    const zones = await Zone.find({});
    console.log(`📋 Found ${zones.length} zones to update`);

    // ดึงข้อมูล branches ทั้งหมด
    const branches = await Branch.find({});
    console.log(`🏢 Found ${branches.length} branches`);

    // สร้าง mapping จากชื่อสาขาไป branch ID
    const branchMapping = {
      'สำนักงานใหญ่': '68541687f88094540c0e5af1',
      'สาขาหาดใหญ่': '6854179e50af62804785c702',
      'สาขาสตูล': '685418adac950b3b7702249f',
      'สาขาพัทลุง': '68541899ac950b3b7702249b',
      'สาขานครศรีธรรมราช': '685418c0ac950b3b770224a3',
      'สาขาสุไหง-โกลก': '685418e1ac950b3b770224a7',
      'สาขาสายมอ': '685418f1ac950b3b770224aa',
      'สาขาโคกโพธิ์': '68541903ac950b3b770224ae',
      'สาขารือเสาะ': '68541919ac950b3b770224b8',
      'สาขาปาลัส': '68541927ac950b3b770224bb',
      'สาขาเบตง': '68541935ac950b3b770224bf',
      'สาขานราธิวาส': '686c9453ef0d5cb7d1843d51',
      'สาขายะลา': '686c97ba3a844b705b50869a',
      'สาขาบิ๊กซี ยะลา': '686c97f73a844b705b5086bc'
    };

    let updatedCount = 0;

    for (const zone of zones) {
      console.log(`\n🔍 Processing zone: ${zone.name}`);

      // หาชื่อสาขาจากชื่อ zone
      let branchName = null;
      let branchId = null;

      // ตรวจสอบว่าชื่อ zone มีชื่อสาขาอยู่หรือไม่
      for (const [name, id] of Object.entries(branchMapping)) {
        if (zone.name.includes(name)) {
          branchName = name;
          branchId = id;
          break;
        }
      }

      if (branchId) {
        // อัปเดต zone ให้มี branchId และ branchName
        await Zone.findByIdAndUpdate(zone._id, {
          branchId: new mongoose.Types.ObjectId(branchId),
          branchName: branchName
        });

        console.log(`✅ Updated zone "${zone.name}" with branchId: ${branchId} (${branchName})`);
        updatedCount++;
      } else {
        console.log(`⚠️ No matching branch found for zone: ${zone.name}`);
      }
    }

    console.log(`\n🎉 Migration completed! Updated ${updatedCount} out of ${zones.length} zones.`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// รันการ migration
updateZoneBranchIds();
