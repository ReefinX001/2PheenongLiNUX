/**
 * Remove duplicate function declarations from purchase_asset.html
 * These functions are already defined in the first script block
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'views', 'account', 'purchase_asset.html');

console.log('🔧 Removing duplicate function declarations from purchase_asset.html...\n');

try {
  let content = fs.readFileSync(filePath, 'utf8');

  // Find and remove the duplicate script block (from comment to </script>)
  const duplicatePattern = /<!--\s*User profile and API functions are defined in the first script block\s*-->[\s\S]*?\/\/ Note: initializePage is called later in the enhanced section<\/script>/;

  if (duplicatePattern.test(content)) {
    console.log('✅ Found duplicate function declarations');

    content = content.replace(
      duplicatePattern,
      '  <!-- User profile and API functions are defined in the first script block -->'
    );

    console.log('✅ Removed duplicate:');
    console.log('   - fetchUserProfile()');
    console.log('   - getAuthToken()');
    console.log('   - updateUserInterface()');
    console.log('   - loadFallbackUserData()');
    console.log('   - handleAuthenticationError()');
    console.log('   - logout()');
    console.log('   - resolvePhotoUrl()');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('\n✨ Done! File saved successfully.');
  } else {
    console.log('⏭️  No duplicate functions found (already cleaned)');
  }

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
