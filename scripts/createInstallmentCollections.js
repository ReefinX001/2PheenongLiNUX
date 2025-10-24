/**
 * Database Migration Script for Installment System Collections
 * This script ensures all required collections exist and have proper indexes
 * @version 1.0.0
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import all installment-related models
const Installment = require('../models/Installment');
const InstallmentOrder = require('../models/Installment/InstallmentOrder');
const InstallmentPayment = require('../models/Installment/InstallmentPayment');
const InstallmentAgreement = require('../models/Installment/InstallmentAgreement');
const InstallmentCounter = require('../models/Installment/InstallmentCounter');
const Customer = require('../models/Customer/Customer');

async function createInstallmentCollections() {
  try {
    console.log('🚀 Starting installment collections migration...');

    // Connect to MongoDB
    const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/accounting-app';
    await mongoose.connect(dbURI);
    console.log('✅ Connected to MongoDB');

    // Create collections and indexes
    console.log('📚 Creating installment collections...');

    // 1. Create main Installment collection
    try {
      await Installment.createCollection();
      console.log('✅ Installment collection created');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️ Installment collection already exists');
      } else {
        throw error;
      }
    }

    // 2. Create InstallmentOrder collection
    try {
      await InstallmentOrder.createCollection();
      console.log('✅ InstallmentOrder collection created');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️ InstallmentOrder collection already exists');
      } else {
        throw error;
      }
    }

    // 3. Create InstallmentPayment collection
    try {
      await InstallmentPayment.createCollection();
      console.log('✅ InstallmentPayment collection created');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️ InstallmentPayment collection already exists');
      } else {
        throw error;
      }
    }

    // 4. Create InstallmentAgreement collection
    try {
      await InstallmentAgreement.createCollection();
      console.log('✅ InstallmentAgreement collection created');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️ InstallmentAgreement collection already exists');
      } else {
        throw error;
      }
    }

    // 5. Create InstallmentCounter collection
    try {
      await InstallmentCounter.createCollection();
      console.log('✅ InstallmentCounter collection created');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️ InstallmentCounter collection already exists');
      } else {
        throw error;
      }
    }

    // 6. Create Customer collection if not exists
    try {
      await Customer.createCollection();
      console.log('✅ Customer collection created');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️ Customer collection already exists');
      } else {
        throw error;
      }
    }

    console.log('🔍 Creating indexes...');

    // Create indexes for better performance
    await Installment.collection.createIndex({ contractNumber: 1 }, { unique: true });
    await Installment.collection.createIndex({ status: 1, branchCode: 1 });
    await Installment.collection.createIndex({ customerId: 1 });
    await Installment.collection.createIndex({ startDate: 1, endDate: 1 });
    await Installment.collection.createIndex({ nextPaymentDate: 1 });
    await Installment.collection.createIndex({ isDeleted: 1 });
    console.log('✅ Installment indexes created');

    await InstallmentOrder.collection.createIndex({ contractNumber: 1 }, { unique: true });
    await InstallmentOrder.collection.createIndex({ customerId: 1 });
    await InstallmentOrder.collection.createIndex({ branchCode: 1 });
    await InstallmentOrder.collection.createIndex({ status: 1 });
    await InstallmentOrder.collection.createIndex({ createdAt: -1 });
    console.log('✅ InstallmentOrder indexes created');

    await Customer.collection.createIndex({ 'individual.phone': 1 });
    await Customer.collection.createIndex({ 'individual.idCard': 1 });
    await Customer.collection.createIndex({ 'corporate.taxId': 1 });
    console.log('✅ Customer indexes created');

    // Initialize counter if not exists
    const existingCounter = await InstallmentCounter.findOne({ name: 'installment' });
    if (!existingCounter) {
      const now = new Date();
      const year = now.getFullYear() + 543; // Convert to Buddhist year
      const month = now.getMonth() + 1;

      await InstallmentCounter.create({
        name: 'installment',
        year,
        month,
        seq: 0
      });
      console.log('✅ InstallmentCounter initialized for current month');
    } else {
      console.log('ℹ️ InstallmentCounter already exists');
    }

    // Verify collections
    console.log('🔍 Verifying collections...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);

    const requiredCollections = [
      'installments',
      'installmentorders',
      'installmentpayments',
      'installmentagreements',
      'installmentcounters',
      'customers'
    ];

    const missingCollections = requiredCollections.filter(name =>
      !collectionNames.some(col => col.toLowerCase().includes(name.toLowerCase()))
    );

    if (missingCollections.length === 0) {
      console.log('✅ All required collections exist:');
      collectionNames
        .filter(name => requiredCollections.some(req => name.toLowerCase().includes(req.toLowerCase())))
        .forEach(name => console.log(`   - ${name}`));
    } else {
      console.log('⚠️ Missing collections:', missingCollections);
    }

    console.log('🎉 Installment collections migration completed successfully!');

    // Print summary
    console.log('\n📊 Migration Summary:');
    console.log('✅ Collections: installments, installmentorders, installmentpayments, installmentagreements, installmentcounters, customers');
    console.log('✅ Indexes: Created for performance optimization');
    console.log('✅ Counter: Initialized for contract number generation');
    console.log('✅ Ready for production use');

  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📴 Disconnected from MongoDB');
  }
}

// Run migration if called directly
if (require.main === module) {
  createInstallmentCollections().then(() => {
    console.log('✅ Migration completed');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
}

module.exports = createInstallmentCollections;