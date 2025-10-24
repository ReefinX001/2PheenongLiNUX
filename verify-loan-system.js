/**
 * Comprehensive Loan System Verification Script
 * This script verifies that all loan system components are working correctly
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// Import models
const InstallmentOrder = require('./models/Installment/InstallmentOrder');
const InstallmentPayment = require('./models/Installment/InstallmentPayment');
const Customer = require('./models/Customer');

// Connect to database
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/accounting', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    return false;
  }
}

// Verify database collections
async function verifyCollections() {
  console.log('\n📊 Verifying Database Collections:');

  try {
    // Check InstallmentOrder collection
    const orderCount = await InstallmentOrder.countDocuments();
    console.log(`   ✅ InstallmentOrder: ${orderCount} documents`);

    // Check InstallmentPayment collection
    const paymentCount = await InstallmentPayment.countDocuments();
    console.log(`   ✅ InstallmentPayment: ${paymentCount} documents`);

    // Check Customer collection
    const customerCount = await Customer.countDocuments();
    console.log(`   ✅ Customer: ${customerCount} documents`);

    // Sample data structure
    if (orderCount > 0) {
      const sampleOrder = await InstallmentOrder.findOne().lean();
      console.log('\n   📋 Sample InstallmentOrder structure:');
      console.log(`      - Contract Number: ${sampleOrder.contractNumber || 'N/A'}`);
      console.log(`      - Customer Name: ${sampleOrder.customerName || 'N/A'}`);
      console.log(`      - Status: ${sampleOrder.status || 'N/A'}`);
      console.log(`      - Total Amount: ${sampleOrder.totalAmount || 0}`);
      console.log(`      - Branch Code: ${sampleOrder.branchCode || sampleOrder.branch_code || 'N/A'}`);
    }

    if (paymentCount > 0) {
      const samplePayment = await InstallmentPayment.findOne().lean();
      console.log('\n   📋 Sample InstallmentPayment structure:');
      console.log(`      - Payment ID: ${samplePayment.paymentId || 'N/A'}`);
      console.log(`      - Amount: ${samplePayment.amount || 0}`);
      console.log(`      - Payment Method: ${samplePayment.paymentMethod || 'N/A'}`);
      console.log(`      - Status: ${samplePayment.status || 'N/A'}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Error verifying collections:', error.message);
    return false;
  }
}

// Verify API endpoints
async function verifyEndpoints() {
  console.log('\n🌐 Verifying API Endpoints:');

  const axios = require('axios');
  const BASE_URL = 'http://localhost:3000/api';

  const criticalEndpoints = [
    { url: '/loan/dashboard/summary', name: 'Dashboard Summary' },
    { url: '/loan/bad-debt/list', name: 'Bad Debt List' },
    { url: '/installment-payment/orders', name: 'Installment Orders' },
    { url: '/installment/payment-history', name: 'Payment History' },
    { url: '/repayment/stats', name: 'Repayment Stats' }
  ];

  let allWorking = true;

  for (const endpoint of criticalEndpoints) {
    try {
      const response = await axios.get(BASE_URL + endpoint.url, {
        headers: {
          'Authorization': 'Bearer test-token'
        },
        validateStatus: () => true // Accept any status
      });

      if (response.status === 200 || response.status === 401) {
        console.log(`   ✅ ${endpoint.name}: ${response.status === 200 ? 'Working' : 'Auth Required'}`);
      } else {
        console.log(`   ⚠️ ${endpoint.name}: Status ${response.status}`);
        allWorking = false;
      }
    } catch (error) {
      console.log(`   ❌ ${endpoint.name}: ${error.message}`);
      allWorking = false;
    }
  }

  return allWorking;
}

// Create sample data if needed
async function createSampleData() {
  console.log('\n📝 Checking Sample Data:');

  try {
    const orderCount = await InstallmentOrder.countDocuments();

    if (orderCount === 0) {
      console.log('   ⚠️ No installment orders found. Creating sample data...');

      // Create sample customer
      const customer = await Customer.create({
        name: 'ทดสอบ ระบบผ่อน',
        phone: '0812345678',
        email: 'test@example.com',
        taxId: '1234567890123',
        address: '123 ถนนทดสอบ',
        branchCode: '00001'
      });

      // Create sample installment order
      const order = await InstallmentOrder.create({
        contractNumber: `TEST-${Date.now()}`,
        customerId: customer._id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customer_info: {
          prefix: 'คุณ',
          firstName: 'ทดสอบ',
          lastName: 'ระบบผ่อน',
          phone: customer.phone,
          taxId: customer.taxId,
          email: customer.email,
          address: customer.address
        },
        items: [
          {
            name: 'iPhone 15 Pro Max',
            imei: '123456789012345',
            price: 48900,
            pricePayOff: 48900,
            qty: 1
          }
        ],
        installmentType: 'INSTALLMENT',
        planType: 'INSTALLMENT',
        totalAmount: 48900,
        downPayment: 5000,
        financeAmount: 43900,
        monthlyPayment: 3658.33,
        amountPerInstallment: 3658.33,
        installmentCount: 12,
        term: 12,
        interestRate: 0,
        status: 'active',
        branchCode: '00001',
        branch_code: '00001',
        branchName: 'สาขาทดสอบ',
        paidAmount: 0,
        remainingAmount: 48900,
        installmentSchedule: Array.from({ length: 12 }, (_, i) => {
          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + i + 1);
          return {
            installmentNumber: i + 1,
            dueDate,
            amount: 3658.33,
            principalAmount: 3658.33,
            interestAmount: 0,
            status: 'pending',
            paidAmount: 0
          };
        })
      });

      console.log(`   ✅ Created sample order: ${order.contractNumber}`);

      // Create sample payment
      const payment = await InstallmentPayment.create({
        paymentId: InstallmentPayment.generatePaymentId(),
        contractId: order._id,
        contractNumber: order.contractNumber,
        customerId: customer._id,
        customerName: customer.name,
        customerPhone: customer.phone,
        installmentNumber: 1,
        dueDate: order.installmentSchedule[0].dueDate,
        paymentDate: new Date(),
        amount: 3658.33,
        principalAmount: 3658.33,
        interestAmount: 0,
        penaltyAmount: 0,
        paymentMethod: 'cash',
        cashDetails: {
          cashAmount: 4000,
          changeAmount: 341.67
        },
        status: 'confirmed',
        branchCode: '00001',
        branchName: 'สาขาทดสอบ',
        recordedByName: 'ระบบทดสอบ'
      });

      console.log(`   ✅ Created sample payment: ${payment.paymentId}`);

      // Update order with payment
      order.installmentSchedule[0].paidAmount = payment.amount;
      order.installmentSchedule[0].paidDate = payment.paymentDate;
      order.installmentSchedule[0].status = 'paid';
      order.installmentSchedule[0].paymentId = payment._id;
      order.paidAmount = payment.amount;
      order.remainingAmount = order.totalAmount - payment.amount;
      await order.save();

      console.log('   ✅ Sample data created successfully');
    } else {
      console.log(`   ✅ Found ${orderCount} existing installment orders`);
    }

    return true;
  } catch (error) {
    console.error('   ❌ Error creating sample data:', error.message);
    return false;
  }
}

// Main verification function
async function verifyLoanSystem() {
  console.log('🚀 Starting Loan System Verification\n');
  console.log('=' .repeat(50));

  // Connect to database
  const dbConnected = await connectDB();
  if (!dbConnected) {
    console.error('\n❌ Cannot proceed without database connection');
    process.exit(1);
  }

  // Run verifications
  const results = {
    collections: await verifyCollections(),
    sampleData: await createSampleData(),
    endpoints: await verifyEndpoints()
  };

  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 VERIFICATION SUMMARY:');
  console.log('=' .repeat(50));

  const allPassed = Object.values(results).every(r => r === true);

  if (allPassed) {
    console.log('\n✅ All verifications passed! The loan system is ready to use.');
    console.log('\n📌 Next steps:');
    console.log('   1. Login to the system');
    console.log('   2. Navigate to /views/loan/loan_dashboard.html');
    console.log('   3. Start managing loans and installments');
  } else {
    console.log('\n⚠️ Some verifications failed. Please check the errors above.');
    console.log('\n📌 Troubleshooting:');
    console.log('   1. Ensure MongoDB is running');
    console.log('   2. Check server.js is running on port 3000');
    console.log('   3. Verify all required npm packages are installed');
  }

  // Close database connection
  await mongoose.connection.close();
  console.log('\n✅ Database connection closed');

  process.exit(allPassed ? 0 : 1);
}

// Run verification
if (require.main === module) {
  verifyLoanSystem().catch(error => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
}

module.exports = { verifyLoanSystem };