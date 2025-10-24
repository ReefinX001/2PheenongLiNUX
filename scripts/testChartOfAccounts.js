// scripts/testChartOfAccounts.js
const mongoose = require('mongoose');
const ChartOfAccount = require('../models/Account/ChartOfAccount');
require('dotenv').config();

async function testChartOfAccounts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/accounting', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');
    console.log('==================================\n');

    // 1. Count total accounts
    const totalCount = await ChartOfAccount.countDocuments();
    console.log(`Total accounts in database: ${totalCount}`);

    // 2. Check field names
    const firstAccount = await ChartOfAccount.findOne();
    if (firstAccount) {
      console.log('\nFirst account structure:');
      console.log('Fields:', Object.keys(firstAccount.toObject()));
      console.log('Sample:', {
        _id: firstAccount._id,
        code: firstAccount.code,
        name: firstAccount.name,
        account_code: firstAccount.account_code, // check if this exists
        account_name: firstAccount.account_name  // check if this exists
      });
    }

    // 3. Find income accounts (4xxx)
    console.log('\n==================================');
    console.log('Income Accounts (code starting with 4):');
    const incomeAccounts = await ChartOfAccount.find({
      code: { $regex: '^4' }
    }).select('code name type category').limit(20);

    if (incomeAccounts.length > 0) {
      incomeAccounts.forEach(acc => {
        console.log(`  ${acc.code} - ${acc.name} (${acc.type})`);
      });
      console.log(`\nTotal income accounts: ${incomeAccounts.length}`);
    } else {
      console.log('  No income accounts found with code starting with "4"');

      // Try alternative field name
      console.log('\nTrying with account_code field:');
      const altAccounts = await ChartOfAccount.find({
        account_code: { $regex: '^4' }
      }).select('account_code account_name').limit(20);

      if (altAccounts.length > 0) {
        altAccounts.forEach(acc => {
          console.log(`  ${acc.account_code} - ${acc.account_name}`);
        });
      } else {
        console.log('  No accounts found with account_code starting with "4"');
      }
    }

    // 4. Show all unique field names from all documents
    console.log('\n==================================');
    console.log('Checking actual field names in database:');
    const sampleDocs = await ChartOfAccount.find().limit(5);
    const fieldSet = new Set();
    sampleDocs.forEach(doc => {
      Object.keys(doc.toObject()).forEach(key => fieldSet.add(key));
    });
    console.log('All fields found:', Array.from(fieldSet));

    // 5. Show actual income account codes if different pattern
    console.log('\n==================================');
    console.log('Sample of ALL accounts (first 10):');
    const allAccounts = await ChartOfAccount.find().limit(10);
    allAccounts.forEach(acc => {
      const obj = acc.toObject();
      const code = obj.code || obj.account_code || obj.accountCode || 'NO_CODE';
      const name = obj.name || obj.account_name || obj.accountName || 'NO_NAME';
      console.log(`  ${code} - ${name}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the test
testChartOfAccounts();