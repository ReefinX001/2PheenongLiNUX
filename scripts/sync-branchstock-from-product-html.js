// scripts/sync-branchstock-from-product-html.js
// สคริปต์อัปเดต BranchStock โดยใช้ข้อมูลจาก PO ที่แสดงใน product.html

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const BranchStock = require('../models/POS/BranchStock');
const Product = require('../models/Stock/Product');
// Register models that Product schema references to avoid MissingSchemaError
require('../models/Stock/Supplier');
require('../models/Stock/CategoryGroup');
require('../models/Account/Branch');
require('../models/User/User');

async function syncBranchStockFromProductData() {
  let connection = null;

  try {
    console.log('🔧 เริ่มการซิงค์ BranchStock จากข้อมูล PO...');

    // เชื่อมต่อ MongoDB
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/my-accounting-app';
    connection = await mongoose.connect(mongoUri);
    console.log('✅ เชื่อมต่อ MongoDB สำเร็จ');

    // 1. ดึงข้อมูล BranchStock ทั้งหมด
    const branchStocks = await BranchStock.find({});
    console.log(`📦 พบ BranchStock ทั้งหมด: ${branchStocks.length} รายการ`);

    if (branchStocks.length === 0) {
      console.log('ℹ️  ไม่มี BranchStock ในระบบ');
      return;
    }

    // 2. ดึงข้อมูล Product ทั้งหมด (ที่มี barcode หรือ sku)
    const products = await Product.find({
      $or: [
        { barcode: { $ne: '' } },
        { sku: { $ne: '' } }
      ]
    }).lean();

    console.log(`📋 พบ Product ที่มี barcode/sku: ${products.length} รายการ`);

    if (products.length === 0) {
      console.log('ℹ️  ไม่มี Product ที่มีข้อมูล barcode/sku ในระบบ');
      return;
    }

    // 3. สร้าง lookup map จาก Product
    const poItemsMap = new Map();

    products.forEach(prod => {
      const barcodeKey = prod.barcode ? prod.barcode.toString().trim() : '';
      const skuKey = prod.sku ? prod.sku.toString().trim() : '';

      if (!barcodeKey && !skuKey) return;

      const combinedKey = `${barcodeKey}|${skuKey}`;

      const updateData = {
        poNumber: prod.poNumber || '',
        cost: prod.cost || 0,
        taxType: prod.taxType || '',
        taxRate: prod.taxRate || 0,
        documentNumber: prod.documentNumber || '',
        categoryGroup: prod.categoryGroup ? prod.categoryGroup.toString() : null,
        invoiceNumber: prod.invoiceNumber || '',
        name: prod.name || '',
        brand: prod.brand || '',
        model: prod.model || '',
        category: prod.category || '',
        // supplier name ไม่ populate ในโหมด lean
        supplier: '',
        price: prod.price || 0,
        updated_at: new Date(),
        data_source: 'product_html_sync'
      };

      poItemsMap.set(combinedKey, updateData);
      if (barcodeKey) poItemsMap.set(`barcode:${barcodeKey}`, updateData);
      if (skuKey && skuKey !== 'undefined' && skuKey !== 'null') poItemsMap.set(`sku:${skuKey}`, updateData);
    });

    console.log(`🗺️  สร้าง lookup map จาก Product สำเร็จ: ${poItemsMap.size} รายการ`);

    // 4. อัปเดต BranchStock
    let updateCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;

    for (const stock of branchStocks) {
      try {
        const stockBarcode = stock.barcode ? stock.barcode.toString().trim() : '';
        const stockSku = stock.sku ? stock.sku.toString().trim() : '';

        if (!stockBarcode && !stockSku) {
          console.log(`⚠️  ข้าม: Stock ID ${stock._id} ไม่มี barcode หรือ sku`);
          skippedCount++;
          continue;
        }

        // หาข้อมูลที่ตรงกันจาก PO
        let matchingData = null;

        // ลองหาด้วย combined key ก่อน
        const combinedKey = `${stockBarcode}|${stockSku}`;
        matchingData = poItemsMap.get(combinedKey);

        // ถ้าไม่เจอ ลองหาด้วย barcode เดี่ยว
        if (!matchingData && stockBarcode) {
          matchingData = poItemsMap.get(`barcode:${stockBarcode}`);
        }

        // ถ้าไม่เจอ ลองหาด้วย sku เดี่ยว
        if (!matchingData && stockSku && stockSku !== 'undefined' && stockSku !== 'null') {
          matchingData = poItemsMap.get(`sku:${stockSku}`);
        }

        if (!matchingData) {
          console.log(`❌ ไม่พบข้อมูลใน PO สำหรับ: barcode=${stockBarcode}, sku=${stockSku}`);
          notFoundCount++;
          continue;
        }

        // ตรวจสอบว่าข้อมูลใดต้องการอัปเดต
        const updateFields = {};
        let hasUpdate = false;

        // ตรวจสอบแต่ละฟิลด์ที่ต้องการอัปเดต
        const fieldsToUpdate = [
          'poNumber', 'cost', 'taxType', 'taxRate', 'documentNumber',
          'invoiceNumber', 'name', 'brand', 'model',
          'category', 'supplier', 'price'
        ];

        fieldsToUpdate.forEach(field => {
          if (field === 'supplier' || field === 'categoryGroup') return; // ข้ามฟิลด์ที่ไม่จำเป็น
          const currentValue = stock[field];
          const newValue = matchingData[field];

          // อัปเดตเฉพาะฟิลด์ที่ยังไม่มีข้อมูลหรือมีค่าเป็น 0, null, undefined, ''
          if (!currentValue || currentValue === 0 || currentValue === '' || currentValue === null || currentValue === undefined) {
            if (newValue !== null && newValue !== undefined && newValue !== '') {
              updateFields[field] = newValue;
              hasUpdate = true;
            }
          }
        });

        // อัปเดตข้อมูล metadata เสมอ
        updateFields.updated_at = new Date();
        updateFields.data_source = 'product_html_sync';
        updateFields.last_sync_at = new Date();

        if (hasUpdate) {
          console.log(`🔄 กำลังอัปเดต BranchStock ID: ${stock._id}`);
          console.log(`   - barcode: ${stockBarcode}, sku: ${stockSku}`);
          console.log(`   - ฟิลด์ที่อัปเดต:`, Object.keys(updateFields).filter(k => !['updated_at', 'data_source', 'last_sync_at'].includes(k)));

          const updateResult = await BranchStock.findByIdAndUpdate(
            stock._id,
            { $set: updateFields },
            { new: true, runValidators: true }
          );

          if (updateResult) {
            console.log(`✅ อัปเดตสำเร็จ: ${stock.name || matchingData.name}`);
            updateCount++;
          } else {
            console.error(`❌ อัปเดตไม่สำเร็จ: Stock ID ${stock._id}`);
            skippedCount++;
          }
        } else {
          console.log(`ℹ️  ไม่ต้องอัปเดต: ${stock.name || 'ไม่ระบุชื่อ'} (ข้อมูลครบแล้ว)`);
          skippedCount++;
        }

      } catch (itemError) {
        console.error(`❌ เกิดข้อผิดพลาดในการอัปเดต Stock ID ${stock._id}:`, itemError.message);
        skippedCount++;
      }
    }

    // สรุปผลการอัปเดต
    console.log('\n📊 สรุปการซิงค์ข้อมูล:');
    console.log(`✅ อัปเดตสำเร็จ: ${updateCount} รายการ`);
    console.log(`ℹ️  ข้าม/ไม่ต้องอัปเดต: ${skippedCount} รายการ`);
    console.log(`❌ ไม่พบข้อมูลใน PO: ${notFoundCount} รายการ`);
    console.log(`📦 รวมทั้งหมด: ${branchStocks.length} รายการ`);

  } catch (error) {
    console.error('❌ ข้อผิดพลาดในการซิงค์ข้อมูล:', error);
    throw error;
  } finally {
    if (connection) {
      await mongoose.disconnect();
      console.log('🔌 ปิดการเชื่อมต่อ MongoDB แล้ว');
    }
  }
}

