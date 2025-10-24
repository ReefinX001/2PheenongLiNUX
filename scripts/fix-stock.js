const mongoose = require('mongoose');
const Stock = require('../models/Stock/Stock');
const BranchStock = require('../models/POS/BranchStock');
require('dotenv').config();

async function fixStock() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/accounting', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // ค้นหา BranchStock ที่มีสินค้าผ่อน
    const branchStocks = await BranchStock.find({
      purchaseType: 'installment',
      stock_value: { $gt: 0 }
    }).limit(10);

    console.log(`Found ${branchStocks.length} branch stock items with installment`);

    for (const bs of branchStocks) {
      // ตรวจสอบว่ามี Stock record หรือยัง
      const existingStock = await Stock.findOne({
        product_id: bs.product_id,
        branch_code: bs.branch_code
      });

      if (!existingStock && bs.product_id) {
        // สร้าง Stock record ใหม่
        const newStock = new Stock({
          product_id: bs.product_id,
          branch_code: bs.branch_code,
          quantity: bs.stock_value || 0,
          imei: bs.imei || '',
          updated_by: null
        });

        await newStock.save();
        console.log(`✅ Created stock for product ${bs.product_id} (${bs.name}) in branch ${bs.branch_code} with quantity ${bs.stock_value}`);
      } else if (existingStock) {
        // อัปเดตจำนวนให้ตรงกับ BranchStock
        if (existingStock.quantity !== bs.stock_value) {
          existingStock.quantity = bs.stock_value;
          await existingStock.save();
          console.log(`📝 Updated stock for product ${bs.product_id} (${bs.name}) to quantity ${bs.stock_value}`);
        } else {
          console.log(`✓ Stock already exists for ${bs.name} with correct quantity`);
        }
      } else {
        console.log(`⚠️ BranchStock ${bs.name} has no product_id`);
      }
    }

    // ตรวจสอบ specific product
    const specificProductId = '68721e3c37da42f5e3682947';
    console.log(`\n🔍 Checking specific product ID: ${specificProductId}`);

    // ค้นหาใน BranchStock
    const specificBS = await BranchStock.findOne({
      product_id: new mongoose.Types.ObjectId(specificProductId)
    });

    if (specificBS) {
      console.log(`Found in BranchStock: ${specificBS.name}, branch: ${specificBS.branch_code}, stock: ${specificBS.stock_value}`);

      // ตรวจสอบใน Stock
      const specificStock = await Stock.findOne({
        product_id: new mongoose.Types.ObjectId(specificProductId),
        branch_code: specificBS.branch_code
      });

      if (!specificStock) {
        // สร้าง Stock record
        const newStock = new Stock({
          product_id: specificProductId,
          branch_code: specificBS.branch_code,
          quantity: specificBS.stock_value || 0,
          imei: specificBS.imei || ''
        });
        await newStock.save();
        console.log(`✅ Created stock record for product ${specificProductId}`);
      } else {
        console.log(`Stock exists: quantity ${specificStock.quantity}`);
      }
    } else {
      console.log(`❌ Product ID ${specificProductId} not found in BranchStock`);

      // ค้นหาด้วย _id แทน
      const bsById = await BranchStock.findById(specificProductId);
      if (bsById) {
        console.log(`⚠️ Found as BranchStock._id (not product_id): ${bsById.name}`);
        console.log(`   Actual product_id: ${bsById.product_id}`);

        if (bsById.product_id) {
          // สร้าง Stock ด้วย product_id ที่ถูกต้อง
          const stock = await Stock.findOneAndUpdate(
            {
              product_id: bsById.product_id,
              branch_code: bsById.branch_code
            },
            {
              quantity: bsById.stock_value || 0,
              imei: bsById.imei || ''
            },
            { upsert: true, new: true }
          );
          console.log(`✅ Created/Updated stock for correct product_id: ${bsById.product_id}`);
        }
      }
    }

    console.log('\n✅ Stock synchronization completed');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the fix
fixStock();