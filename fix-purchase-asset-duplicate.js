/**
 * Fix duplicate code in purchase_asset.html
 * Remove setupDarkMode() and setupMenuToggles() that conflict with account-menu.js
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'views', 'account', 'purchase_asset.html');

console.log('🔧 Removing duplicate code from purchase_asset.html...\n');

try {
  let content = fs.readFileSync(filePath, 'utf8');

  // Pattern to match the duplicate functions
  // From "function initializePage()" to "// Initialize when DOM is ready"
  const duplicateFunctionsPattern = /function initializePage\(\) \{[\s\S]*?^\/\/ Initialize when DOM is ready$/m;

  if (duplicateFunctionsPattern.test(content)) {
    console.log('✅ Found duplicate functions (initializePage, setupDarkMode, setupMenuToggles)');

    // Replace with simplified version that only initializes user profile
    content = content.replace(
      duplicateFunctionsPattern,
      `function initializePage() {
  try {
    // Initialize user profile
    if (typeof fetchUserProfile === 'function') {
      fetchUserProfile();
    }

    // Performance monitoring
    if (window.performance && window.performance.mark) {
      window.performance.mark('purchase-asset-page-ready');
    }

    // Force hide all loading elements after initialization
    setTimeout(() => {
      try {
        if (typeof showLoading === 'function') {
          showLoading(false);
        }

        // Force hide Lottie loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');

        if (loadingOverlay) {
          loadingOverlay.style.display = 'none';
          loadingOverlay.classList.remove('animate__fadeIn');
          loadingOverlay.classList.add('animate__fadeOut', 'hidden');
        }

        console.log('🚫 Force hide Lottie loading executed');
      } catch (error) {
        console.error('Force hide error:', error);
      }
    }, 800);

    console.log('✅ Page initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing page:', error);
  }
}

// Initialize when DOM is ready`
    );

    console.log('✅ Removed duplicate setupDarkMode()');
    console.log('✅ Removed duplicate setupMenuToggles()');
    console.log('✅ Simplified initializePage()');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('\n✨ Done! File saved successfully.');
    console.log('💡 Dark Mode and Menu are now handled by /js/account-menu.js only');
  } else {
    console.log('⏭️  No duplicate functions found');
  }

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
