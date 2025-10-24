/**
 * Comprehensive fix for all trailing single quotes in goods_receipt.html
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'views', 'account', 'goods_receipt.html');

console.log('🔧 Removing ALL trailing single quotes from goods_receipt.html...\n');

try {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalLength = content.length;

  // Count trailing quotes before fix
  const trailingQuotesCount = (content.match(/;'\s*$/gm) || []).length;
  console.log(`📊 Found ${trailingQuotesCount} lines with trailing quotes after semicolons\n`);

  // Remove all trailing ' after semicolons (;')
  content = content.replace(/;'\s*$/gm, ';');

  // Remove all trailing ' after commas (,')
  content = content.replace(/,'\s*$/gm, ',');

  // Remove all trailing ' after closing braces (}')
  content = content.replace(/}'\s*$/gm, '}');

  // Remove all trailing ' after closing parentheses ()')
  content = content.replace(/\)'\s*$/gm, ')');

  const newLength = content.length;
  const bytesRemoved = originalLength - newLength;

  fs.writeFileSync(filePath, content, 'utf8');

  console.log('✅ Successfully removed all trailing single quotes!');
  console.log(`📉 Removed ${bytesRemoved} characters`);
  console.log('\n✨ File saved successfully!');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
