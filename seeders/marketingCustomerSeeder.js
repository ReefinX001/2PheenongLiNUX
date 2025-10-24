const mongoose = require('mongoose');
const MarketingCustomer = require('../models/Customer/MarketingCustomer');
const CustomerActivity = require('../models/Customer/CustomerActivity');

// Thai customer names and data
const sampleCustomers = [
  {
    firstName: 'มานี',
    lastName: 'สมบูรณ์',
    email: 'manee.s@example.com',
    phone: '093-123-4567',
    address: {
      street: '123 ถ.สุขุมวิท',
      district: 'แขวงคลองตัน',
      province: 'เขตคลองเตย',
      postalCode: '10110'
    },
    dateOfBirth: new Date('1987-03-15'),
    gender: 'female',
    segment: 'vip',
    status: 'active',
    lifetimeValue: 124890,
    totalOrders: 28,
    averageOrderValue: 4460,
    satisfactionRating: 4.8,
    registrationDate: new Date('2023-01-12'),
    lastPurchaseDate: new Date('2025-05-05'),
    lastActivityDate: new Date('2025-05-07'),
    preferences: {
      emailMarketing: true,
      smsMarketing: true,
      pushNotifications: true
    },
    tags: ['VIP', 'high-value', 'loyal'],
    createdBy: 'seeder'
  },
  {
    firstName: 'สมชาย',
    lastName: 'เข้มแข็ง',
    email: 'somchai.k@example.com',
    phone: '082-456-7890',
    address: {
      street: '456 ถ.พหลโยธิน',
      district: 'แขวงสามเสน',
      province: 'เขตพญาไท',
      postalCode: '10300'
    },
    dateOfBirth: new Date('1985-07-22'),
    gender: 'male',
    segment: 'loyal',
    status: 'active',
    lifetimeValue: 87500,
    totalOrders: 16,
    averageOrderValue: 5468,
    satisfactionRating: 4.6,
    registrationDate: new Date('2023-03-03'),
    lastPurchaseDate: new Date('2025-04-20'),
    lastActivityDate: new Date('2025-04-25'),
    preferences: {
      emailMarketing: true,
      smsMarketing: false,
      pushNotifications: true
    },
    tags: ['loyal', 'tech-lover'],
    createdBy: 'seeder'
  },
  {
    firstName: 'วนิดา',
    lastName: 'วานิช',
    email: 'wanida.w@example.com',
    phone: '096-789-1234',
    address: {
      street: '789 ถ.รัชดาภิเษก',
      district: 'แขวงกลองเตย',
      province: 'เขตกรุงเทพฯ',
      postalCode: '10110'
    },
    dateOfBirth: new Date('1992-11-08'),
    gender: 'female',
    segment: 'new',
    status: 'active',
    lifetimeValue: 24780,
    totalOrders: 3,
    averageOrderValue: 8260,
    satisfactionRating: 5.0,
    registrationDate: new Date('2025-04-22'),
    lastPurchaseDate: new Date('2025-04-25'),
    lastActivityDate: new Date('2025-05-01'),
    preferences: {
      emailMarketing: true,
      smsMarketing: true,
      pushNotifications: true
    },
    tags: ['new-customer', 'high-potential'],
    createdBy: 'seeder'
  },
  {
    firstName: 'ธีรศักดิ์',
    lastName: 'ไทยเจริญ',
    email: 'theerasak.t@example.com',
    phone: '085-234-5678',
    address: {
      street: '321 ถ.วิภาวดีรังสิต',
      district: 'แขวงจตุจักร',
      province: 'เขตจตุจักร',
      postalCode: '10900'
    },
    dateOfBirth: new Date('1980-04-12'),
    gender: 'male',
    segment: 'at-risk',
    status: 'inactive',
    lifetimeValue: 53400,
    totalOrders: 8,
    averageOrderValue: 6675,
    satisfactionRating: 3.2,
    registrationDate: new Date('2023-06-05'),
    lastPurchaseDate: new Date('2024-12-15'),
    lastActivityDate: new Date('2025-01-10'),
    preferences: {
      emailMarketing: false,
      smsMarketing: false,
      pushNotifications: false
    },
    tags: ['at-risk', 'inactive'],
    createdBy: 'seeder'
  },
  {
    firstName: 'นภาพร',
    lastName: 'สุขสวัสดิ์',
    email: 'napaporn.s@example.com',
    phone: '091-567-8901',
    address: {
      street: '654 ถ.ลาดพร้าว',
      district: 'แขวงวังทองหลาง',
      province: 'เขตกรุงเทพฯ',
      postalCode: '10310'
    },
    dateOfBirth: new Date('1990-09-25'),
    gender: 'female',
    segment: 'loyal',
    status: 'active',
    lifetimeValue: 68240,
    totalOrders: 11,
    averageOrderValue: 6204,
    satisfactionRating: 4.5,
    registrationDate: new Date('2023-10-18'),
    lastPurchaseDate: new Date('2025-04-30'),
    lastActivityDate: new Date('2025-05-02'),
    preferences: {
      emailMarketing: true,
      smsMarketing: true,
      pushNotifications: false
    },
    tags: ['loyal', 'fashion-lover'],
    createdBy: 'seeder'
  },
  {
    firstName: 'อนุชา',
    lastName: 'ประเสริฐ',
    email: 'anucha.p@example.com',
    phone: '087-321-6547',
    address: {
      street: '987 ถ.สีลม',
      district: 'แขวงบางกะปิ',
      province: 'เขตกรุงเทพฯ',
      postalCode: '10240'
    },
    dateOfBirth: new Date('1988-12-10'),
    gender: 'male',
    segment: 'regular',
    status: 'active',
    lifetimeValue: 42300,
    totalOrders: 7,
    averageOrderValue: 6043,
    satisfactionRating: 4.1,
    registrationDate: new Date('2024-01-15'),
    lastPurchaseDate: new Date('2025-03-20'),
    lastActivityDate: new Date('2025-03-25'),
    preferences: {
      emailMarketing: true,
      smsMarketing: false,
      pushNotifications: true
    },
    tags: ['regular', 'sports'],
    createdBy: 'seeder'
  }
];

