// Script to populate finance partners data
const mongoose = require('mongoose');
const FinancePartner = require('../models/MKT/FinancePartner');
const sampleFinancePartners = require('../sample-data/finance-partners');
require('dotenv').config();

async function populateFinancePartners() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.DB_CONNECTION_STRING || 'mongodb://127.0.0.1:27017/accounting_app', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await FinancePartner.deleteMany({});
    console.log('🗑️ Cleared existing finance partners');

    // Insert sample data
    const insertedPartners = await FinancePartner.insertMany(sampleFinancePartners);
    console.log(`✅ Inserted ${insertedPartners.length} finance partners`);

    // Display inserted data
    console.log('\n📋 Inserted Finance Partners:');
    insertedPartners.forEach(partner => {
      console.log(`- ${partner.code}: ${partner.name} (${partner.type})`);
    });

    console.log('\n🎉 Finance Partners data populated successfully!');

  } catch (error) {
    console.error('❌ Error populating finance partners:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
populateFinancePartners();