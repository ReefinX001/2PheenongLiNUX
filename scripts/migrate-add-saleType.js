/**
 * Migration Script: Add saleType field to existing documents
 * เพิ่ม saleType field ให้กับเอกสารที่มีอยู่แล้วในฐานข้อมูล
 */

const mongoose = require('mongoose');
const TaxInvoice = require('../models/TaxInvoice');
const Receipt = require('../models/Receipt');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/my-accounting-app';

async function migrateSaleType() {
  try {
    console.log('🚀 Starting saleType migration...');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Migrate TaxInvoice documents
    console.log('📄 Migrating TaxInvoice documents...');

    // Update documents without saleType (assume they are cash sales)
    const taxInvoiceResult = await TaxInvoice.updateMany(
      { saleType: { $exists: false } }, // Documents without saleType
      {
        $set: {
          saleType: 'cash' // Default to cash sales
        }
      }
    );

    console.log(`✅ Updated ${taxInvoiceResult.modifiedCount} TaxInvoice documents`);

    // Migrate Receipt documents
    console.log('📄 Migrating Receipt documents...');

    const receiptResult = await Receipt.updateMany(
      { saleType: { $exists: false } }, // Documents without saleType
      {
        $set: {
          saleType: 'cash' // Default to cash sales
        }
      }
    );

    console.log(`✅ Updated ${receiptResult.modifiedCount} Receipt documents`);

    // Special case: Update installment receipts based on receiptType
    console.log('📄 Updating installment receipts based on receiptType...');

    const installmentTaxInvoiceResult = await TaxInvoice.updateMany(
      {
        receiptType: { $in: ['down_payment_tax_invoice', 'installment_tax_invoice'] },
        saleType: 'cash' // Only update those that were set to cash by default
      },
      {
        $set: {
          saleType: 'installment'
        }
      }
    );

    const installmentReceiptResult = await Receipt.updateMany(
      {
        receiptType: { $in: ['down_payment_receipt', 'installment_receipt'] },
        saleType: 'cash' // Only update those that were set to cash by default
      },
      {
        $set: {
          saleType: 'installment'
        }
      }
    );

    console.log(`✅ Updated ${installmentTaxInvoiceResult.modifiedCount} installment TaxInvoice documents`);
    console.log(`✅ Updated ${installmentReceiptResult.modifiedCount} installment Receipt documents`);

    // Summary
    console.log('\n📊 Migration Summary:');
    console.log(`- TaxInvoice documents updated: ${taxInvoiceResult.modifiedCount}`);
    console.log(`- Receipt documents updated: ${receiptResult.modifiedCount}`);
    console.log(`- Installment TaxInvoice corrected: ${installmentTaxInvoiceResult.modifiedCount}`);
    console.log(`- Installment Receipt corrected: ${installmentReceiptResult.modifiedCount}`);

    // Verify results
    console.log('\n🔍 Verification:');
    const cashTaxInvoices = await TaxInvoice.countDocuments({ saleType: 'cash' });
    const installmentTaxInvoices = await TaxInvoice.countDocuments({ saleType: 'installment' });
    const cashReceipts = await Receipt.countDocuments({ saleType: 'cash' });
    const installmentReceipts = await Receipt.countDocuments({ saleType: 'installment' });

    console.log(`- Cash TaxInvoices: ${cashTaxInvoices}`);
    console.log(`- Installment TaxInvoices: ${installmentTaxInvoices}`);
    console.log(`- Cash Receipts: ${cashReceipts}`);
    console.log(`- Installment Receipts: ${installmentReceipts}`);

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run migration
if (require.main === module) {
  migrateSaleType();
}

module.exports = { migrateSaleType };






