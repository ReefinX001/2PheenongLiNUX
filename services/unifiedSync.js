// services/unifiedSync.js - Unified Change Stream Handler
const ProductImage = require('../models/Stock/ProductImage');
const BranchStock = require('../models/POS/BranchStock');
const redis = require('redis');

// Global sync state management
let isProductSyncEnabled = false;
let activeChangeStreams = [];
let redisClient = null;
let isRedisConnected = false;

/**
 * Initialize Redis client for caching (reused from syncBranchStock.js)
 */
async function initRedisClient() {
  if (!redisClient && process.env.REDIS_URL) {
    try {
      redisClient = redis.createClient({ url: process.env.REDIS_URL });
      redisClient.on('error', (err) => console.log('Redis sync cache error:', err.message));
      redisClient.on('connect', () => { isRedisConnected = true; });
      redisClient.on('disconnect', () => { isRedisConnected = false; });

      if (!isRedisConnected) {
        await redisClient.connect();
      }
      console.log('✅ Redis sync cache connected');
    } catch (error) {
      console.log('⚠️ Redis not available for sync cache:', error.message);
      redisClient = null;
    }
  }
  return redisClient;
}

/**
 * Cache management functions
 */
function getCacheKey(productImageId, version = 'v1') {
  return `sync:product:${productImageId}:${version}`;
}

async function isSynced(productImageId, currentHash) {
  const client = await initRedisClient();
  if (!client || !isRedisConnected) return false;

  try {
    const cachedHash = await client.get(getCacheKey(productImageId));
    return cachedHash === currentHash;
  } catch (error) {
    console.log('Redis cache check error:', error.message);
    return false;
  }
}

async function markAsSynced(productImageId, hash, ttlSeconds = 3600) {
  const client = await initRedisClient();
  if (!client || !isRedisConnected) return;

  try {
    await client.setEx(getCacheKey(productImageId), ttlSeconds, hash);
  } catch (error) {
    console.log('Redis cache save error:', error.message);
  }
}

/**
 * Create hash from ProductImage data
 */
function createProductHash(productData) {
  const crypto = require('crypto');
  const dataString = JSON.stringify({
    name: productData.name,
    price: productData.price,
    category_name: productData.category_name,
    category_group: productData.category_group,
    updatedAt: productData.updatedAt,
    productType: productData.productType
  });
  return crypto.createHash('md5').update(dataString).digest('hex');
}

/**
 * Sync product data from ProductImage to BranchStock
 */
async function syncProductData(pic, io, skipCache = false) {
  try {
    const {
      name,
      price = 0,
      downAmount = 0,
      downInstallmentCount = 0,
      downInstallment = 0,
      creditThreshold = 0,
      payUseInstallmentCount = 0,
      payUseInstallment = 0,
      pricePayOff = 0,
      docFee = 0,
      image = '',
      purchaseType = [],
      productType = 'mobile',
      boxsetType,
      boxsetProducts = [],
      stockType = 'imei',
      category_name = '',
      category_group = ''
    } = pic;

    if (!name) return { matched: 0, modified: 0 };

    // Check cache unless explicitly skipped
    if (!skipCache) {
      const currentHash = createProductHash(pic);
      const alreadySynced = await isSynced(pic._id.toString(), currentHash);
      if (alreadySynced) {
        return { matched: 0, modified: 0, skipped: true };
      }
    }

    const updateData = {
      price,
      downAmount,
      downInstallmentCount,
      downInstallment,
      creditThreshold,
      payUseInstallmentCount,
      payUseInstallment,
      pricePayOff,
      docFee,
      image,
      purchaseType,
      productType,
      boxsetProducts,
      stockType,
      category_name,
      category_group
    };

    // Add boxsetType only for boxset products
    if (productType === 'boxset' && boxsetType) {
      updateData.boxsetType = boxsetType;
    }

    // Update matching BranchStock records
    const result = await BranchStock.updateMany(
      { name: { $regex: `^\\s*${name.trim()}\\s*$`, $options: 'i' } },
      { $set: updateData }
    );

    // Cache the sync if successful
    if (result.modifiedCount > 0) {
      const currentHash = createProductHash(pic);
      await markAsSynced(pic._id.toString(), currentHash, 3600);

      // Emit Socket.IO events for both product and category updates (if io is available)
      if (io) {
        io.emit('branchStockUpdated', {
          productImageId: pic._id.toString(),
          fields: updateData
        });
      }

      console.log(`✅ Synced "${name}" → ${result.matchedCount} matched, ${result.modifiedCount} modified`);
    }

    return {
      matched: result.matchedCount,
      modified: result.modifiedCount,
      skipped: false
    };
  } catch (error) {
    console.error('❌ Error syncing product data:', error.message);
    return { matched: 0, modified: 0, error: error.message };
  }
}