// Sample activities for customers
const sampleActivities = [
  // Activities for Manee (VIP customer)
  {
    activityType: 'purchase',
    title: 'สั่งซื้อ iPhone 15 Pro',
    description: 'ลูกค้าสั่งซื้อ iPhone 15 Pro สีทอง 256GB',
    metadata: {
      orderId: 'ORD-001',
      amount: 42900,
      products: ['iPhone 15 Pro 256GB']
    },
    activityDate: new Date('2025-05-05'),
    deviceType: 'mobile'
  },
  {
    activityType: 'support',
    title: 'ติดต่อฝ่ายบริการลูกค้า',
    description: 'สอบถามเกี่ยวกับการรับประกันสินค้า',
    metadata: {
      ticketId: 'TICK-001',
      category: 'warranty',
      status: 'resolved'
    },
    activityDate: new Date('2025-05-02'),
    deviceType: 'desktop'
  },
  {
    activityType: 'visit',
    title: 'เยี่ยมชมเว็บไซต์',
    description: 'เข้าชมหน้าสินค้า Apple Watch, AirPods Pro',
    metadata: {
      pageUrl: '/products/apple-watch',
      duration: 420
    },
    activityDate: new Date('2025-04-28'),
    deviceType: 'mobile'
  },
  {
    activityType: 'review',
    title: 'เขียนรีวิวสินค้า',
    description: 'ให้คะแนนและรีวิว MacBook Pro 16"',
    metadata: {
      rating: 5,
      reviewText: 'สินค้าดีมาก บริการเยี่ยม'
    },
    activityDate: new Date('2025-04-15'),
    deviceType: 'desktop'
  },

  // Activities for other customers
  {
    activityType: 'purchase',
    title: 'สั่งซื้อ Samsung Galaxy S24',
    description: 'ลูกค้าสั่งซื้อ Samsung Galaxy S24 Ultra',
    metadata: {
      orderId: 'ORD-002',
      amount: 32900,
      products: ['Samsung Galaxy S24 Ultra']
    },
    activityDate: new Date('2025-04-20'),
    deviceType: 'mobile'
  },
  {
    activityType: 'cart',
    title: 'เพิ่มสินค้าลงตะกร้า',
    description: 'เพิ่ม iPad Air 5th Gen ลงในตะกร้าสินค้า',
    metadata: {
      cartItems: [{
        productId: 'PROD-003',
        productName: 'iPad Air 5th Gen',
        quantity: 1,
        price: 21900
      }]
    },
    activityDate: new Date('2025-04-10'),
    deviceType: 'tablet'
  }
];

