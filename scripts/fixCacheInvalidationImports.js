const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '../routes');

function fixCacheInvalidationImport(filePath) {
  try {
    const filename = path.basename(filePath);
    let content = fs.readFileSync(filePath, 'utf8');

    // Check if file uses cacheInvalidation but doesn't import it
    if (content.includes('cacheInvalidation.smart()') &&
        !content.includes("require('../middlewares/cacheInvalidation')") &&
        !content.includes("require('../../middlewares/cacheInvalidation')")) {

      // Determine correct import path based on file location
      const relativePath = path.relative(routesDir, filePath);
      const depth = relativePath.split(path.sep).length - 1;
      const importPath = depth === 0 ? '../middlewares/cacheInvalidation' : '../../middlewares/cacheInvalidation';

      // Find the best place to add the import
      const lines = content.split('\n');
      let insertIndex = -1;

      // Look for last require statement
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('require(') && !lines[i].includes('//')) {
          insertIndex = i;
        }
        // Stop looking after we hit router definitions
        if (lines[i].includes('router.')) {
          break;
        }
      }

      if (insertIndex !== -1) {
        lines.splice(insertIndex + 1, 0, `const cacheInvalidation = require('${importPath}');`);
        content = lines.join('\n');

        fs.writeFileSync(filePath, content);
        return { status: 'fixed', filename, importPath };
      }
    }

    return { status: 'no_fix_needed', filename };

  } catch (error) {
    return { status: 'error', filename: path.basename(filePath), error: error.message };
  }
}

function processAllRoutes() {
  const results = { fixed: 0, noFixNeeded: 0, errors: 0 };

  function processDirectory(dir) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        processDirectory(fullPath);
      } else if (item.endsWith('.js')) {
        const result = fixCacheInvalidationImport(fullPath);

        switch (result.status) {
          case 'fixed':
            results.fixed++;
            console.log(`✅ ${result.filename} - Added import: ${result.importPath}`);
            break;
          case 'no_fix_needed':
            results.noFixNeeded++;
            break;
          case 'error':
            results.errors++;
            console.log(`❌ ${result.filename} - Error: ${result.error}`);
            break;
        }
      }
    }
  }

  console.log('🔧 Fixing cacheInvalidation imports...\n');
  processDirectory(routesDir);

  console.log('\n📊 Summary:');
  console.log(`✅ Fixed imports: ${results.fixed}`);
  console.log(`📝 No fix needed: ${results.noFixNeeded}`);
  console.log(`❌ Errors: ${results.errors}`);

  return results;
}

if (require.main === module) {
  processAllRoutes();
}

module.exports = { processAllRoutes };