async function checkSyncStatus() {
  let connection = null;

  try {
    console.log('🔍 ตรวจสอบสถานะ BranchStock...');

    // เชื่อมต่อ MongoDB
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/my-accounting-app';
    connection = await mongoose.connect(mongoUri);
    console.log('✅ เชื่อมต่อ MongoDB สำเร็จ');

    // นับจำนวน BranchStock
    const totalStocks = await BranchStock.countDocuments();

    // นับจำนวนที่มี poNumber
    const withPoNumber = await BranchStock.countDocuments({
      poNumber: { $exists: true, $ne: '', $ne: null }
    });

    // นับจำนวนที่มี cost > 0
    const withCost = await BranchStock.countDocuments({
      cost: { $exists: true, $gt: 0 }
    });

    // นับจำนวนที่มีข้อมูลครบถ้วน
    const withCompleteData = await BranchStock.countDocuments({
      $and: [
        { poNumber: { $exists: true, $ne: '', $ne: null } },
        { cost: { $exists: true, $gte: 0 } },
        { name: { $exists: true, $ne: '' } }
      ]
    });

    // ตัวอย่างข้อมูล BranchStock
    const sampleStocks = await BranchStock.find({}, {
      name: 1, barcode: 1, sku: 1, poNumber: 1, cost: 1, updated_at: 1
    }).limit(5);

    console.log('\n📊 สถานะ BranchStock ปัจจุบัน:');
    console.log(`📦 BranchStock ทั้งหมด: ${totalStocks} รายการ`);
    console.log(`📋 มี poNumber: ${withPoNumber} รายการ`);
    console.log(`💰 มี cost > 0: ${withCost} รายการ`);
    console.log(`✅ มีข้อมูลครบถ้วน: ${withCompleteData} รายการ`);
    console.log(`⚠️  ขาดข้อมูล: ${totalStocks - withCompleteData} รายการ (ต้องซิงค์)`);

    console.log('\n🔍 ตัวอย่างข้อมูล BranchStock (5 รายการแรก):');
    sampleStocks.forEach((stock, i) => {
      console.log(`${i+1}. ${stock.name || 'ไม่ระบุชื่อ'}`);
      console.log(`   - barcode: ${stock.barcode || 'ไม่มี'}`);
      console.log(`   - sku: ${stock.sku || 'ไม่มี'}`);
      console.log(`   - poNumber: ${stock.poNumber || 'ไม่มี'}`);
      console.log(`   - cost: ${stock.cost !== undefined ? stock.cost : 'ไม่มี'}`);
      console.log(`   - updated_at: ${stock.updated_at || 'ไม่มี'}`);
    });

    return {
      totalStocks,
      withPoNumber,
      withCost,
      withCompleteData,
      needsSync: totalStocks - withCompleteData
    };

  } catch (error) {
    console.error('❌ ข้อผิดพลาดในการตรวจสอบสถานะ:', error);
    throw error;
  } finally {
    if (connection) {
      await mongoose.disconnect();
      console.log('🔌 ปิดการเชื่อมต่อ MongoDB แล้ว');
    }
  }
}

