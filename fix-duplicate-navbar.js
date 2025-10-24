/**
 * Script to fix duplicate navbar sections in all HTML files
 * Removes duplicate Profile, Dark Mode, and Logout button sections
 */

const fs = require('fs');
const path = require('path');

// Paths
const VIEWS_ACCOUNT_DIR = path.join(__dirname, 'views', 'account');

// Files to skip (if any)
const SKIP_FILES = ['menuuu.html', 'test-menu.html', 'menu-inline.html'];

/**
 * Get all HTML files in the directory
 */
function getAllHtmlFiles(dir) {
  const files = fs.readdirSync(dir);
  return files.filter(file => {
    return file.endsWith('.html') && !SKIP_FILES.includes(file);
  });
}

/**
 * Fix duplicate navbar sections in a single file
 */
function fixDuplicateNavbar(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);

    console.log(`Processing: ${fileName}`);

    // Pattern to match the duplicate section
    const duplicatePattern = /<!-- Loading Spinner -->\s*<div id="loadingSpinner"[^>]*>[\s\S]*?<\/div>\s*<!-- Added ml-auto[\s\S]*?<\/div>\s*<\/div>/;

    // Check if file has duplicate sections
    if (!duplicatePattern.test(content)) {
      console.log(`  ⏭️  No duplicates found: ${fileName}`);
      return false;
    }

    // Remove the duplicate section pattern more carefully
    // First, let's find and remove the duplicate navbar parts

    // Pattern 1: Remove duplicate loading spinner that comes after the first one
    const loadingSpinnerPattern = /(<!-- Loading Spinner -->\s*<div id="loadingSpinner"[^>]*>[\s\S]*?<\/div>)\s*(<!-- Loading Spinner -->\s*<div id="loadingSpinner"[^>]*>[\s\S]*?<\/div>)/;
    if (loadingSpinnerPattern.test(content)) {
      content = content.replace(loadingSpinnerPattern, '$1');
      console.log(`  🔧 Removed duplicate loading spinner`);
    }

    // Pattern 2: Remove the entire duplicate navbar section
    // This pattern matches from "<!-- Added ml-auto" through the closing divs and script tag
    const duplicateNavbarSection = /<!-- Added ml-auto[^>]*-->\s*<\/div>\s*<div class="flex-none flex items-center space-x-2">\s*<!-- เพิ่มส่วนแสดงข้อมูลผู้ใช้ -->[\s\S]*?<\/div>\s*<\/div>\s*(?:<!-- สคริปต์ inject เมนู -->)?/;

    if (duplicateNavbarSection.test(content)) {
      content = content.replace(duplicateNavbarSection, '');
      console.log(`  🔧 Removed duplicate navbar section`);
    }

    // Alternative pattern if the above doesn't match
    // Look for duplicate employeePhoto, btnToggleDark, btnLogout sections
    const altPattern = /<!-- Added ml-auto[\s\S]*?id="btnLogout"[\s\S]*?ออกจากระบบ[\s\S]*?<\/button>\s*<\/div>\s*<\/div>\s*(?:<!-- สคริปต์ inject เมนู -->)?/;

    if (altPattern.test(content)) {
      content = content.replace(altPattern, '');
      console.log(`  🔧 Removed duplicate navbar (alternative pattern)`);
    }

    // Clean up multiple blank lines
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

    // Write the fixed content back to the file
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ Fixed: ${fileName}`);
    return true;

  } catch (error) {
    console.error(`  ❌ Error processing ${path.basename(filePath)}:`, error.message);
    return false;
  }
}

/**
 * Main function
 */
function main() {
  console.log('🚀 Starting to fix duplicate navbar sections...\n');

  const htmlFiles = getAllHtmlFiles(VIEWS_ACCOUNT_DIR);
  console.log(`Found ${htmlFiles.length} HTML files to process\n`);

  let fixedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  htmlFiles.forEach(file => {
    const filePath = path.join(VIEWS_ACCOUNT_DIR, file);
    const result = fixDuplicateNavbar(filePath);

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
