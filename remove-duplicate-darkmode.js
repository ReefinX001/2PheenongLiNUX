/**
 * Script to remove duplicate Dark Mode code from purchase_order.html
 * The duplicate code conflicts with account-menu.js
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'views', 'account', 'purchase_order.html');

console.log('🔧 Removing duplicate Dark Mode code from purchase_order.html...\n');

try {
  let content = fs.readFileSync(filePath, 'utf8');

  // Pattern to match the duplicate Dark Mode code
  // This code is between "const btnToggleDark" and the toast styles
  const duplicateDarkModePattern = /const btnToggleDark = document\.getElementById\('btnToggleDark'\);[\s\S]*?const toastStyles = document\.createElement\('style'\);[\s\S]*?document\.head\.appendChild\(toastStyles\);/;

  if (duplicateDarkModePattern.test(content)) {
    console.log('✅ Found duplicate Dark Mode code');

    // Replace with just the toast styles (keep this part)
    content = content.replace(
      duplicateDarkModePattern,
      `const toastStyles = document.createElement('style');
toastStyles.textContent = \`
@keyframes slideIn { from {transform:translateX(100%);opacity:0;} to {transform:translateX(0);opacity:1;} }
@keyframes slideOut{ from{transform:translateX(0);opacity:1;} to{transform:translateX(100%);opacity:0;} }
\`;
document.head.appendChild(toastStyles);`
    );

    console.log('✅ Removed duplicate Dark Mode event listeners');
    console.log('✅ Kept toast animation styles');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('\n✨ Done! File saved successfully.');
    console.log('💡 Dark Mode is now handled by /js/account-menu.js');
  } else {
    console.log('⏭️  No duplicate Dark Mode code found');
  }

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
