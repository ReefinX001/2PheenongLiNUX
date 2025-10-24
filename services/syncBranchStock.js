// services/syncBranchStock.js
const ProductImage = require('../models/Stock/ProductImage');
const BranchStock  = require('../models/POS/BranchStock');
const redis = require('redis');

// Redis client for caching (persistent connection)
let redisClient = null;
let isRedisConnected = false;

async function initRedisClient() {
  if (!redisClient && process.env.REDIS_URL) {
    try {
      redisClient = redis.createClient({ url: process.env.REDIS_URL });
      redisClient.on('error', (err) => console.log('Redis sync cache error:', err));
      redisClient.on('connect', () => { isRedisConnected = true; });
      redisClient.on('disconnect', () => { isRedisConnected = false; });

      if (!isRedisConnected) {
        await redisClient.connect();
      }
    } catch (error) {
      console.log('Redis not available for sync cache:', error.message);
      redisClient = null;
    }
  }
  return redisClient;
}

/**
 * สร้าง cache key สำหรับ ProductImage
 */
function getCacheKey(productImageId, version = 'v1') {
  return `sync:product:${productImageId}:${version}`;
}

/**
 * เช็คว่า ProductImage นี้ sync แล้วหรือยัง
 */
async function isSynced(productImageId, currentHash) {
  const client = await initRedisClient();
  if (!client || !isRedisConnected) return false;

  try {
    const cachedHash = await client.get(getCacheKey(productImageId));
    return cachedHash === currentHash;
  } catch (error) {
    console.log('Redis cache check error:', error.message);
    return false;
  }
}

/**
 * บันทึกว่า ProductImage นี้ sync แล้ว
 */
async function markAsSynced(productImageId, hash, ttlSeconds = 3600) {
  const client = await initRedisClient();
  if (!client || !isRedisConnected) return;

  try {
    await client.setEx(getCacheKey(productImageId), ttlSeconds, hash);
  } catch (error) {
    console.log('Redis cache save error:', error.message);
  }
}

/**
 * สร้าง hash จากข้อมูล ProductImage
 */
function createProductHash(productData) {
  const crypto = require('crypto');
  const dataString = JSON.stringify({
    name: productData.name,
    price: productData.price,
    updatedAt: productData.updatedAt,
    productType: productData.productType
  });
  return crypto.createHash('md5').update(dataString).digest('hex');
}

/**
 * ซิงค์เฉพาะ ProductImage ที่มีการเปลี่ยนแปลงหรือยังไม่เคย sync (optimized with Redis caching)
 */
async function syncAllExisting() {
  const pics = await ProductImage.find().lean();
  console.log(`📊 Found ${pics.length} ProductImage records to check for sync`);

  let totalMatched = 0;
  let totalModified = 0;
  let skippedCount = 0;
  const BATCH_SIZE = 10; // เพิ่มขนาด batch เพราะมี cache แล้ว
  const DELAY_MS = 50; // ลดเวลา delay เพราะ sync น้อยลง

  // แบ่งเป็น batches
  for (let i = 0; i < pics.length; i += BATCH_SIZE) {
    const batch = pics.slice(i, i + BATCH_SIZE);
    console.log(`📦 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(pics.length/BATCH_SIZE)} (${batch.length} items)`);

    for (const pic of batch) {
      // สร้าง hash และเช็ค cache ก่อน
      const currentHash = createProductHash(pic);
      const alreadySynced = await isSynced(pic._id.toString(), currentHash);

      if (alreadySynced) {
        skippedCount++;
        console.log(`⏭️  Skipped \"${pic.name}\" (already synced)`);
        continue;
      }
    const {
      name,
      price = 0,
      downAmount = 0,
      downInstallmentCount = 0,
      downInstallment = 0,
      creditThreshold = 0,
      payUseInstallmentCount = 0,
      payUseInstallment = 0,
      pricePayOff = 0,
      docFee = 0,
      image = '',
      purchaseType = [],   // default to empty array
      productType = 'mobile',  // เพิ่ม productType
      boxsetType,             // เพิ่ม boxsetType
      boxsetProducts = [],     // เพิ่ม boxsetProducts
      stockType = 'imei'      // เพิ่ม stockType
    } = pic;

    if (!name) continue;   // ข้ามถ้าไม่มีชื่อ
    console.log(`Syncing ProductImage: "${name}" (${productType}${boxsetType ? ' - ' + boxsetType : ''})`);

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

    // 2) ไหลอัปเดตทีละ _id ด้วย updateOne (ใช้ $set เพื่อแก้ฟิลด์อย่างเดียว)
    for (const bs of matchedStocks) {
      const updateData = {
        price,
        downAmount,
        downInstallmentCount,
        downInstallment,
        creditThreshold,
        payUseInstallmentCount,
        payUseInstallment,
        pricePayOff,
        docFee,
        image,
        purchaseType,
        productType,
        boxsetProducts,
        stockType
      };

      // เพิ่ม boxsetType เฉพาะเมื่อเป็น boxset
      if (productType === 'boxset' && boxsetType) {
        updateData.boxsetType = boxsetType;
      }

      const result = await BranchStock.updateOne(
        { _id: bs._id },
        { $set: updateData }
      );
      totalMatched += result.matchedCount;
      totalModified += result.modifiedCount;
    }

    console.log(`  → Matched: ${matchedStocks.length}, Modified so far: ${totalModified}`);

    // บันทึก cache หลังจาก sync สำเร็จ
    await markAsSynced(pic._id.toString(), currentHash, 3600); // cache 1 ชั่วโมง
  }

  // หน่วงเวลาระหว่างแต่ละ batch (ยกเว้น batch สุดท้าย)
  if (i + BATCH_SIZE < pics.length) {
    console.log(`⏳ Waiting ${DELAY_MS}ms before next batch...`);
    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
  }
  }

  console.log(`✅ Initial BranchStock sync completed:`);
  console.log(`   📊 Total checked: ${pics.length}`);
  console.log(`   ⏭️  Skipped (cached): ${skippedCount}`);
  console.log(`   ✅ Processed: ${pics.length - skippedCount}`);
  console.log(`   📝 Matched: ${totalMatched}, Modified: ${totalModified}`);
}

