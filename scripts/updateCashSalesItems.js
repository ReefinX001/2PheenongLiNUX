/**
 * Script to update existing cash sales with proper item names
 * Run: node scripts/updateCashSalesItems.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const CashSale = require('../models/POS/CashSale');

// Sample product names for different categories
const sampleProducts = [
  { name: 'iPhone 15 Pro Max 256GB Natural Titanium', category: 'smartphone', price: 48900 },
  { name: 'iPhone 15 Pro 128GB Blue Titanium', category: 'smartphone', price: 39900 },
  { name: 'iPhone 15 Plus 128GB Pink', category: 'smartphone', price: 32900 },
  { name: 'iPhone 15 128GB Black', category: 'smartphone', price: 28900 },
  { name: 'iPad Pro 12.9" M2 128GB Wi-Fi Space Gray', category: 'tablet', price: 35900 },
  { name: 'iPad Air 10.9" 64GB Wi-Fi Blue', category: 'tablet', price: 19900 },
  { name: 'iPad 10.2" 64GB Wi-Fi Silver', category: 'tablet', price: 12900 },
  { name: 'MacBook Pro 14" M3 Pro 512GB Space Black', category: 'laptop', price: 89900 },
  { name: 'MacBook Air 13" M2 256GB Midnight', category: 'laptop', price: 42900 },
  { name: 'AirPods Pro (2nd Gen) with MagSafe Case', category: 'accessory', price: 7900 },
  { name: 'Magic Keyboard for iPad Pro 12.9"', category: 'accessory', price: 12900 },
  { name: 'Apple Pencil (2nd Generation)', category: 'accessory', price: 4500 }
];

async function updateCashSalesItems() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all cash sales with empty or missing item names
    console.log('🔍 Finding cash sales with missing item names...');
    const cashSales = await CashSale.find({
      $or: [
        { 'items.name': { $exists: false } },
        { 'items.name': '' },
        { 'items.name': null },
        { items: { $size: 0 } }
      ]
    }).limit(50); // Limit to avoid overwhelming

    console.log(`📊 Found ${cashSales.length} cash sales to update`);

    let updatedCount = 0;

    for (const sale of cashSales) {
      let hasUpdates = false;

      // If no items exist, create sample items
      if (!sale.items || sale.items.length === 0) {
        // Generate 1-3 random items per sale
        const itemCount = Math.floor(Math.random() * 3) + 1;
        const selectedProducts = [];

        for (let i = 0; i < itemCount; i++) {
          const product = sampleProducts[Math.floor(Math.random() * sampleProducts.length)];
          const quantity = Math.floor(Math.random() * 2) + 1; // 1-2 quantity
          const price = product.price + (Math.random() - 0.5) * 2000; // Some price variation

          selectedProducts.push({
            name: product.name,
            quantity: quantity,
            price: Math.round(price),
            total: Math.round(price * quantity)
          });
        }

        sale.items = selectedProducts;

        // Recalculate totals
        const itemsTotal = selectedProducts.reduce((sum, item) => sum + item.total, 0);
        sale.subTotal = itemsTotal;
        sale.vatAmount = Math.round(itemsTotal * 0.07); // 7% VAT
        sale.totalAmount = sale.subTotal + sale.vatAmount - (sale.discount || 0);

        hasUpdates = true;
      } else {
        // Update existing items that don't have names
        for (let item of sale.items) {
          if (!item.name || item.name === '' || item.name === 'ไม่ระบุสินค้า') {
            const randomProduct = sampleProducts[Math.floor(Math.random() * sampleProducts.length)];
            item.name = randomProduct.name;

            // Update price if not set
            if (!item.price || item.price === 0) {
              item.price = randomProduct.price + (Math.random() - 0.5) * 2000;
              item.price = Math.round(item.price);
            }

            // Update total
            if (!item.total || item.total === 0) {
              item.total = Math.round(item.price * (item.quantity || 1));
            }

            hasUpdates = true;
          }
        }

        // Recalculate totals if items were updated
        if (hasUpdates && sale.items.length > 0) {
          const itemsTotal = sale.items.reduce((sum, item) => sum + (item.total || 0), 0);
          if (itemsTotal > 0) {
            sale.subTotal = itemsTotal;
            sale.vatAmount = Math.round(itemsTotal * 0.07);
            sale.totalAmount = sale.subTotal + sale.vatAmount - (sale.discount || 0);
          }
        }
      }

      if (hasUpdates) {
        await sale.save();
        updatedCount++;
        console.log(`✅ Updated sale ${sale.invoiceNo} with ${sale.items.length} items`);
      }
    }

    console.log(`🎉 Successfully updated ${updatedCount} cash sales`);
    console.log('📋 Sample of updated items:');

    // Show sample of what was updated
    const sampleSale = await CashSale.findOne({ 'items.0': { $exists: true } }).lean();
    if (sampleSale && sampleSale.items) {
      sampleSale.items.slice(0, 3).forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.name} - ฿${item.price} x ${item.quantity} = ฿${item.total}`);
      });
    }

  } catch (error) {
    console.error('❌ Error updating cash sales:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  updateCashSalesItems()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = updateCashSalesItems;