// Script to generate sample loan/installment data
const mongoose = require('mongoose');
const moment = require('moment');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import models
const InstallmentOrder = require('../models/Installment/InstallmentOrder');
const InstallmentPayment = require('../models/Installment/InstallmentPayment');
const Customer = require('../models/Customer/Customer');
const User = require('../models/User/User');

// Thai names for sample data
const firstNames = ['สมชาย', 'สมหญิง', 'สุรินทร์', 'พิมพ์ใจ', 'วิชัย', 'นภา', 'จิราภรณ์', 'อนุชา', 'ปรีชา', 'มาลี'];
const lastNames = ['แสงดาว', 'สุขใจ', 'รุ่งเรือง', 'เจริญผล', 'วิชัยกุล', 'ศรีสุข', 'ทองคำ', 'บุญมี', 'สว่างศรี', 'ใจดี'];
const provinces = ['กรุงเทพมหานคร', 'ปัตตานี', 'สงขลา', 'ยะลา', 'นราธิวาส', 'สตูล', 'นครศรีธรรมราช', 'สุราษฎร์ธานี'];
const districts = ['เมือง', 'บางแก้ว', 'หาดใหญ่', 'สะเดา', 'ควนเนียง', 'รัตภูมิ', 'ระโนด', 'กระแสสินธุ์'];

// Sample products
const products = [
  { name: 'iPhone 15 Pro Max 256GB', price: 48900 },
  { name: 'Samsung Galaxy S24 Ultra', price: 44900 },
  { name: 'iPad Pro 11" 128GB', price: 32900 },
  { name: 'MacBook Air M2', price: 42900 },
  { name: 'OPPO Find X6 Pro', price: 35900 },
  { name: 'Xiaomi 14 Pro', price: 29900 },
  { name: 'Vivo X90 Pro', price: 32900 },
  { name: 'OnePlus 11 Pro', price: 28900 },
  { name: 'realme GT 3', price: 19900 },
  { name: 'ASUS ROG Phone 7', price: 39900 }
];