async function seedMarketingCustomers() {
  try {
    console.log('🌱 Starting Marketing Customer data seeding...');

    // Clear existing data
    await MarketingCustomer.deleteMany({});
    await CustomerActivity.deleteMany({});
    console.log('✅ Cleared existing customer data');

    // Seed customers
    console.log('👥 Seeding marketing customers...');
    const createdCustomers = [];

    for (const customerData of sampleCustomers) {
      const customer = new MarketingCustomer(customerData);
      const savedCustomer = await customer.save();
      createdCustomers.push(savedCustomer);
      console.log(`  ✓ Created customer: ${savedCustomer.fullName} (${savedCustomer.segment})`);
    }

    console.log(`✅ Created ${createdCustomers.length} customers`);

    // Seed activities
    console.log('📊 Seeding customer activities...');
    let activityCount = 0;

    for (let i = 0; i < sampleActivities.length; i++) {
      const activityData = sampleActivities[i];
      const customerIndex = i % createdCustomers.length; // Distribute activities across customers

      const activity = new CustomerActivity({
        ...activityData,
        customerId: createdCustomers[customerIndex]._id,
        createdBy: 'seeder'
      });

      await activity.save();
      activityCount++;
    }

    // Add more activities for the VIP customer (Manee)
    const maneeCustomer = createdCustomers[0]; // First customer is Manee
    const additionalActivities = [
      {
        customerId: maneeCustomer._id,
        activityType: 'email_open',
        title: 'เปิดอีเมลโปรโมชั่น',
        description: 'เปิดอีเมลโปรโมชั่นสินค้าใหม่',
        metadata: {
          emailId: 'EMAIL-001',
          campaignId: 'CAMP-001'
        },
        activityDate: new Date('2025-05-01'),
        createdBy: 'seeder'
      },
      {
        customerId: maneeCustomer._id,
        activityType: 'login',
        title: 'เข้าสู่ระบบ',
        description: 'ลูกค้าเข้าสู่ระบบผ่านแอปพลิเคชั่น',
        activityDate: new Date('2025-04-29'),
        deviceType: 'mobile',
        createdBy: 'seeder'
      }
    ];

    for (const activityData of additionalActivities) {
      const activity = new CustomerActivity(activityData);
      await activity.save();
      activityCount++;
    }

    console.log(`✅ Created ${activityCount} customer activities`);

    console.log('🎉 Marketing Customer data seeding completed successfully!');
    console.log('📊 Summary:');
    console.log(`   • Customers: ${createdCustomers.length}`);
    console.log(`   • Activities: ${activityCount}`);

    // Show segment distribution
    const segmentCounts = createdCustomers.reduce((acc, customer) => {
      acc[customer.segment] = (acc[customer.segment] || 0) + 1;
      return acc;
    }, {});

    console.log('   • Segment Distribution:');
    Object.entries(segmentCounts).forEach(([segment, count]) => {
      console.log(`     - ${segment}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Error seeding marketing customer data:', error);
    throw error;
  }
}

// Run seeder if called directly
if (require.main === module) {
  const { connectDB } = require('../config/db');

  connectDB()
    .then(() => {
      console.log('🔌 Connected to database');
      return seedMarketingCustomers();
    })
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedMarketingCustomers };