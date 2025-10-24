const mongoose = require('mongoose');
const User = require('../models/User/User');
const Branch = require('../models/Account/Branch');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/pheenong_acc', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function grantAllBranchAccess(username) {
  try {
    console.log(`🔍 กำลังค้นหาผู้ใช้: ${username}`);

    // ค้นหาผู้ใช้
    const user = await User.findOne({ username })
      .populate('role', 'name allowedPages')
      .populate('allowedBranches', 'name branch_code')
      .populate('checkinBranches', 'name branch_code')
      .populate('defaultBranches', 'name branch_code');

    if (!user) {
      console.log('❌ ไม่พบผู้ใช้');
      return;
    }

    console.log('👤 พบผู้ใช้:', {
      username: user.username,
      role: user.role?.name,
      allowedBranches: user.allowedBranches?.length || 0,
      checkinBranches: user.checkinBranches?.length || 0,
      defaultBranches: user.defaultBranches?.length || 0
    });

    // ดึงสาขาทั้งหมด
    const allBranches = await Branch.find({});
    console.log(`🏢 พบสาขาทั้งหมด ${allBranches.length} สาขา`);

    // อัพเดตสิทธิ์ผู้ใช้
    const branchIds = allBranches.map(b => b._id);

    user.allowedBranches = branchIds;
    user.checkinBranches = branchIds;
    user.defaultBranches = [branchIds[0]]; // เลือกสาขาแรกเป็น default

    await user.save();

    console.log('✅ อัพเดตสิทธิ์สำเร็จ!');
    console.log('📋 ผู้ใช้สามารถเข้าถึงสาขา:');
    allBranches.forEach((branch, index) => {
      console.log(`  ${index + 1}. ${branch.name} (${branch.branch_code})`);
    });

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    mongoose.connection.close();
  }
}

// รับ username จาก command line
const username = process.argv[2];

if (!username) {
  console.log('📝 การใช้งาน: node scripts/grantAllBranchAccess.js <username>');
  console.log('📝 ตัวอย่าง: node scripts/grantAllBranchAccess.js admin2');
  process.exit(1);
}

grantAllBranchAccess(username);