/**
 * Handle new BranchStock insertion - sync from ProductImage
 */
async function handleNewBranchStock(newBS, io) {
  try {
    if (!newBS.name) return;

    // Find matching ProductImage
    const pic = await ProductImage.findOne({
      name: new RegExp(`^\\s*${newBS.name.trim()}\\s*$`, 'i')
    }).lean();

    if (!pic) return;

    // Sync data from ProductImage to the new BranchStock
    const updateData = {
      price: pic.price || 0,
      downAmount: pic.downAmount || 0,
      downInstallmentCount: pic.downInstallmentCount || 0,
      downInstallment: pic.downInstallment || 0,
      creditThreshold: pic.creditThreshold || 0,
      payUseInstallmentCount: pic.payUseInstallmentCount || 0,
      payUseInstallment: pic.payUseInstallment || 0,
      pricePayOff: pic.pricePayOff || 0,
      docFee: pic.docFee || 0,
      image: pic.image || '',
      purchaseType: pic.purchaseType || [],
      productType: pic.productType || 'mobile',
      boxsetProducts: pic.boxsetProducts || [],
      stockType: pic.stockType || 'imei',
      category_name: pic.category_name || '',
      category_group: pic.category_group || ''
    };

    // Add boxsetType only for boxset products
    if (pic.productType === 'boxset' && pic.boxsetType) {
      updateData.boxsetType = pic.boxsetType;
    }

    await BranchStock.updateOne(
      { _id: newBS._id },
      { $set: updateData }
    );

    console.log(`✅ New BranchStock "${newBS.name}" synced from ProductImage`);

    // Emit Socket.IO events (if io is available)
    if (io) {
      io.emit('branchStockUpdated', {
        branchStockId: newBS._id.toString(),
        fields: updateData
      });
    }

  } catch (error) {
    console.error('❌ Error handling new BranchStock:', error.message);
  }
}

/**
 * Gracefully close all change streams
 */
async function closeAllChangeStreams() {
  console.log('🔄 Closing all change streams...');

  for (const stream of activeChangeStreams) {
    try {
      if (stream && typeof stream.close === 'function') {
        await stream.close();
      }
    } catch (error) {
      console.warn('⚠️ Error closing change stream:', error.message);
    }
  }

  activeChangeStreams = [];
  console.log('✅ All change streams closed');
}

/**
 * Unified change stream handler - consolidates all sync operations
 */
