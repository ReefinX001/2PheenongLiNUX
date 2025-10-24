require('dotenv').config();
const mongoose = require('mongoose');
const Attendance = require('./models/HR/Attendance');
const User = require('./models/User/User');
const Branch = require('./models/Account/Branch');

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

mongoose.connect(mongoUri).then(async () => {
  console.log('✅ Connected to MongoDB');

  // ดึงข้อมูล attendance ล่าสุด 5 รายการ
  const records = await Attendance.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('user', 'username')
    .populate('branch', 'name')
    .lean();

  console.log('\n📊 Latest 5 Attendance Records:\n');
  records.forEach((record, index) => {
    console.log(`${index + 1}. User: ${record.user?.username || 'N/A'}`);
    console.log(`   Branch: ${record.branch?.name || 'N/A'}`);
    console.log(`   Check In: ${record.checkIn}`);
    console.log(`   Check Out: ${record.checkOut || 'Not yet'}`);
    console.log(`   Location: lat=${record.location?.latitude}, lng=${record.location?.longitude}`);
    console.log(`   Created: ${record.createdAt}`);
    console.log('');
  });

  console.log(`Total records found: ${records.length}`);

  mongoose.connection.close();
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