// รันสคริปต์ตาม argument
async function main() {
  const action = process.argv[2];

  try {
    if (action === 'check') {
      await checkSyncStatus();
    } else if (action === 'sync' || action === 'update') {
      await syncBranchStockFromProductData();
    } else {
      console.log('📋 การใช้งาน:');
      console.log('  npm run sync:product-html:check    - ตรวจสอบสถานะ');
      console.log('  npm run sync:product-html:sync     - ซิงค์ข้อมูล');
      console.log('  npm run sync:product-html          - ซิงค์ข้อมูล (interactive)');

      // Interactive mode
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question('ต้องการทำอะไร? (check/sync): ', async (answer) => {
        try {
          if (answer === 'check') {
            await checkSyncStatus();
          } else if (answer === 'sync') {
            await syncBranchStockFromProductData();
          } else {
            console.log('❌ คำสั่งไม่ถูกต้อง');
          }
        } catch (err) {
          console.error('❌ เกิดข้อผิดพลาด:', err.message);
        } finally {
          rl.close();
        }
      });
    }
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    process.exit(1);
  }
}

// ส่งออกฟังก์ชันสำหรับใช้ใน API
module.exports = {
  syncBranchStockFromProductData,
  checkSyncStatus
};

// รันเฉพาะเมื่อเรียกไฟล์โดยตรง
if (require.main === module) {
  main();
}