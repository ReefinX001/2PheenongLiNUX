const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '../routes');

function addCacheInvalidationToFile(filePath) {
  try {
    const filename = path.basename(filePath);
    let content = fs.readFileSync(filePath, 'utf8');

    // Skip if already has cache invalidation
    if (content.includes('cacheInvalidation') || !content.includes('router.')) {
      return { status: 'skipped', filename };
    }

    // Add cache invalidation import
    if (content.includes('cacheMiddleware') && !content.includes('cacheInvalidation')) {
      content = content.replace(
        /const { cacheMiddleware } = require\(['"]\.\.\/config\/cache['"]\);/,
        `const { cacheMiddleware } = require('../config/cache');\nconst cacheInvalidation = require('../middlewares/cacheInvalidation');`
      );
    }

    let routesModified = 0;

    // Add cache invalidation to POST routes
    content = content.replace(
      /router\.post\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^,\n)]+)\)/g,
      (match, route, handler) => {
        if (match.includes('cacheInvalidation')) return match;
        routesModified++;
        return `router.post('${route}', cacheInvalidation.smart(), ${handler})`;
      }
    );

    // Add cache invalidation to PUT routes
    content = content.replace(
      /router\.put\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^,\n)]+)\)/g,
      (match, route, handler) => {
        if (match.includes('cacheInvalidation')) return match;
        routesModified++;
        return `router.put('${route}', cacheInvalidation.smart(), ${handler})`;
      }
    );

    // Add cache invalidation to PATCH routes
    content = content.replace(
      /router\.patch\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^,\n)]+)\)/g,
      (match, route, handler) => {
        if (match.includes('cacheInvalidation')) return match;
        routesModified++;
        return `router.patch('${route}', cacheInvalidation.smart(), ${handler})`;
      }
    );

    // Add cache invalidation to DELETE routes
    content = content.replace(
      /router\.delete\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^,\n)]+)\)/g,
      (match, route, handler) => {
        if (match.includes('cacheInvalidation')) return match;
        routesModified++;
        return `router.delete('${route}', cacheInvalidation.smart(), ${handler})`;
      }
    );

    if (routesModified > 0) {
      fs.writeFileSync(filePath, content);
      return { status: 'success', filename, routesModified };
    }

    return { status: 'no_write_routes', filename };

  } catch (error) {
    return { status: 'error', filename: path.basename(filePath), error: error.message };
  }
}

function processAllRoutes() {
  const results = { success: 0, skipped: 0, errors: 0, noWrite: 0 };

  function processDirectory(dir) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        processDirectory(fullPath);
      } else if (item.endsWith('.js')) {
        const result = addCacheInvalidationToFile(fullPath);

        switch (result.status) {
          case 'success':
            results.success++;
            console.log(`✅ ${result.filename} - Added invalidation (${result.routesModified} routes)`);
            break;
          case 'skipped':
            results.skipped++;
            console.log(`⏭️  ${result.filename} - Skipped`);
            break;
          case 'no_write_routes':
            results.noWrite++;
            console.log(`📝 ${result.filename} - No write routes found`);
            break;
          case 'error':
            results.errors++;
            console.log(`❌ ${result.filename} - Error: ${result.error}`);
            break;
        }
      }
    }
  }

  console.log('🗑️  Adding cache invalidation to write operations...\n');
  processDirectory(routesDir);

  console.log('\n📊 Summary:');
  console.log(`✅ Added invalidation: ${results.success}`);
  console.log(`📝 No write routes: ${results.noWrite}`);
  console.log(`⏭️  Skipped: ${results.skipped}`);
  console.log(`❌ Errors: ${results.errors}`);

  return results;
}

if (require.main === module) {
  processAllRoutes();
}

module.exports = { processAllRoutes };