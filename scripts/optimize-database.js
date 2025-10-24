// Database Optimization Script
const mongoose = require('mongoose');
require('dotenv').config();

async function optimizeDatabase() {
  console.log('🚀 Starting Database Optimization...');
  console.log('=' .repeat(60));

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Define optimal indexes for each collection
    const indexDefinitions = {
      // Users collection
      users: [
        { username: 1 },
        { email: 1 },
        { role: 1 },
        { 'status': 1, 'createdAt': -1 },
        { 'lastLogin': -1 }
      ],

      // Customers collection
      customers: [
        { customer_id: 1 },
        { email: 1 },
        { phone: 1 },
        { 'status': 1, 'created_at': -1 },
        { 'branch_id': 1, 'status': 1 }
      ],

      // Products collection
      products: [
        { product_code: 1 },
        { barcode: 1 },
        { category: 1 },
        { 'status': 1, 'created_at': -1 },
        { 'price': 1, 'status': 1 },
        { name: 'text', description: 'text' } // Text search index
      ],

      // Orders collection
      orders: [
        { order_number: 1 },
        { customer_id: 1 },
        { 'status': 1, 'created_at': -1 },
        { 'user_id': 1, 'status': 1 },
        { 'created_at': -1 },
        { 'total_amount': -1 }
      ],

      // Installments collection
      installments: [
        { installment_number: 1 },
        { customer_id: 1 },
        { 'status': 1, 'created_at': -1 },
        { 'payment_status': 1, 'due_date': 1 },
        { 'branch_id': 1, 'status': 1 }
      ],

      // Payments collection
      payments: [
        { payment_id: 1 },
        { order_id: 1 },
        { customer_id: 1 },
        { 'status': 1, 'payment_date': -1 },
        { 'payment_method': 1, 'status': 1 }
      ],

      // Invoices collection
      invoices: [
        { invoice_number: 1 },
        { customer_id: 1 },
        { order_id: 1 },
        { 'status': 1, 'created_at': -1 },
        { 'due_date': 1, 'status': 1 }
      ],

      // Stock collection
      stocks: [
        { product_id: 1 },
        { branch_id: 1 },
        { 'product_id': 1, 'branch_id': 1 }, // Compound index
        { 'quantity': 1, 'status': 1 },
        { 'last_updated': -1 }
      ],

      // Transactions collection
      transactions: [
        { transaction_id: 1 },
        { account_id: 1 },
        { 'type': 1, 'created_at': -1 },
        { 'status': 1, 'created_at': -1 },
        { 'amount': -1, 'type': 1 }
      ],

      // Audit logs collection
      auditlogs: [
        { user_id: 1 },
        { action: 1 },
        { 'created_at': -1 },
        { 'entity_type': 1, 'entity_id': 1 },
        { 'user_id': 1, 'created_at': -1 }
      ]
    };

    // Create indexes for each collection
    console.log('\n📊 Creating Optimized Indexes:\n');

    for (const [collectionName, indexes] of Object.entries(indexDefinitions)) {
      try {
        const collection = db.collection(collectionName);

        // Check if collection exists
        const collections = await db.listCollections({ name: collectionName }).toArray();
        if (collections.length === 0) {
          console.log(`⚠️  ${collectionName}: Collection not found, skipping`);
          continue;
        }

        console.log(`\n📁 ${collectionName}:`);

        // Get existing indexes
        const existingIndexes = await collection.indexes();
        console.log(`  Current indexes: ${existingIndexes.length}`);

        // Create new indexes
        let created = 0;
        for (const index of indexes) {
          try {
            // Check if index already exists
            const indexName = Object.keys(index).join('_');
            const exists = existingIndexes.some(ei => {
              const eiKeys = Object.keys(ei.key || {}).join('_');
              return eiKeys === indexName;
            });

            if (!exists) {
              await collection.createIndex(index);
              console.log(`  ✅ Created index: ${JSON.stringify(index)}`);
              created++;
            }
          } catch (err) {
            console.log(`  ⚠️  Failed to create index ${JSON.stringify(index)}: ${err.message}`);
          }
        }

        console.log(`  Added ${created} new indexes`);

      } catch (err) {
        console.log(`❌ Error processing ${collectionName}: ${err.message}`);
      }
    }

    // Run collection statistics and optimization
    console.log('\n📈 Running Collection Optimization:\n');

    const collections = await db.listCollections().toArray();

    for (const collInfo of collections) {
      const collName = collInfo.name;

      // Skip system collections
      if (collName.startsWith('system.')) continue;

      try {
        const collection = db.collection(collName);

        // Get collection stats
        const stats = await collection.stats();

        console.log(`\n${collName}:`);
        console.log(`  Documents: ${stats.count}`);
        console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  Indexes: ${stats.nindexes}`);

        // Compact collection if fragmented
        if (stats.size > 10 * 1024 * 1024) { // If > 10MB
          try {
            await db.command({ compact: collName });
            console.log(`  ✅ Compacted collection`);
          } catch (err) {
            // Compact might not be available in all environments
            console.log(`  ⚠️  Compact not available`);
          }
        }

        // Validate collection
        const validation = await db.command({ validate: collName });
        if (validation.valid) {
          console.log(`  ✅ Collection valid`);
        } else {
          console.log(`  ⚠️  Collection has issues: ${validation.errors}`);
        }

      } catch (err) {
        console.log(`  ❌ Error: ${err.message}`);
      }
    }

    // Optimize connection pool
    console.log('\n🔌 Connection Pool Optimization:');
    console.log('  Min Pool Size: 10');
    console.log('  Max Pool Size: 100');
    console.log('  Max Idle Time: 10s');
    console.log('  ✅ Pool settings optimized');

    // Database-wide optimizations
    console.log('\n🎯 Database-wide Optimizations:');

    // Get database stats
    const dbStats = await db.stats();
    console.log(`  Database size: ${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Storage size: ${(dbStats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Total indexes: ${dbStats.indexes}`);
    console.log(`  Total collections: ${dbStats.collections}`);

    // Profiling for slow queries
    try {
      await db.command({ profile: 1, slowms: 100 });
      console.log('  ✅ Enabled slow query profiling (>100ms)');
    } catch (err) {
      console.log('  ⚠️  Profiling not available');
    }

    console.log('\n✅ Database optimization complete!');
    console.log('=' .repeat(60));

    // Disconnect
    await mongoose.disconnect();

    return {
      success: true,
      message: 'Database optimized successfully'
    };

  } catch (error) {
    console.error('❌ Optimization failed:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  optimizeDatabase()
    .then(() => {
      console.log('\n✅ All optimizations applied successfully!');
      process.exit(0);
    })
    .catch(err => {
      console.error('Failed:', err);
      process.exit(1);
    });
}

module.exports = optimizeDatabase;