// Connect to database
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/my-accounting-app', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Generate random Thai phone number
function generatePhoneNumber() {
  const prefixes = ['06', '08', '09'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return prefix + number;
}

// Generate random Thai ID card number
function generateThaiId() {
  const digits = Math.floor(Math.random() * 10000000000000).toString().padStart(13, '0');
  return digits;
}

// Generate formatted Thai ID for display
function generateFormattedThaiId() {
  const digits = generateThaiId();
  return digits.slice(0, 1) + '-' +
         digits.slice(1, 5) + '-' +
         digits.slice(5, 10) + '-' +
         digits.slice(10, 12) + '-' +
         digits.slice(12, 13);
}

// Generate contract number
function generateContractNo(index, date) {
  const year = moment(date).year() + 543; // Buddhist year
  const month = moment(date).format('MM');
  const seq = String(index).padStart(5, '0');
  return `INST${year}${month}${seq}`;
}

// Create sample customer
async function createSampleCustomer(index) {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const province = provinces[Math.floor(Math.random() * provinces.length)];
  const district = districts[Math.floor(Math.random() * districts.length)];

  const customer = new Customer({
    customerType: 'individual',
    individual: {
      prefix: Math.random() > 0.5 ? 'นาย' : 'นางสาว',
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      nickName: firstName.slice(0, 2),
      taxId: generateThaiId(),
      phone: generatePhoneNumber(),
      dateOfBirth: moment().subtract(20 + Math.floor(Math.random() * 30), 'years').toDate(),
      age: 20 + Math.floor(Math.random() * 30),
      gender: Math.random() > 0.5 ? 'male' : 'female',
      maritalStatus: 'single',
      nationality: 'ไทย',
      religion: 'พุทธ'
    },
    personalInfo: {
      prefix: Math.random() > 0.5 ? 'นาย' : 'นางสาว',
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      nickName: firstName.slice(0, 2),
      idCard: generateThaiId(),
      dateOfBirth: moment().subtract(20 + Math.floor(Math.random() * 30), 'years').toDate(),
      age: 20 + Math.floor(Math.random() * 30),
      gender: Math.random() > 0.5 ? 'male' : 'female',
      maritalStatus: 'single',
      nationality: 'ไทย',
      religion: 'พุทธ'
    },
    contactInfo: {
      email: `${firstName.toLowerCase()}${index}@example.com`,
      lineId: `line_${firstName}${index}`,
      facebook: `${firstName} ${lastName}`
    },
    phoneNumbers: [generatePhoneNumber()],
    currentAddress: {
      houseNo: String(Math.floor(Math.random() * 999) + 1),
      moo: String(Math.floor(Math.random() * 15) + 1),
      road: 'ถนนเพชรเกษม',
      subDistrict: district,
      district: district,
      province: province,
      postalCode: String(Math.floor(Math.random() * 90000) + 10000),
      country: 'ไทย'
    },
    workInfo: {
      occupation: ['พนักงานบริษัท', 'ค้าขาย', 'รับราชการ', 'อาชีพอิสระ'][Math.floor(Math.random() * 4)],
      companyName: `บริษัท ${lastName} จำกัด`,
      position: 'พนักงาน',
      monthlyIncome: Math.floor(Math.random() * 30000) + 15000,
      workAddress: {
        province: province,
        district: district
      }
    },
    creditInfo: {
      creditScore: Math.floor(Math.random() * 300) + 500,
      creditLimit: Math.floor(Math.random() * 100000) + 50000,
      creditUsed: 0,
      creditAvailable: Math.floor(Math.random() * 100000) + 50000
    },
    loyaltyPoints: Math.floor(Math.random() * 1000),
    status: 'active',
    isVIP: Math.random() > 0.8
  });

  await customer.save();
  return customer;
}

// Create sample installment order
async function createSampleInstallmentOrder(customer, index, createdDate) {
  const product = products[Math.floor(Math.random() * products.length)];
  const planType = ['plan1', 'plan2', 'plan3'][Math.floor(Math.random() * 3)];
  const installmentType = Math.random() > 0.5 ? 'pay-as-you-go' : 'pay-in-full';
  const status = ['pending', 'approved', 'active', 'ongoing', 'completed', 'cancelled'][Math.floor(Math.random() * 6)];

  // Calculate installment details
  const downPaymentPercent = [10, 20, 30][Math.floor(Math.random() * 3)];
  const totalAmount = product.price;
  const downPayment = Math.round(totalAmount * downPaymentPercent / 100);
  const remainingAmount = totalAmount - downPayment;
  const installmentCount = [3, 6, 10, 12][Math.floor(Math.random() * 4)];
  const monthlyPayment = Math.round(remainingAmount / installmentCount);

  // Calculate paid amount based on status
  let paidAmount = downPayment;
  if (status === 'completed') {
    paidAmount = totalAmount;
  } else if (status === 'active' || status === 'ongoing') {
    const paidMonths = Math.floor(Math.random() * installmentCount);
    paidAmount = downPayment + (monthlyPayment * paidMonths);
  }

  const order = new InstallmentOrder({
    contractNo: generateContractNo(index, createdDate),
    planType,
    branch_code: ['00001', '00002', '00003', '00004', '00005'][Math.floor(Math.random() * 5)],
    installmentType,
    customer: customer._id,
    customer_info: {
      prefix: customer.individual?.prefix || customer.personalInfo?.prefix || 'นาย',
      firstName: customer.individual?.firstName || customer.personalInfo?.firstName || 'ไม่ระบุ',
      lastName: customer.individual?.lastName || customer.personalInfo?.lastName || 'ไม่ระบุ',
      phone: customer.individual?.phone || customer.phoneNumbers?.[0] || 'ไม่ระบุ',
      email: customer.contactInfo?.email || 'ไม่ระบุ',
      age: customer.individual?.age || customer.personalInfo?.age || 25,
      taxId: customer.individual?.taxId || customer.personalInfo?.idCard || generateThaiId(),
      address: {
        houseNo: customer.currentAddress?.houseNo || '1',
        moo: customer.currentAddress?.moo || '1',
        subDistrict: customer.currentAddress?.subDistrict || 'ไม่ระบุ',
        district: customer.currentAddress?.district || 'ไม่ระบุ',
        province: customer.currentAddress?.province || 'ไม่ระบุ',
        zipcode: customer.currentAddress?.postalCode || '10000'
      }
    },
    items: [{
      name: product.name,
      qty: 1,
      imei: `IMEI${Date.now()}${index}`,
      downAmount: downPayment,
      downInstallmentCount: 1,
      downInstallment: downPayment,
      creditThreshold: 0,
      payUseInstallmentCount: installmentCount,
      payUseInstallment: monthlyPayment,
      pricePayOff: totalAmount
    }],
    downPayment,
    monthlyPayment,
    installmentCount,
    subTotal: totalAmount,
    totalAmount,
    finalTotalAmount: totalAmount,
    paidAmount,
    status,
    dueDate: moment(createdDate).add(1, 'month').toDate(),
    createdAt: createdDate,
    updatedAt: createdDate,
    completedDate: status === 'completed' ? moment(createdDate).add(installmentCount, 'months').toDate() : null,
    hasWarranty: true,
    warrantyStartDate: createdDate,
    warrantyEndDate: moment(createdDate).add(1, 'year').toDate()
  });

  await order.save();
  return order;
}

// Create sample payment
async function createSamplePayment(order, paymentDate, amount, installmentNumber) {
  const payment = new InstallmentPayment({
    paymentId: `PAY${Date.now()}${Math.floor(Math.random() * 1000)}`,
    contractNumber: order.contractNo,
    contractId: order._id,
    installmentNumber: installmentNumber || 1,
    dueDate: paymentDate,
    amount,
    paymentMethod: ['cash', 'transfer'][Math.floor(Math.random() * 2)],
    paymentDate,
    status: 'confirmed',
    receiptNumber: `RCP${Date.now()}`,
    notes: 'ชำระค่างวดที่ ' + (installmentNumber || 1),
    branchCode: order.branch_code || '00001',
    recordedBy: new mongoose.Types.ObjectId(),
    createdAt: paymentDate
  });

  await payment.save();
  return payment;
}

// Main function to generate sample data
async function generateSampleData() {
  try {
    await connectDB();

    console.log('🧹 Clearing existing data...');
    await InstallmentOrder.deleteMany({});
    await InstallmentPayment.deleteMany({});
    // Don't delete all customers - just create new ones

    console.log('📝 Generating sample data...');

    const totalOrders = 100;
    const customers = [];
    const orders = [];

    // Create customers
    console.log('👥 Creating customers...');
    for (let i = 0; i < 50; i++) {
      const customer = await createSampleCustomer(i);
      customers.push(customer);

      if ((i + 1) % 10 === 0) {
        console.log(`  Created ${i + 1} customers...`);
      }
    }

    // Create installment orders distributed over the last 6 months
    console.log('📋 Creating installment orders...');
    for (let i = 0; i < totalOrders; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const daysAgo = Math.floor(Math.random() * 180); // Last 6 months
      const createdDate = moment().subtract(daysAgo, 'days').toDate();

      const order = await createSampleInstallmentOrder(customer, i, createdDate);
      orders.push(order);

      // Create payments for active/completed orders
      if (order.status === 'active' || order.status === 'ongoing' || order.status === 'completed') {
        const paymentCount = Math.floor(order.paidAmount / order.monthlyPayment);
        for (let j = 0; j < paymentCount; j++) {
          const paymentDate = moment(createdDate).add(j + 1, 'months').toDate();
          if (paymentDate <= new Date()) {
            await createSamplePayment(order, paymentDate, order.monthlyPayment, j + 1);
          }
        }
      }

      if ((i + 1) % 10 === 0) {
        console.log(`  Created ${i + 1} orders...`);
      }
    }

    // Create some recent activities for today
    console.log('📊 Creating today\'s activities...');
    for (let i = 0; i < 5; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const order = await createSampleInstallmentOrder(customer, totalOrders + i, new Date());

      // Create a down payment for today
      if (order.downPayment > 0) {
        await createSamplePayment(order, new Date(), order.downPayment, 0);
      }
    }

    // Get summary statistics
    const stats = await InstallmentOrder.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('\n✅ Sample data generated successfully!');
    console.log('\n📊 Summary:');
    console.log(`  Total Customers: ${customers.length}`);
    console.log(`  Total Orders: ${await InstallmentOrder.countDocuments()}`);
    console.log(`  Total Payments: ${await InstallmentPayment.countDocuments()}`);
    console.log('\n  Status Distribution:');
    stats.forEach(s => {
      console.log(`    ${s._id}: ${s.count} orders`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating sample data:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  generateSampleData();
}

module.exports = generateSampleData;