async function startUnifiedSync(io) {
  // Check if sync is enabled
  isProductSyncEnabled = process.env.ENABLE_PRODUCT_SYNC === 'true';

  if (!isProductSyncEnabled) {
    console.log('⏸️ Product sync disabled (ENABLE_PRODUCT_SYNC=false)');
    return;
  }

  console.log('🚀 Starting unified product sync system...');

  // Close any existing change streams first
  await closeAllChangeStreams();

  try {
    // Initialize Redis for caching
    await initRedisClient();

    // Single ProductImage change stream handler
    console.log('🔄 Starting unified ProductImage change stream...');
    const productImageStream = ProductImage.watch([], { fullDocument: 'updateLookup' });

    productImageStream.on('change', async (change) => {
      try {
        if (!isProductSyncEnabled) return;
        if (!['insert', 'update', 'replace'].includes(change.operationType)) return;

        const id = change.documentKey._id;
        let pic = change.fullDocument;

        // For update operations without fullDocument, fetch manually
        if (!pic) {
          pic = await ProductImage.findById(id).lean();
        }

        if (!pic?.name) return;

        await syncProductData(pic, io, true); // Skip cache for real-time changes

      } catch (error) {
        console.error('❌ Error in ProductImage unified change stream:', error.message);
      }
    });

    productImageStream.on('error', (error) => {
      console.error('❌ ProductImage change stream error:', error.message);
    });

    activeChangeStreams.push(productImageStream);

    // Single BranchStock change stream handler
    console.log('🔄 Starting unified BranchStock change stream...');
    const branchStockStream = BranchStock.watch([], { fullDocument: 'updateLookup' });

    branchStockStream.on('change', async (change) => {
      try {
        if (!isProductSyncEnabled) return;
        if (change.operationType === 'insert') {
          const newBS = change.fullDocument;
          await handleNewBranchStock(newBS, io);
        }
      } catch (error) {
        console.error('❌ Error in BranchStock unified change stream:', error.message);
      }
    });

    branchStockStream.on('error', (error) => {
      console.error('❌ BranchStock change stream error:', error.message);
    });

    activeChangeStreams.push(branchStockStream);

    console.log('✅ Unified sync system started successfully');
    console.log(`📊 Active change streams: ${activeChangeStreams.length}`);
    console.log('💡 Manual sync available at: /api/admin/sync-products');

  } catch (error) {
    console.error('❌ Error starting unified sync system:', error.message);
    await closeAllChangeStreams();
  }
}

/**
 * Manual sync function for bulk operations
 */
async function syncAllExisting(io) {
  if (!isProductSyncEnabled) {
    throw new Error('Product sync is disabled (ENABLE_PRODUCT_SYNC=false)');
  }

  console.log('🔄 Starting manual bulk sync...');

  const pics = await ProductImage.find().lean();
  console.log(`📊 Found ${pics.length} ProductImage records to sync`);

  let totalMatched = 0;
  let totalModified = 0;
  let skippedCount = 0;
  const BATCH_SIZE = 10;
  const DELAY_MS = 50;

  // Process in batches
  for (let i = 0; i < pics.length; i += BATCH_SIZE) {
    const batch = pics.slice(i, i + BATCH_SIZE);
    console.log(`📦 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(pics.length/BATCH_SIZE)} (${batch.length} items)`);

    for (const pic of batch) {
      const result = await syncProductData(pic, io || null, false); // Use cache, handle null io
      if (result.skipped) {
        skippedCount++;
      } else {
        totalMatched += result.matched || 0;
        totalModified += result.modified || 0;
      }
    }

    // Delay between batches (except last)
    if (i + BATCH_SIZE < pics.length) {
      console.log(`⏳ Waiting ${DELAY_MS}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  console.log(`✅ Bulk sync completed:`);
  console.log(`   📊 Total checked: ${pics.length}`);
  console.log(`   ⏭️ Skipped (cached): ${skippedCount}`);
  console.log(`   ✅ Processed: ${pics.length - skippedCount}`);
  console.log(`   📝 Matched: ${totalMatched}, Modified: ${totalModified}`);

  return {
    total: pics.length,
    skipped: skippedCount,
    processed: pics.length - skippedCount,
    matched: totalMatched,
    modified: totalModified
  };
}

/**
 * Get sync status
 */
function getSyncStatus() {
  return {
    enabled: isProductSyncEnabled,
    activeStreams: activeChangeStreams.length,
    redisConnected: isRedisConnected,
    environment: process.env.NODE_ENV || 'development'
  };
}

// Graceful shutdown handler
process.on('SIGINT', async () => {
  console.log('🛑 Graceful shutdown: closing change streams...');
  await closeAllChangeStreams();
  if (redisClient) {
    try {
      await redisClient.disconnect();
    } catch (error) {
      console.warn('⚠️ Error disconnecting Redis:', error.message);
    }
  }
});

process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received: closing change streams...');
  await closeAllChangeStreams();
});

module.exports = {
  startUnifiedSync,
  syncAllExisting,
  getSyncStatus,
  closeAllChangeStreams
};