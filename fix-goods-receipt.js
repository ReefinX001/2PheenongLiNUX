/**
 * Fix goods_receipt.html issues:
 * 1. Remove trailing single quotes causing syntax errors
 * 2. Remove duplicate Dark Mode code (handled by account-menu.js)
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'views', 'account', 'goods_receipt.html');

console.log('🔧 Fixing goods_receipt.html...\n');

try {
  let content = fs.readFileSync(filePath, 'utf8');
  let fixCount = 0;

  // Fix 1: Remove trailing single quotes on lines
  console.log('Step 1: Removing trailing single quotes...');
  const linesWithQuotes = content.match(/.*';$/gm);
  if (linesWithQuotes) {
    console.log(`  Found ${linesWithQuotes.length} lines with trailing quotes`);
    // Remove trailing '; but keep just ;
    content = content.replace(/';$/gm, ';');
    // Remove trailing ' at end of lines
    content = content.replace(/'$/gm, '');
    fixCount++;
  }

  // Fix 2: Fix specific syntax errors
  console.log('\nStep 2: Fixing specific syntax errors...');

  // Fix: 'รอรับสินค้า' }'
  content = content.replace(/{ id: 'PO-20230003', date: '2023-10-10', supplier: 'อินโนเทค อิเล็กทรอนิกส์', amount: 65000, status: 'รอรับสินค้า' }'/g,
    "{ id: 'PO-20230003', date: '2023-10-10', supplier: 'อินโนเทค อิเล็กทรอนิกส์', amount: 65000, status: 'รอรับสินค้า' }");

  // Fix: function() {'
  content = content.replace(/function\(\) \{'/g, 'function() {');

  // Fix: message: 'กำลังโหลดหน้าเว็บ...',
  content = content.replace(/message: 'กำลังโหลดหน้าเว็บ\.\.\.',/g, "message: 'กำลังโหลดหน้าเว็บ...',");

  // Fix: spinnerType: 'default''
  content = content.replace(/spinnerType: 'default''/g, "spinnerType: 'default'");

  // Fix: if (...) {'
  content = content.replace(/\)\s*\{'/g, ') {');

  console.log('  ✅ Fixed specific syntax errors');
  fixCount++;

  // Fix 3: Remove duplicate Dark Mode code
  console.log('\nStep 3: Removing duplicate Dark Mode code...');

  const darkModePattern = /\/\/ Initialize dark mode toggle[\s\S]*?\/\/ Options dropdown toggle/;

  if (darkModePattern.test(content)) {
    content = content.replace(
      darkModePattern,
      `// Dark Mode is handled by account-menu.js

      // Options dropdown toggle`
    );
    console.log('  ✅ Removed duplicate Dark Mode code (~35 lines)');
    fixCount++;
  }

  // Fix 4: Remove duplicate menu initialization
  console.log('\nStep 4: Cleaning up menu initialization...');

  const menuPattern = /\/\/ Initialize main menu from template[\s\S]*?mainMenuContainer\.innerHTML = mainMenuTemplate\.innerHTML;[\s\S]*?}/;

  if (menuPattern.test(content)) {
    content = content.replace(menuPattern, '// Menu is handled by account-menu.js');
    console.log('  ✅ Removed duplicate menu initialization');
    fixCount++;
  }

  if (fixCount > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`\n✨ Done! Fixed ${fixCount} issues`);
    console.log('💡 Dark Mode and Menu are now handled by /js/account-menu.js');
  } else {
    console.log('\n⏭️  No issues found');
  }

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
