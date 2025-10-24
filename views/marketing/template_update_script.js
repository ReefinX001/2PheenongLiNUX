// Script to help update marketing files with standardized sidebar
// This is a helper script for updating marketing module files

const fs = require('fs');
const path = require('path');

// List of marketing files that need to be updated
const marketingFiles = [
  'analytics.html',
  'content_management.html',
  'social_media.html',
  'customer_data.html',
  'budget_reports.html',
  'marketing_settings.html',
  'Products_marketing.html',
  'Customers_marketing.html',
  'Promotion.html'
];

// Common sidebar script includes to add to head section
const sidebarScriptIncludes = `
  <!-- User Profile Manager -->
  <script src="js/user-profile.js"></script>
  <!-- Sidebar Manager -->
  <script src="js/sidebar.js"></script>`;

// Sidebar container HTML to replace existing sidebar
const sidebarContainerHTML = `
  <div class="min-h-screen flex">
    <!-- Sidebar Container -->
    <div id="sidebar-container">
      <!-- Sidebar content will be loaded here -->
    </div>`;

// Sidebar loading script to add before closing body tag
const sidebarLoadingScript = `
    // Load sidebar on page load
    document.addEventListener('DOMContentLoaded', function() {
      // Load sidebar HTML
      fetch('includes/sidebar.html')
        .then(response => response.text())
        .then(html => {
          const sidebarContainer = document.getElementById('sidebar-container');
          if (sidebarContainer) {
            sidebarContainer.innerHTML = html;
            // Initialize sidebar after loading
            if (typeof initializeSidebar === 'function') {
              initializeSidebar();
            }
          }
        })
        .catch(error => {
          console.error('Error loading sidebar:', error);
          // Fallback: show basic sidebar structure
          const sidebarContainer = document.getElementById('sidebar-container');
          if (sidebarContainer) {
            sidebarContainer.innerHTML = '<aside class="w-64 bg-white dark:bg-gray-800"><div class="p-4">Sidebar Loading Error</div></aside>';
          }
        });
    });`;

function updateMarketingFile(filename) {
  const filePath = path.join(__dirname, filename);

  try {
    let content = fs.readFileSync(filePath, 'utf8');

    console.log(`Updating ${filename}...`);

    // 1. Add sidebar script includes to head (if not already present)
    if (!content.includes('js/sidebar.js') && !content.includes('js/user-profile.js')) {
      content = content.replace(
        /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/chart\.js"><\/script>/,
        `<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>${sidebarScriptIncludes}`
      );
    }

    // 2. Replace existing sidebar with sidebar container
    // Look for patterns like <aside id="sidebar"... and replace the entire sidebar section
    const sidebarPattern = /<aside[^>]*id="sidebar"[^>]*>[\s\S]*?<\/aside>/;
    if (sidebarPattern.test(content)) {
      content = content.replace(sidebarPattern, '<!-- Sidebar Container -->\n    <div id="sidebar-container">\n      <!-- Sidebar content will be loaded here -->\n    </div>');
    }

    // 3. Add sidebar loading script before closing body tag
    if (!content.includes('fetch(\'includes/sidebar.html\')')) {
      content = content.replace(
        /<\/body>\s*<\/html>/,
        `${sidebarLoadingScript}\n  </script>\n</body>\n</html>`
      );
    }

    // Write updated content back to file
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Successfully updated ${filename}`);

  } catch (error) {
    console.error(`❌ Error updating ${filename}:`, error.message);
  }
}

// Export for Node.js usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    updateMarketingFile,
    marketingFiles,
    sidebarScriptIncludes,
    sidebarContainerHTML,
    sidebarLoadingScript
  };
}

console.log('Marketing Template Update Helper Script');
console.log('This script helps update marketing files to use standardized sidebar');
console.log('Files to update:', marketingFiles);