/**
 * ฟังก์ชันหลัก: initial sync + สร้าง change streams ทั้งสองฝั่ง
 */
async function watchAndSync(io) {
  // 1) ทำ initial sync ก่อน (เฉพาะเมื่อเปิดใช้งาน)
  if (process.env.ENABLE_PRODUCT_SYNC === 'true') {
    console.log('⏸️  Skipping initial sync on startup for better performance');
    console.log('💡 Run manual sync if needed: /api/admin/sync-products');
  } else {
    console.log('⏸️  BranchStock sync skipped (ENABLE_PRODUCT_SYNC=false)');
  }

  console.log('🔄 Watching ProductImage changes...');
  // 2) ฟังฝั่ง ProductImage → อัปเดต BranchStock
  const changeStreamPI = ProductImage.watch();
  changeStreamPI.on('change', async change => {
    try {
      if (!['insert','update','replace'].includes(change.operationType)) return;
      const id = change.documentKey._id;
      const pic = await ProductImage.findById(id).lean();
      if (!pic?.name) return;

      // สร้าง hash และลบ cache เก่าออก (เพื่อให้ sync ใหม่)
      const currentHash = createProductHash(pic);

      // ลบ cache เก่าออก เพื่อบังคับให้ sync ใหม่
      const client = await initRedisClient();
      if (client && isRedisConnected) {
        try {
          await client.del(getCacheKey(id.toString()));
        } catch (error) {
          console.log('Redis cache clear error:', error.message);
        }
      }

      const {
        name,
        price = 0,
        downAmount = 0,
        downInstallmentCount = 0,
        downInstallment = 0,
        creditThreshold = 0,
        payUseInstallmentCount = 0,
        payUseInstallment = 0,
        pricePayOff = 0,
        docFee = 0,
        image = '',
        purchaseType = [],
        productType = 'mobile',
        boxsetType,
        boxsetProducts = [],
        stockType = 'imei'
      } = pic;

      const updateData = {
        price,
        downAmount,
        downInstallmentCount,
        downInstallment,
        creditThreshold,
        payUseInstallmentCount,
        payUseInstallment,
        pricePayOff,
        docFee,
        image,
        purchaseType,
        productType,
        boxsetProducts,
        stockType
      };

      // เพิ่ม boxsetType เฉพาะเมื่อเป็น boxset
      if (productType === 'boxset' && boxsetType) {
        updateData.boxsetType = boxsetType;
      }

      const result = await BranchStock.updateMany(
        { name: { $regex: `^\\s*${name.trim()}\\s*$`, $options: 'i' } },
        { $set: updateData }
      );

      if (result.modifiedCount > 0) {
        console.log(`✅ Updated ${result.modifiedCount} BranchStock records for "${name}"`);

        // บันทึก cache หลังจาก sync สำเร็จ
        await markAsSynced(id.toString(), currentHash, 3600);

        // emit update event with productImageId and updated fields
        io.emit('branchStockUpdated', {
          productImageId: id.toString(),
          fields: updateData
        });
      }
    } catch (err) {
      console.error('❌ Error in ProductImage changeStream:', err);
    }
  });

  console.log('🔄 Watching BranchStock changes...');
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

        // ถ้ามี pic → อัปเดตราคาฝั่ง BranchStock (ที่พึ่งสร้างมา)
        const updateData = {
          price: pic.price || 0,
          downAmount: pic.downAmount || 0,
          downInstallmentCount: pic.downInstallmentCount || 0,
          downInstallment: pic.downInstallment || 0,
          creditThreshold: pic.creditThreshold || 0,
          payUseInstallmentCount: pic.payUseInstallmentCount || 0,
          payUseInstallment: pic.payUseInstallment || 0,
          pricePayOff: pic.pricePayOff || 0,
          docFee: pic.docFee || 0,
          image: pic.image || '',
          purchaseType: pic.purchaseType || [],
          productType: pic.productType || 'mobile',
          boxsetProducts: pic.boxsetProducts || [],
          stockType: pic.stockType || 'imei'
        };

        // เพิ่ม boxsetType เฉพาะเมื่อเป็น boxset
        if (pic.productType === 'boxset' && pic.boxsetType) {
          updateData.boxsetType = pic.boxsetType;
        }

        await BranchStock.updateOne(
          { _id: newBS._id },
          { $set: updateData }
        );
        console.log(`✅ New BranchStock "${newBS.name}" synced from ProductImage (${pic.productType}${pic.boxsetType ? ' - ' + pic.boxsetType : ''}).`);
        io.emit('branchStockUpdated', {
          branchStockId: newBS._id.toString(),
          fields: updateData
        });
      }
    } catch (err) {
      console.error('❌ Error in BranchStock changeStream:', err);
    }
  });
}

module.exports = watchAndSync;
module.exports.syncAllExisting = syncAllExisting;
