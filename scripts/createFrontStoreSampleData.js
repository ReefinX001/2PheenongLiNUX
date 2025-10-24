// Script to create sample data for FrontStore
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Category = require('../models/FrontStore/Category');
const Promotion = require('../models/FrontStore/Promotion');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Sample categories data
const sampleCategories = [
  {
    name: 'iPhone',
    name_en: 'iPhone',
    description: 'สมาร์ทโฟนระดับพรีเมียมจาก Apple',
    color: '#007AFF',
    order: 1,
    isActive: true
  },
  {
    name: 'iPad',
    name_en: 'iPad',
    description: 'แท็บเล็ตที่มีประสิทธิภาพสูง',
    color: '#5856D6',
    order: 2,
    isActive: true
  },
  {
    name: 'Mac',
    name_en: 'Mac',
    description: 'คอมพิวเตอร์ Mac สำหรับงานระดับมืออาชีพ',
    color: '#8E8E93',
    order: 3,
    isActive: true
  },
  {
    name: 'Apple Watch',
    name_en: 'Apple Watch',
    description: 'นาฬิกาอัจฉริยะสำหรับการดูแลสุขภาพ',
    color: '#FF2D55',
    order: 4,
    isActive: true
  },
  {
    name: 'AirPods',
    name_en: 'AirPods',
    description: 'หูฟังไร้สายคุณภาพสูง',
    color: '#FF9500',
    order: 5,
    isActive: true
  },
  {
    name: 'แอนดรอยด์',
    name_en: 'Android',
    description: 'สมาร์ทโฟน Android จากแบรนด์ชั้นนำ',
    color: '#34C759',
    order: 6,
    isActive: true
  },
  {
    name: 'อุปกรณ์เสริม',
    name_en: 'Accessories',
    description: 'อุปกรณ์เสริมและเคสป้องกัน',
    color: '#AF52DE',
    order: 7,
    isActive: true
  },
  {
    name: 'โปรโมชั่น',
    name_en: 'Promotions',
    description: 'ข้อเสนอพิเศษและส่วนลด',
    color: '#FF3B30',
    order: 8,
    isActive: true
  }
];

// Sample promotions data
const samplePromotions = [
  {
    title: 'iPhone 16 Pro',
    subtitle: 'ที่สุดของ iPhone',
    description: 'ขุมพลังครบเครื่อง พร้อมเทคโนโลยี AI ล่าสุด',
    price: 'เริ่มต้นที่ ฿39,900',
    promotionType: 'product',
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    isActive: true,
    isFeatured: true,
    order: 1,
    cardStyle: {
      backgroundColor: '#1d1d1f',
      textColor: '#f5f5f7',
      size: 'large'
    },
    tags: ['ใหม่', 'แนะนำ', 'iPhone']
  },
  {
    title: 'Apple Watch Ultra 2',
    subtitle: 'สำหรับนักสำรวจ',
    description: 'สีใหม่ พิชิตความท้าทายใหม่ๆ',
    price: 'เริ่มต้นที่ ฿29,900',
    promotionType: 'product',
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
    isFeatured: true,
    order: 2,
    cardStyle: {
      backgroundColor: '#2c2c2e',
      textColor: '#ffffff',
      size: 'medium'
    },
    tags: ['Apple Watch', 'Ultra', 'สุขภาพ']
  },
  {
    title: 'สายนาฬิกา Apple Watch',
    subtitle: 'สีใหม่',
    description: 'ใส่วิสัยสันความเป็นคุณ',
    price: 'เริ่มต้นที่ ฿1,590',
    promotionType: 'category',
    startDate: new Date(),
    endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
    isActive: true,
    isFeatured: true,
    order: 3,
    cardStyle: {
      backgroundColor: '#007AFF',
      textColor: '#ffffff',
      size: 'small'
    },
    tags: ['อุปกรณ์เสริม', 'สายนาฬิกา', 'สี']
  },
  {
    title: 'Samsung Galaxy S24',
    subtitle: 'AI มาพร้อมกับ Galaxy',
    description: 'ประสบการณ์ใหม่กับ Galaxy AI',
    price: 'เริ่มต้นที่ ฿28,900',
    originalPrice: '฿32,900',
    discountPercent: 12,
    promotionType: 'product',
    startDate: new Date(),
    endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
    isActive: true,
    isFeatured: false,
    order: 4,
    cardStyle: {
      backgroundColor: '#6c5ce7',
      textColor: '#ffffff',
      size: 'medium'
    },
    tags: ['Samsung', 'Android', 'AI']
  },
  {
    title: 'โปรโมชั่นพิเศษ Back to School',
    subtitle: 'ส่วนลดสูงสุด 20%',
    description: 'สำหรับนักเรียน นักศึกษา ครู อาจารย์',
    price: 'ลดสูงสุด 20%',
    promotionType: 'general',
    startDate: new Date(),
    endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
    isActive: true,
    isFeatured: false,
    order: 5,
    cardStyle: {
      backgroundColor: '#00d2ff',
      textColor: '#ffffff',
      size: 'large'
    },
    tags: ['ส่วนลด', 'นักเรียน', 'นักศึกษา']
  }
];

// Create sample data
const createSampleData = async () => {
  try {
    console.log('🗑️  Clearing existing data...');
    await Category.deleteMany({});
    await Promotion.deleteMany({});

    console.log('📁 Creating sample categories...');
    const createdCategories = await Category.insertMany(sampleCategories);
    console.log(`✅ Created ${createdCategories.length} categories`);

    // Add category reference to some promotions
    const iphoneCategory = createdCategories.find(cat => cat.name === 'iPhone');
    const accessoryCategory = createdCategories.find(cat => cat.name === 'อุปกรณ์เสริม');
    const androidCategory = createdCategories.find(cat => cat.name === 'แอนดรอยด์');

    // Update promotions with category references
    samplePromotions[0].category = iphoneCategory?._id; // iPhone 16 Pro
    samplePromotions[2].category = accessoryCategory?._id; // สายนาฬิกา
    samplePromotions[3].category = androidCategory?._id; // Samsung Galaxy S24

    console.log('🎯 Creating sample promotions...');
    const createdPromotions = await Promotion.insertMany(samplePromotions);
    console.log(`✅ Created ${createdPromotions.length} promotions`);

    console.log('\n🎉 Sample data created successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Categories: ${createdCategories.length}`);
    console.log(`   Promotions: ${createdPromotions.length}`);
    console.log('\n🌐 You can now access:');
    console.log('   Frontend: http://localhost:3000/frontstore');
    console.log('   Admin: http://localhost:3000/frontstore/admin');

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the script
const main = async () => {
  await connectDB();
  await createSampleData();
};

if (require.main === module) {
  main();
}

module.exports = { createSampleData };
