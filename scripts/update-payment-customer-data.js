/**
 * Script to update customer data in existing installment payments
 * This script will fetch customer info from InstallmentOrder and update InstallmentPayment records
 */

require('dotenv').config();
const mongoose = require('mongoose');
const InstallmentPayment = require('../models/Installment/InstallmentPayment');
const InstallmentOrder = require('../models/Installment/InstallmentOrder');

async function updatePaymentCustomerData() {
  try {
    // Connect to MongoDB
    const dbUrl = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/accounting';
    await mongoose.connect(dbUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Find all payments with missing customer data
    const paymentsToUpdate = await InstallmentPayment.find({
      $or: [
        { customerName: { $in: [null, undefined, 'ไม่ระบุ', ''] } },
        { customerPhone: { $in: [null, undefined, 'ไม่ระบุ', ''] } }
      ]
    }).lean();

    console.log(`📊 Found ${paymentsToUpdate.length} payments to update`);

    let updatedCount = 0;
    let failedCount = 0;

    for (const payment of paymentsToUpdate) {
      try {
        // Find the associated contract
        const contract = await InstallmentOrder.findById(payment.contractId).lean();

        if (!contract) {
          console.log(`⚠️ Contract not found for payment ${payment._id}`);
          failedCount++;
          continue;
        }

        // Extract customer information
        let customerName = 'ไม่ระบุ';
        let customerPhone = 'ไม่ระบุ';

        if (contract.customer_info) {
          const { prefix = '', firstName = '', lastName = '', phone = '' } = contract.customer_info;
          customerName = `${prefix} ${firstName} ${lastName}`.trim() || 'ไม่ระบุ';
          customerPhone = phone || 'ไม่ระบุ';
        }

        // Update the payment record
        await InstallmentPayment.findByIdAndUpdate(payment._id, {
          customerName: customerName,
          customerPhone: customerPhone,
          contractNumber: contract.contractNumber || payment.contractNumber
        });

        console.log(`✅ Updated payment ${payment.paymentId} - Customer: ${customerName}`);
        updatedCount++;

      } catch (error) {
        console.error(`❌ Error updating payment ${payment._id}:`, error.message);
        failedCount++;
      }
    }

    console.log('\n📋 Update Summary:');
    console.log(`✅ Successfully updated: ${updatedCount} records`);
    console.log(`❌ Failed to update: ${failedCount} records`);
    console.log(`📊 Total processed: ${paymentsToUpdate.length} records`);

  } catch (error) {
    console.error('❌ Script error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
console.log('🚀 Starting customer data update script...');
console.log('📅 Date:', new Date().toISOString());
console.log('');

updatePaymentCustomerData();