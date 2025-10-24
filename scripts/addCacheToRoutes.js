const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '../routes');

// Cache TTL strategies
const cacheStrategies = {
  // Master data - ข้อมูลหลักที่เปลี่ยนแปลงน้อย
  masterData: 1800, // 30 minutes

  // Dashboard data - ข้อมูล dashboard
  dashboard: 300, // 5 minutes

  // Financial data - ข้อมูลการเงิน
  financial: 60, // 1 minute

  // Inventory data - ข้อมูล stock
  inventory: 30, // 30 seconds

  // Real-time data - ข้อมูลแบบ real-time
  realtime: 10, // 10 seconds

  // User data - ข้อมูลผู้ใช้
  userData: 600, // 10 minutes

  // Report data - รายงาน
  report: 300 // 5 minutes
};

// Route patterns and their cache strategies
const routePatterns = {
  // Master data routes
  masterData: [
    'branchRoutes.js',
    'categoryRoutes.js',
    'productCategoryRoutes.js',
    'supplierRoutes.js',
    'chartOfAccountsRoutes.js',
    'provinceRoutes.js',
    'zoneRoutes.js',
    'userRoleRoutes.js'
  ],

  // Dashboard routes
  dashboard: [
    'dashboardRoutes.js',
    'salesDashboardRoutes.js',
    'loanDashboardRoutes.js',
    'installmentDashboardRoutes.js'
  ],

  // Financial routes
  financial: [
    'incomeRoutes.js',
    'expenseRoutes.js',
    'paymentRoutes.js',
    'billingInvoiceRoutes.js',
    'contractRoutes.js'
  ],

  // Inventory routes
  inventory: [
    'stockRoutes.js',
    'stockHistoryRoutes.js',
    'branchStockRoutes.js',
    'stockAuditRoutes.js',
    'stockValuationRoutes.js'
  ],

  // Report routes
  report: [
    'salesReportRoutes.js',
    'stockReportRoutes.js',
    'analyticsRoutes.js'
  ]
};

// Routes that should NOT have caching
const excludeRoutes = [
  'authRoutes.js',
  'uploadRoutes.js',
  'uploadDocuments.js',
  'uploadSignature.js',
  'downloadRoutes.js',
  'printRoutes.js',
  'pdfRoutes.js'
];

function addCacheToRoute(filePath, cacheType) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Skip if already has cache
    if (content.includes('cacheMiddleware') || content.includes('cache')) {
      console.log(`✅ ${path.basename(filePath)} - Already has caching`);
      return;
    }

    // Skip excluded routes
    if (excludeRoutes.includes(path.basename(filePath))) {
      console.log(`⏭️  ${path.basename(filePath)} - Excluded from caching`);
      return;
    }

    const ttl = cacheStrategies[cacheType];

    // Add cache import after express
    if (!content.includes("require('../config/cache')")) {
      content = content.replace(
        /const express = require\(['"]express['"]\);.*?\n/,
        `const express = require('express');\nconst { cacheMiddleware } = require('../config/cache');\n`
      );
    }

    // Add cache to GET routes
    content = content.replace(
      /router\.get\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^,\n]+)\)/g,
      (match, route, controller) => {
        // Skip if already has middleware
        if (match.includes('cacheMiddleware')) return match;
        return `router.get('${route}', cacheMiddleware(${ttl}), ${controller})`;
      }
    );

    fs.writeFileSync(filePath, content);
    console.log(`✅ ${path.basename(filePath)} - Added ${cacheType} caching (${ttl}s)`);

  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

function processRoutes() {
  console.log('🚀 Adding Redis caching to routes...\n');

  // Process routes by category
  Object.entries(routePatterns).forEach(([cacheType, files]) => {
    console.log(`\n📁 Processing ${cacheType} routes (${cacheStrategies[cacheType]}s TTL):`);

    files.forEach(filename => {
      const filePath = path.join(routesDir, filename);
      if (fs.existsSync(filePath)) {
        addCacheToRoute(filePath, cacheType);
      } else {
        console.log(`⚠️  ${filename} - File not found`);
      }
    });
  });

  console.log('\n✅ Cache setup completed!');
}

// Run the script
processRoutes();