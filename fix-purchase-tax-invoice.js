/**
 * Comprehensive fix for all trailing single quotes in purchase_tax_invoice.html
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'views', 'account', 'purchase_tax_invoice.html');

console.log('🔧 Fixing purchase_tax_invoice.html...\n');

try {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalLength = content.length;

  // Count trailing quotes before fix
  const semicolonQuotes = (content.match(/;'\s*$/gm) || []).length;
  const commaQuotes = (content.match(/,'\s*$/gm) || []).length;
  const braceQuotes = (content.match(/}'\s*$/gm) || []).length;
  const parenQuotes = (content.match(/\)'\s*$/gm) || []).length;
  const openBraceQuotes = (content.match(/{\s*'\s*$/gm) || []).length;

  console.log(`📊 Found trailing quotes:`);
  console.log(`   After semicolons (;'): ${semicolonQuotes}`);
  console.log(`   After commas (,'): ${commaQuotes}`);
  console.log(`   After closing braces (}'): ${braceQuotes}`);
  console.log(`   After closing parens ()'): ${parenQuotes}`);
  console.log(`   After opening braces ({... '): ${openBraceQuotes}`);
  console.log(`   Total: ${semicolonQuotes + commaQuotes + braceQuotes + parenQuotes + openBraceQuotes}\n`);

  // Remove all trailing ' after semicolons (;')
  content = content.replace(/;'\s*$/gm, ';');

  // Remove all trailing ' after commas (,')
  content = content.replace(/,'\s*$/gm, ',');

  // Remove all trailing ' after closing braces (}')
  content = content.replace(/}'\s*$/gm, '}');

  // Remove all trailing ' after closing parentheses ()')
  content = content.replace(/\)'\s*$/gm, ')');

  // Remove all trailing ' after opening braces ({')
  content = content.replace(/{\s*'\s*$/gm, '{');

  const newLength = content.length;
  const bytesRemoved = originalLength - newLength;

  fs.writeFileSync(filePath, content, 'utf8');

  console.log('✅ Successfully removed all trailing single quotes!');
  console.log(`📉 Removed ${bytesRemoved} characters`);
  console.log('\n✨ File saved successfully!');
  console.log('\n⚠️  Note: You may need to restore closing quotes for string values');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
