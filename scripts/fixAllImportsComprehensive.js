const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '../routes');

function fixAllImportsComprehensively(filePath) {
  try {
    const filename = path.basename(filePath);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Determine correct import paths based on file location
    const relativePath = path.relative(routesDir, filePath);
    const depth = relativePath.split(path.sep).length - 1;
    const cacheConfigPath = depth === 0 ? '../config/cache' : '../../config/cache';
    const cacheInvalidationPath = depth === 0 ? '../middlewares/cacheInvalidation' : '../../middlewares/cacheInvalidation';

    // Split content into lines for easier manipulation
    let lines = content.split('\n');
    let hasRequires = false;
    let lastRequireIndex = -1;

    // Find where require statements end
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('require(') && !lines[i].includes('//') && !lines[i].trim().startsWith('//')) {
        hasRequires = true;
        lastRequireIndex = i;
      }
      // Stop looking after we hit router definitions or module.exports
      if (lines[i].includes('router.') || lines[i].includes('module.exports')) {
        break;
      }
    }

    // If no requires found, look for express router declaration
    if (!hasRequires) {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('const router = express.Router()')) {
          lastRequireIndex = i;
          break;
        }
      }
    }

    let importsToAdd = [];

    // Check if file uses cacheMiddleware but doesn't import it
    if (content.includes('cacheMiddleware(') &&
        !content.includes("require('../config/cache')") &&
        !content.includes("require('../../config/cache')")) {
      importsToAdd.push(`const { cacheMiddleware } = require('${cacheConfigPath}');`);
      modified = true;
    }

    // Check if file uses cacheInvalidation but doesn't import it
    if (content.includes('cacheInvalidation.smart()') &&
        !content.includes("require('../middlewares/cacheInvalidation')") &&
        !content.includes("require('../../middlewares/cacheInvalidation')")) {
      importsToAdd.push(`const cacheInvalidation = require('${cacheInvalidationPath}');`);
      modified = true;
    }

    // Add imports after the last require or router declaration
    if (modified && lastRequireIndex !== -1) {
      // Insert all imports after the last require
      for (let i = importsToAdd.length - 1; i >= 0; i--) {
        lines.splice(lastRequireIndex + 1, 0, importsToAdd[i]);
      }

      content = lines.join('\n');
      fs.writeFileSync(filePath, content);
      return { status: 'fixed', filename, imports: importsToAdd.length };
    }

    return { status: 'no_fix_needed', filename };

  } catch (error) {
    return { status: 'error', filename: path.basename(filePath), error: error.message };
  }
}

function processAllFilesRecursively() {
  const results = { fixed: 0, noFixNeeded: 0, errors: 0, details: [] };

  function processDirectory(dir) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        processDirectory(fullPath);
      } else if (item.endsWith('.js')) {
        const result = fixAllImportsComprehensively(fullPath);
        results.details.push(result);

        switch (result.status) {
          case 'fixed':
            results.fixed++;
            console.log(`✅ ${result.filename} - Fixed ${result.imports} import(s)`);
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

  console.log('🔧 Comprehensively fixing ALL cache imports...\n');
  processDirectory(routesDir);

  console.log('\n📊 Final Summary:');
  console.log(`✅ Files Fixed: ${results.fixed}`);
  console.log(`📝 Files OK: ${results.noFixNeeded}`);
  console.log(`❌ Errors: ${results.errors}`);
  console.log(`📁 Total Files: ${results.fixed + results.noFixNeeded + results.errors}`);

  if (results.fixed > 0) {
    console.log('\n🎉 All cache imports have been fixed!');
    console.log('💡 You can now restart the server with: npm start');
  }

  return results;
}

if (require.main === module) {
  processAllFilesRecursively();
}

module.exports = { processAllFilesRecursively };