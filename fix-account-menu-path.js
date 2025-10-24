/**
 * Script to fix wrong account-menu.js path
 * Change from /account/js/account-menu.js to /js/account-menu.js
 */

const fs = require('fs');
const path = require('path');

// Paths
const VIEWS_ACCOUNT_DIR = path.join(__dirname, 'views', 'account');

/**
 * Get all HTML files in the directory
 */
function getAllHtmlFiles(dir) {
  const files = fs.readdirSync(dir);
  return files.filter(file => file.endsWith('.html'));
}

/**
 * Fix account-menu.js path in a single file
 */
function fixMenuPath(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);

    console.log(`Processing: ${fileName}`);

    // Check if file has wrong path
    if (!content.includes('/account/js/account-menu.js')) {
      console.log(`  ⏭️  Correct path already: ${fileName}`);
      return false;
    }

    // Fix the path
    content = content.replace(
      /\/account\/js\/account-menu\.js/g,
      '/js/account-menu.js'
    );

    // Write the fixed content back to the file
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ Fixed path: ${fileName}`);
    return true;

  } catch (error) {
    console.error(`  ❌ Error processing ${path.basename(filePath)}:`, error.message);
    return null;
  }
}

/**
 * Main function
 */
function main() {
  console.log('🚀 Starting to fix account-menu.js path...\n');

  const htmlFiles = getAllHtmlFiles(VIEWS_ACCOUNT_DIR);
  console.log(`Found ${htmlFiles.length} HTML files to check\n`);

  let fixedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  htmlFiles.forEach(file => {
    const filePath = path.join(VIEWS_ACCOUNT_DIR, file);
    const result = fixMenuPath(filePath);

    if (result === true) {
      fixedCount++;
    } else if (result === false) {
      skippedCount++;
    } else {
      errorCount++;
    }
  });

  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log(`  ✅ Fixed: ${fixedCount} files`);
  console.log(`  ⏭️  Skipped: ${skippedCount} files`);
  console.log(`  ❌ Errors: ${errorCount} files`);
  console.log('='.repeat(50));
  console.log('\n✨ Done!');
}

// Run the script
main();
