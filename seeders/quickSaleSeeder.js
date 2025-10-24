// seeders/quickSaleSeeder.js
const mongoose = require('mongoose');
const QuickSale = require('../models/QuickSale');

// Sample data for testing backdated purchase order functionality
const sampleQuickSales = [
  {
    name: 'iPhone 15 Pro Max 256GB',
    brand: 'Apple',
    imei: '356789012345678',
    cost: 42000,
    price: 45000,
    category: 'มือถือ',
    description: 'iPhone 15 Pro Max สีไททาเนียมธรรมชาติ',
    branchCode: 'PATTANI',
    branchName: 'สาขาปัตตานี',
    urgent: true,
    status: 'pending_po',
    poCreated: false,
    addedByName: 'พนักงานขาย A',
    notes: 'ลูกค้าต้องการเร่งด่วน',
    metadata: {
      priority: 'urgent',
      salesChannel: 'walk_in'
    }
  },
  {
    name: 'Samsung Galaxy S24 Ultra 512GB',
    brand: 'Samsung',
    imei: '356789012345679',
    cost: 38000,
    price: 41000,
    category: 'มือถือ',
    description: 'Samsung Galaxy S24 Ultra สีเทา',
    branchCode: 'PATTANI',
    branchName: 'สาขาปัตตานี',
    urgent: true,
    status: 'pending_po',
    poCreated: false,
    addedByName: 'พนักงานขาย B',
    notes: 'ออเดอร์พิเศษ',
    metadata: {
      priority: 'high',
      salesChannel: 'online'
    }
  },
  {
    name: 'AirPods Pro (2nd generation)',
    brand: 'Apple',
    imei: '356789012345680',
    cost: 8500,
    price: 9500,
    category: 'อุปกรณ์เสริม',
    description: 'หูฟัง AirPods Pro รุ่นใหม่',
    branchCode: 'PATTANI',
    branchName: 'สาขาปัตตานี',
    urgent: true,
    status: 'pending_po',
    poCreated: false,
    addedByName: 'พนักงานขาย A',
    notes: 'ของแถมสำหรับลูกค้า VIP',
    metadata: {
      priority: 'medium',
      salesChannel: 'walk_in'
    }
  },
  {
    name: 'Xiaomi Redmi Note 13 Pro',
    brand: 'Xiaomi',
    imei: '356789012345681',
    cost: 12000,
    price: 13500,
    category: 'มือถือ',
    description: 'Xiaomi Redmi Note 13 Pro สีน้ำเงิน',
    branchCode: 'PATTANI',
    branchName: 'สาขาปัตตานี',
    urgent: true,
    status: 'pending_po',
    poCreated: false,
    addedByName: 'พนักงานขาย C',
    notes: 'สินค้าขายดี ต้องเติมสต๊อก',
    metadata: {
      priority: 'urgent',
      salesChannel: 'phone'
    }
  },
  {
    name: 'Power Bank 20000mAh',
    brand: 'Anker',
    imei: '356789012345682',
    cost: 1200,
    price: 1500,
    category: 'อุปกรณ์เสริม',
    description: 'Power Bank Anker PowerCore 20000mAh',
    branchCode: 'PATTANI',
    branchName: 'สาขาปัตตานี',
    urgent: false,
    status: 'pending_po',
    poCreated: false,
    addedByName: 'พนักงานขาย B',
    notes: 'อุปกรณ์เสริม',
    metadata: {
      priority: 'low',
      salesChannel: 'walk_in'
    }
  }
];

async function seedQuickSales() {
  try {
    console.log('🌱 Starting Quick Sale seeding...');

    // Clear existing data
    await QuickSale.deleteMany({});
    console.log('🗑️ Cleared existing quick sale data');

    // Get a sample user ID for addedBy field
    const User = require('../models/User');
    const sampleUser = await User.findOne().limit(1);

    if (!sampleUser) {
      console.warn('⚠️ No users found in database. Creating sample user...');

      // Create a sample user if none exists
      const bcrypt = require('bcrypt');
      const newUser = new User({
        name: 'ผู้จัดการสาขา',
        username: 'manager',
        email: 'manager@pattani.com',
        password: await bcrypt.hash('123456', 10),
        role: 'manager',
        branchCode: 'PATTANI',
        isActive: true
      });

      const savedUser = await newUser.save();
      sampleUser = savedUser;
      console.log('✅ Sample user created');
    }

    // Add addedBy field to all sample data
    const quickSalesToInsert = sampleQuickSales.map(item => ({
      ...item,
      addedBy: sampleUser._id,
      createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random dates within last 7 days
      updatedAt: new Date()
    }));

    // Insert sample data
    const insertedItems = await QuickSale.insertMany(quickSalesToInsert);
    console.log(`✅ Inserted ${insertedItems.length} quick sale items`);

    // Display summary
    console.log('\n📊 Quick Sale Seeder Summary:');
    console.log(`Total items: ${insertedItems.length}`);
    console.log(`Items by category:`);

    const stats = await QuickSale.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalValue: { $sum: '$cost' }
        }
      }
    ]);

    stats.forEach(stat => {
      console.log(`  - ${stat._id}: ${stat.count} items (฿${stat.totalValue.toLocaleString()})`);
    });

    console.log('\n🎉 Quick Sale seeding completed successfully!');
    return insertedItems;

  } catch (error) {
    console.error('❌ Error seeding quick sales:', error);
    throw error;
  }
}

// Export for use in other seeders or standalone execution
module.exports = { seedQuickSales, sampleQuickSales };

// Allow running this seeder directly
if (require.main === module) {
  // Connect to MongoDB
  const connectDB = require('../config/db');

  (async () => {
    try {
      await connectDB();
      await seedQuickSales();
      process.exit(0);
    } catch (error) {
      console.error('Seeding failed:', error);
      process.exit(1);
    }
  })();
}