const mongoose = require('mongoose');
const InstallmentOrder = require('../models/Installment/InstallmentOrder');
const InstallmentPayment = require('../models/Installment/InstallmentPayment');
const Customer = require('../models/Customer/Customer');

// Connect to MongoDB
async function connectDB() {
  try {
    const dbConfig = require('../config/db');
    await mongoose.connect(dbConfig.mongoURI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
}

// Create sample customers
async function createSampleCustomers() {
  const customers = [
    {
      customerType: 'individual',
      individual: {
        prefix: 'นาง',
        firstName: 'นภัสวรรณ',
        lastName: 'มงคล',
        phone: '096-187-7322',
        email: 'napasawan@example.com',
        address: {
          houseNo: '123/45',
          subDistrict: 'คลองตัน',
          district: 'วัฒนา',
          province: 'กรุงเทพมหานคร',
          zipcode: '10110'
        },
        taxId: '1234567890123'
      }
    },
    {
      customerType: 'individual',
      individual: {
        prefix: 'นาย',
        firstName: 'สมชาย',
        lastName: 'ใจดี',
        phone: '089-123-4567',
        email: 'somchai@example.com',
        address: {
          houseNo: '456/78',
          subDistrict: 'บางนา',
          district: 'บางนา',
          province: 'กรุงเทพมหานคร',
          zipcode: '10260'
        },
        taxId: '1234567890124'
      }
    },
    {
      customerType: 'individual',
      individual: {
        prefix: 'นางสาว',
        firstName: 'มาลี',
        lastName: 'สวยงาม',
        phone: '092-555-7788',
        email: 'malee@example.com',
        address: {
          houseNo: '789/12',
          subDistrict: 'ลาดกระบัง',
          district: 'ลาดกระบัง',
          province: 'กรุงเทพมหานคร',
          zipcode: '10520'
        },
        taxId: '1234567890125'
      }
    }
  ];

  const createdCustomers = [];
  for (const customerData of customers) {
    try {
      const existing = await Customer.findOne({ 'individual.taxId': customerData.individual.taxId });
      if (!existing) {
        const customer = new Customer(customerData);
        await customer.save();
        createdCustomers.push(customer);
        console.log(`Created customer: ${customer.individual.firstName} ${customer.individual.lastName}`);
      } else {
        createdCustomers.push(existing);
        console.log(`Customer already exists: ${existing.individual.firstName} ${existing.individual.lastName}`);
      }
    } catch (error) {
      console.error('Error creating customer:', error);
    }
  }

  return createdCustomers;
}

// Create sample installment orders
async function createSampleInstallmentOrders(customers) {
  const orders = [
    {
      customer: customers[0]._id,
      contractNo: 'INST256806001',
      planType: 'plan1',
      branch_code: '00001',
      installmentType: 'pay-as-you-go',
      customer_info: {
        firstName: customers[0].individual.firstName,
        lastName: customers[0].individual.lastName,
        phone: customers[0].individual.phone,
        email: customers[0].individual.email,
        taxId: customers[0].individual.taxId,
        address: customers[0].individual.address
      },
      items: [{
        name: 'iPhone 15 Pro Max',
        qty: 1,
        imei: 'IMEI123456789',
        downAmount: 4900,
        payUseInstallment: 3667,
        payUseInstallmentCount: 12,
        pricePayOff: 48900
      }],
      downPayment: 4900,
      monthlyPayment: 3667,
      installmentCount: 12,
      totalAmount: 48900,
      finalTotalAmount: 48900,
      paidAmount: 11000,
      status: 'ongoing',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
    {
      customer: customers[1]._id,
      contractNo: 'SAVE256806002',
      planType: 'plan2',
      branch_code: '00001',
      installmentType: 'pay-as-you-go',
      customer_info: {
        firstName: customers[1].individual.firstName,
        lastName: customers[1].individual.lastName,
        phone: customers[1].individual.phone,
        email: customers[1].individual.email,
        taxId: customers[1].individual.taxId,
        address: customers[1].individual.address
      },
      items: [{
        name: 'Samsung Galaxy S24',
        qty: 1,
        imei: 'IMEI987654321',
        downAmount: 2000,
        payUseInstallment: 2000,
        payUseInstallmentCount: 16,
        pricePayOff: 32000
      }],
      downPayment: 2000,
      monthlyPayment: 2000,
      installmentCount: 16,
      totalAmount: 32000,
      finalTotalAmount: 32000,
      paidAmount: 8000,
      status: 'ongoing',
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
    },
    {
      customer: customers[2]._id,
      contractNo: 'PAYOFF256806003',
      planType: 'plan3',
      branch_code: '00001',
      installmentType: 'pay-in-full',
      customer_info: {
        firstName: customers[2].individual.firstName,
        lastName: customers[2].individual.lastName,
        phone: customers[2].individual.phone,
        email: customers[2].individual.email,
        taxId: customers[2].individual.taxId,
        address: customers[2].individual.address
      },
      items: [{
        name: 'MacBook Air M2',
        qty: 1,
        imei: 'IMEI111222333',
        downAmount: 3750,
        payUseInstallment: 3750,
        payUseInstallmentCount: 12,
        pricePayOff: 45000
      }],
      downPayment: 3750,
      monthlyPayment: 3750,
      installmentCount: 12,
      totalAmount: 45000,
      finalTotalAmount: 45000,
      paidAmount: 45000,
      status: 'completed',
      dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    }
  ];

  const createdOrders = [];
  for (const orderData of orders) {
    try {
      const existing = await InstallmentOrder.findOne({ contractNo: orderData.contractNo });
      if (!existing) {
        const order = new InstallmentOrder(orderData);
        await order.save();
        createdOrders.push(order);
        console.log(`Created order: ${order.contractNo}`);
      } else {
        createdOrders.push(existing);
        console.log(`Order already exists: ${existing.contractNo}`);
      }
    } catch (error) {
      console.error('Error creating order:', error);
    }
  }

  return createdOrders;
}

// Create sample payments
async function createSamplePayments(orders, customers) {
  const payments = [
    // Payments for first order (iPhone)
    {
      customer_id: customers[0]._id,
      installmentOrder: orders[0]._id,
      installmentNumber: 1,
      amountDue: 3667,
      amountPaid: 3667,
      dueDate: new Date('2024-01-01'),
      paymentDate: new Date('2024-01-01'),
      paymentMethod: 'CASH',
      status: 'PAID'
    },
    {
      customer_id: customers[0]._id,
      installmentOrder: orders[0]._id,
      installmentNumber: 2,
      amountDue: 3667,
      amountPaid: 3667,
      dueDate: new Date('2024-02-01'),
      paymentDate: new Date('2024-02-01'),
      paymentMethod: 'TRANSFER',
      status: 'PAID'
    },
    {
      customer_id: customers[0]._id,
      installmentOrder: orders[0]._id,
      installmentNumber: 3,
      amountDue: 3666,
      amountPaid: 3666,
      dueDate: new Date('2024-03-01'),
      paymentDate: new Date('2024-03-05'),
      paymentMethod: 'CARD',
      status: 'PAID'
    },
    // Payments for second order (Samsung)
    {
      customer_id: customers[1]._id,
      installmentOrder: orders[1]._id,
      installmentNumber: 1,
      amountDue: 2000,
      amountPaid: 2000,
      dueDate: new Date('2024-01-01'),
      paymentDate: new Date('2024-01-01'),
      paymentMethod: 'CASH',
      status: 'PAID'
    },
    {
      customer_id: customers[1]._id,
      installmentOrder: orders[1]._id,
      installmentNumber: 2,
      amountDue: 2000,
      amountPaid: 2000,
      dueDate: new Date('2024-02-01'),
      paymentDate: new Date('2024-02-01'),
      paymentMethod: 'TRANSFER',
      status: 'PAID'
    },
    {
      customer_id: customers[1]._id,
      installmentOrder: orders[1]._id,
      installmentNumber: 3,
      amountDue: 2000,
      amountPaid: 2000,
      dueDate: new Date('2024-03-01'),
      paymentDate: new Date('2024-03-01'),
      paymentMethod: 'TRANSFER',
      status: 'PAID'
    },
    {
      customer_id: customers[1]._id,
      installmentOrder: orders[1]._id,
      installmentNumber: 4,
      amountDue: 2000,
      amountPaid: 2000,
      dueDate: new Date('2024-04-01'),
      paymentDate: new Date('2024-04-01'),
      paymentMethod: 'CASH',
      status: 'PAID'
    }
  ];

  const createdPayments = [];
  for (const paymentData of payments) {
    try {
      const existing = await InstallmentPayment.findOne({
        installmentOrder: paymentData.installmentOrder,
        installmentNumber: paymentData.installmentNumber
      });
      if (!existing) {
        const payment = new InstallmentPayment(paymentData);
        await payment.save();
        createdPayments.push(payment);
        console.log(`Created payment: Order ${paymentData.installmentOrder}, Installment ${paymentData.installmentNumber}`);
      } else {
        createdPayments.push(existing);
        console.log(`Payment already exists: Order ${existing.installmentOrder}, Installment ${existing.installmentNumber}`);
      }
    } catch (error) {
      console.error('Error creating payment:', error);
    }
  }

  return createdPayments;
}

// Main function
async function main() {
  try {
    await connectDB();

    console.log('Creating sample installment data...');

    const customers = await createSampleCustomers();
    console.log(`Created ${customers.length} customers`);

    const orders = await createSampleInstallmentOrders(customers);
    console.log(`Created ${orders.length} installment orders`);

    const payments = await createSamplePayments(orders, customers);
    console.log(`Created ${payments.length} payments`);

    console.log('Sample data creation completed!');

    // Close database connection
    await mongoose.connection.close();

  } catch (error) {
    console.error('Error creating sample data:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { createSampleCustomers, createSampleInstallmentOrders, createSamplePayments };
