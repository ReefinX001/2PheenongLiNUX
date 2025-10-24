// scripts/seedRoles.js
require('dotenv').config();
const mongoose  = require('mongoose');
const UserRole  = require('../models/UserRole');
const Branch    = require('../models/Branch');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  const roles = [
    {
      name: 'admin',
      permissions:     ['*'],
      allowedPages:    ['*'],    // ทุกหน้า
      allowedBranches: ['*']     // ทุกสาขา
    },
    {
      name: 'accounting',
      permissions:     ['*'],
      allowedPages:    ['accounting'],
      allowedBranches: ['*']
    },
    {
      name: 'hr',
      permissions:     ['*'],
      allowedPages:    ['hr'],
      allowedBranches: ['*']
    },
    {
      name: 'stock',
      permissions:     ['*'],
      allowedPages:    ['stock'],
      allowedBranches: ['*']
    },
    {
      name: 'marketing',
      permissions:     ['*'],
      allowedPages:    ['marketing'],
      allowedBranches: ['*']
    },
    {
      name: 'loan',
      permissions:     ['*'],
      allowedPages:    ['loan'],
      allowedBranches: ['*']
    },
    {
      name: 'pos',
      permissions:     ['*'],
      allowedPages:    ['pos'],  // <— เปลี่ยนตรงนี้
      allowedBranches: ['branch_pattani','branch_hatyai']
    }
  ];

  for (const r of roles) {
    // แปลง allowedBranches เป็น ObjectId list (หรือ empty array ถ้า '*')
    let branchIds = [];
    if (!r.allowedBranches.includes('*')) {
      branchIds = (
        await Branch.find({ branch_code: { $in: r.allowedBranches } })
                      .select('_id')
      ).map(b => b._id);
    }

    await UserRole.updateOne(
      { name: r.name },
      {
        $set: {
          permissions:     r.permissions,
          allowedPages:    r.allowedPages,
          allowedBranches: branchIds
        }
      },
      { upsert: true }
    );
    console.log(`✔️ อัปเดต role: ${r.name}`);
  }

  console.log('✅ ทำการ seed roles เรียบร้อยแล้ว');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ เกิดข้อผิดพลาดขณะ seed roles:', err);
  process.exit(1);
});
