const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '../routes');

// Enhanced cache strategies
const cacheStrategies = {
  masterData: 1800,    // 30 minutes - rarely changed data
  dashboard: 300,      // 5 minutes - dashboard data
  financial: 60,       // 1 minute - financial data
  inventory: 30,       // 30 seconds - stock data
  realtime: 10,        // 10 seconds - real-time data
  reports: 600,        // 10 minutes - reports
  lookup: 900,         // 15 minutes - lookup/dropdown data
  short: 120,          // 2 minutes - short-term cache
  medium: 300,         // 5 minutes - medium-term cache
  long: 1200           // 20 minutes - long-term cache
};

// Route classification patterns
const routeClassification = {
  // Should NOT be cached
  noCachePatterns: [
    /auth/i, /login/i, /logout/i, /password/i,
    /upload/i, /download/i, /export/i, /import/i,
    /pdf/i, /print/i, /generate/i,
    /socket/i, /webhook/i, /callback/i,
    /test/i, /debug/i
  ],

  // Master data - rarely changes
  masterDataPatterns: [
    /branch/i, /category/i, /supplier/i, /user/i, /role/i,
    /province/i, /zone/i, /chart.*account/i, /account/i,
    /employee/i, /department/i, /position/i
  ],

  // Dashboard and stats
  dashboardPatterns: [
    /dashboard/i, /stats/i, /summary/i, /analytics/i,
    /report/i, /overview/i, /monitor/i
  ],

  // Financial data
  financialPatterns: [
    /income/i, /expense/i, /payment/i, /invoice/i, /billing/i,
    /contract/i, /installment/i, /loan/i, /credit/i, /debit/i,
    /receipt/i, /voucher/i, /journal/i, /ledger/i
  ],

  // Inventory and stock
  inventoryPatterns: [
    /stock/i, /inventory/i, /product/i, /item/i,
    /warehouse/i, /transfer/i, /audit/i, /valuation/i
  ],

  // Real-time data
  realtimePatterns: [
    /pos/i, /sale/i, /order/i, /transaction/i, /live/i,
    /current/i, /today/i, /now/i, /recent/i
  ],

  // Lookup data
  lookupPatterns: [
    /dropdown/i, /list/i, /search/i, /find/i, /lookup/i,
    /options/i, /choices/i, /select/i
  ]
};

function classifyRoute(filename, content) {
  const lowerName = filename.toLowerCase();
  const lowerContent = content.toLowerCase();

  // Check if should not be cached
  for (const pattern of routeClassification.noCachePatterns) {
    if (pattern.test(lowerName) || pattern.test(lowerContent)) {
      return 'noCache';
    }
  }

  // Check for specific patterns
  for (const [type, patterns] of Object.entries(routeClassification)) {
    if (type === 'noCachePatterns') continue;

    for (const pattern of patterns) {
      if (pattern.test(lowerName)) {
        return type.replace('Patterns', '');
      }
    }
  }

  // Default classification based on content analysis
  if (lowerContent.includes('dashboard') || lowerContent.includes('stats')) {
    return 'dashboard';
  }
  if (lowerContent.includes('master') || lowerContent.includes('reference')) {
    return 'masterData';
  }
  if (lowerContent.includes('report') || lowerContent.includes('analytics')) {
    return 'reports';
  }

  // Default to medium cache
  return 'medium';
}

function addCacheToFile(filePath) {
  try {
    const filename = path.basename(filePath);
    let content = fs.readFileSync(filePath, 'utf8');

    // Skip if already has cache
    if (content.includes('cacheMiddleware') || content.includes('cache')) {
      return { status: 'already_cached', filename };
    }

    // Classify the route
    const classification = classifyRoute(filename, content);

    if (classification === 'noCache') {
      return { status: 'excluded', filename, reason: 'Should not be cached' };
    }

    const ttl = cacheStrategies[classification] || cacheStrategies.medium;

    // Add cache import
    if (!content.includes("require('../config/cache')")) {
      // Find the best place to add the import
      const expressImport = content.match(/const express = require\(['"]express['"]\);/);
      if (expressImport) {
        content = content.replace(
          expressImport[0],
          `${expressImport[0]}\nconst { cacheMiddleware } = require('../config/cache');`
        );
      } else {
        // Add at the top after other requires
        const requireLines = content.match(/const .+ = require\(.+\);/g);
        if (requireLines && requireLines.length > 0) {
          const lastRequire = requireLines[requireLines.length - 1];
          content = content.replace(
            lastRequire,
            `${lastRequire}\nconst { cacheMiddleware } = require('../config/cache');`
          );
        }
      }
    }

    // Add cache to GET routes
    let routesModified = 0;
    content = content.replace(
      /router\.get\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^,\n)]+)\)/g,
      (match, route, handler) => {
        // Skip if already has middleware or cache
        if (match.includes('cacheMiddleware') || match.includes('authJWT')) {
          return match;
        }
        routesModified++;
        return `router.get('${route}', cacheMiddleware(${ttl}), ${handler})`;
      }
    );

    // Also handle routes with middleware
    content = content.replace(
      /router\.get\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^,]+),\s*([^,\n)]+)\)/g,
      (match, route, middleware, handler) => {
        // Skip if already has cache
        if (match.includes('cacheMiddleware')) {
          return match;
        }
        // Add cache after existing middleware
        routesModified++;
        return `router.get('${route}', ${middleware}, cacheMiddleware(${ttl}), ${handler})`;
      }
    );

    fs.writeFileSync(filePath, content);

    return {
      status: 'success',
      filename,
      classification,
      ttl,
      routesModified
    };

  } catch (error) {
    return {
      status: 'error',
      filename: path.basename(filePath),
      error: error.message
    };
  }
}

function processAllRoutes(directory) {
  const results = {
    success: 0,
    alreadyCached: 0,
    excluded: 0,
    errors: 0,
    details: []
  };

  function processDirectory(dir) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        processDirectory(fullPath);
      } else if (item.endsWith('.js')) {
        const result = addCacheToFile(fullPath);
        results.details.push(result);

        switch (result.status) {
          case 'success':
            results.success++;
            console.log(`✅ ${result.filename} - Added ${result.classification} caching (${result.ttl}s, ${result.routesModified} routes)`);
            break;
          case 'already_cached':
            results.alreadyCached++;
            console.log(`📝 ${result.filename} - Already has caching`);
            break;
          case 'excluded':
            results.excluded++;
            console.log(`⏭️  ${result.filename} - Excluded (${result.reason})`);
            break;
          case 'error':
            results.errors++;
            console.log(`❌ ${result.filename} - Error: ${result.error}`);
            break;
        }
      }
    }
  }

  console.log('🚀 Processing all route files...\n');
  processDirectory(directory);

  console.log('\n📊 Summary:');
  console.log(`✅ Successfully added caching: ${results.success}`);
  console.log(`📝 Already had caching: ${results.alreadyCached}`);
  console.log(`⏭️  Excluded from caching: ${results.excluded}`);
  console.log(`❌ Errors: ${results.errors}`);
  console.log(`📈 Total processed: ${results.success + results.alreadyCached + results.excluded + results.errors}`);

  return results;
}

// Run the script
if (require.main === module) {
  const results = processAllRoutes(routesDir);

  if (results.errors > 0) {
    console.log('\n⚠️  Some files had errors. Check the details above.');
  } else {
    console.log('\n🎉 All route files processed successfully!');
  }
}

module.exports = { processAllRoutes, addCacheToFile };