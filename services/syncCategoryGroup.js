// services/syncCategoryGroup.js
const ProductImage = require('../models/Stock/ProductImage');
const BranchStock = require('../models/POS/BranchStock');

/**
 * ซิงค์ข้อมูล category_name จาก ProductImage ไปยัง BranchStock (initial sync)
 */
async function syncAllExisting() {
  const pics = await ProductImage.find().lean();
  console.log(`Found ${pics.length} ProductImage records to sync categories`);

  let totalMatched = 0;
  let totalModified = 0;
  const BATCH_SIZE = 5; // ประมวลผลครั้งละ 5 รายการ
  const DELAY_MS = 100; // หน่วงเวลา 100ms ระหว่างแต่ละ batch

  // แบ่งเป็น batches
  for (let i = 0; i < pics.length; i += BATCH_SIZE) {
    const batch = pics.slice(i, i + BATCH_SIZE);
    console.log(`📦 Processing category batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(pics.length/BATCH_SIZE)} (${batch.length} items)`);

    for (const pic of batch) {
    const {
      name,
      category_name = '',  // ถ้าไม่มีให้เป็นค่าว่าง
      category_group = '' // ถ้าไม่มีให้เป็นค่าว่าง
    } = pic;

    if (!name) continue; // ข้ามถ้าไม่มีชื่อ
    console.log(`Syncing category for ProductImage: "${name}" (${category_name || 'ไม่ระบุหมวดหมู่'})`);

    // สร้าง RegExp เพื่อแมตช์ชื่อแบบ case-insensitive และเว้นวรรครอบๆ ได้
    const regex = new RegExp(`^\\s*${name.trim()}\\s*$`, 'i');

    // 1) หา BranchStock ทั้งหมดที่ name แมตช์ regex
    const matchedStocks = await BranchStock.find(
      { name: regex },
      { _id: 1 } // เราต้องการแค่ _id มาอัปเดตทีละรายการ
    ).lean();

    if (matchedStocks.length === 0) {
      console.log(`  → ไม่มี BranchStock ที่ตรงกับชื่อ "${name}"`);
      continue;
    }

    // 2) อัปเดตทีละ _id
    for (const bs of matchedStocks) {
      const updateData = {
        category_name,
        category_group
      };

      const result = await BranchStock.updateOne(
        { _id: bs._id },
        { $set: updateData }
      );
      totalMatched += result.matchedCount;
      totalModified += result.modifiedCount;
    }

    console.log(`  → Matched: ${matchedStocks.length}, Modified so far: ${totalModified}`);
  }

  // หน่วงเวลาระหว่างแต่ละ batch (ยกเว้น batch สุดท้าย)
  if (i + BATCH_SIZE < pics.length) {
    console.log(`⏳ Waiting ${DELAY_MS}ms before next category batch...`);
    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
  }
  }

  console.log(`✅ Initial category sync completed: ${totalMatched} matched, ${totalModified} modified`);
}

/**
 * ฟังก์ชันหลัก: initial sync + สร้าง change streams ทั้งสองฝั่ง
 */
async function watchAndSync(io) {
  // 1) ทำ initial sync ก่อน (เฉพาะเมื่อเปิดใช้งาน)
  if (process.env.ENABLE_PRODUCT_SYNC === 'true') {
    console.log('⏸️  Skipping initial category sync on startup for better performance');
    console.log('💡 Run manual sync if needed: /api/admin/sync-categories');
  } else {
    console.log('⏸️  Category sync skipped (ENABLE_PRODUCT_SYNC=false)');
  }

  console.log('🔄 Watching ProductImage category changes...');
  // 2) ฟังฝั่ง ProductImage → อัปเดต BranchStock
  const changeStreamPI = ProductImage.watch();
  changeStreamPI.on('change', async change => {
    try {
      if (!['insert', 'update', 'replace'].includes(change.operationType)) return;
      const id = change.documentKey._id;
      const pic = await ProductImage.findById(id).lean();
      if (!pic?.name) return;

      const {
        name,
        category_name = '',
        category_group = ''
      } = pic;

      const updateData = {
        category_name,
        category_group
      };

      const result = await BranchStock.updateMany(
        { name: { $regex: `^\\s*${name.trim()}\\s*$`, $options: 'i' } },
        { $set: updateData }
      );

      if (result.modifiedCount > 0) {
        console.log(`✅ Updated categories for ${result.modifiedCount} BranchStock records for "${name}"`);
        // emit update event
        io.emit('branchStockCategoryUpdated', {
          productImageId: id.toString(),
          fields: updateData
        });
      }
    } catch (err) {
      console.error('❌ Error in ProductImage category changeStream:', err);
    }
  });

  console.log('🔄 Watching BranchStock category changes...');
  // 3) ฟังฝั่ง BranchStock → ซิงก์กลับไป (กรณีสร้างสินค้าใหม่)
  const changeStreamBS = BranchStock.watch();
  changeStreamBS.on('change', async change => {
    try {
      if (change.operationType === 'insert') {
        const newBS = change.fullDocument;
        if (!newBS.name) return;

        // หา ProductImage ที่ชื่อเดียวกัน (case-insensitive)
        const pic = await ProductImage.findOne({
          name: new RegExp(`^\\s*${newBS.name.trim()}\\s*$`, 'i')
        }).lean();
        if (!pic) return;

        // ถ้ามี pic → อัปเดตหมวดหมู่ฝั่ง BranchStock
        const updateData = {
          category_name: pic.category_name || '',
          category_group: pic.category_group || ''
        };

        await BranchStock.updateOne(
          { _id: newBS._id },
          { $set: updateData }
        );
        console.log(`✅ Categories for new BranchStock "${newBS.name}" synced from ProductImage.`);
        io.emit('branchStockCategoryUpdated', {
          branchStockId: newBS._id.toString(),
          fields: updateData
        });
      }
    } catch (err) {
      console.error('❌ Error in BranchStock category changeStream:', err);
    }
  });
}

module.exports = watchAndSync;
module.exports.syncAllExisting = syncAllExisting;
