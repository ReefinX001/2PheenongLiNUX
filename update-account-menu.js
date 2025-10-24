/**
 * Script to update all HTML files in /views/account folder
 * to use the separated menu CSS, JS, and template
 */

const fs = require('fs');
const path = require('path');

// Paths
const VIEWS_ACCOUNT_DIR = path.join(__dirname, 'views', 'account');
const NAVBAR_TEMPLATE_PATH = path.join(__dirname, 'public', 'templates', 'account-navbar.html');

// Read the navbar template
const navbarTemplate = fs.readFileSync(NAVBAR_TEMPLATE_PATH, 'utf8');

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
 * Update single HTML file
 */
function updateHtmlFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);

    console.log(`Processing: ${fileName}`);

    // Check if already updated (has account-menu.css link)
    if (content.includes('account-menu.css')) {
      console.log(`  ⏭️  Skipped (already updated): ${fileName}`);
      return false;
    }

    // 1. Add CSS link before </head>
    const cssLink = `  <!-- Account Menu Styles -->\n  <link rel="stylesheet" href="/css/account-menu.css">\n`;
    if (!content.includes('account-menu.css')) {
      content = content.replace('</head>', `${cssLink}</head>`);
    }

    // 2. Remove old menu template if exists
    content = content.replace(/<template id="mainMenuTemplate">[\s\S]*?<\/template>/g, '');

    // 3. Remove old menu CSS styles from <style> tags
    // This is a basic cleanup - removes dropdown and navbar related styles
    content = content.replace(/<style>[\s\S]*?<\/style>/g, (match) => {
      // Keep styles that are NOT menu-related
      if (match.includes('.dropdown') ||
          match.includes('.navbar') ||
          match.includes('.menu-horizontal') ||
          match.includes('.submenu-item')) {
        // Remove menu-related CSS
        let cleaned = match;
        cleaned = cleaned.replace(/\.navbar[\s\S]*?(?=\.|\}$)/g, '');
        cleaned = cleaned.replace(/\.menu[\s\S]*?(?=\.|\}$)/g, '');
        cleaned = cleaned.replace(/\.dropdown[\s\S]*?(?=\.|\}$)/g, '');
        cleaned = cleaned.replace(/\.submenu-item[\s\S]*?(?=\.|\}$)/g, '');
        cleaned = cleaned.replace(/\.user-badge[\s\S]*?(?=\.|\}$)/g, '');
        cleaned = cleaned.replace(/\.user-avatar[\s\S]*?(?=\.|\}$)/g, '');
        cleaned = cleaned.replace(/\.btn-fancy[\s\S]*?(?=\.|\}$)/g, '');

        // If style tag is now empty or only has <style></style>, remove it
        if (cleaned.replace(/<\/?style>/g, '').trim() === '') {
          return '';
        }
        return cleaned;
      }
      return match;
    });

    // 4. Replace old navbar HTML with new template
    // Find and replace the navbar section
    const navbarRegex = /<div class="navbar[\s\S]*?<\/div>\s*(?=<div|<script|<!--)/;
    if (navbarRegex.test(content)) {
      content = content.replace(navbarRegex, navbarTemplate + '\n\n');
    } else {
      // If no navbar found, try to find the loading spinner and insert before it
      if (content.includes('id="loadingSpinner"')) {
        content = content.replace(
          /<div id="loadingSpinner"/,
          navbarTemplate + '\n\n<div id="loadingSpinner"'
        );
      }
    }

    // 5. Remove old menu injection script
    content = content.replace(
      /<script>\s*document\.addEventListener\('DOMContentLoaded'[\s\S]*?<\/script>/g,
      ''
    );

    // 6. Add new menu JS before </body>
    const jsScript = `  <!-- Account Menu Script -->\n  <script src="/js/account-menu.js"></script>\n`;
    if (!content.includes('account-menu.js')) {
      content = content.replace('</body>', `${jsScript}</body>`);
    }

    // 7. Clean up multiple blank lines
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

    // Write the updated content back to the file
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ Updated: ${fileName}`);
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
  console.log('🚀 Starting to update account HTML files...\n');

  const htmlFiles = getAllHtmlFiles(VIEWS_ACCOUNT_DIR);
  console.log(`Found ${htmlFiles.length} HTML files to process\n`);

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  htmlFiles.forEach(file => {
    const filePath = path.join(VIEWS_ACCOUNT_DIR, file);
    const result = updateHtmlFile(filePath);

    if (result === true) {
      updatedCount++;
    } else if (result === false) {
      skippedCount++;
    } else {
      errorCount++;
    }
  });

  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log(`  ✅ Updated: ${updatedCount} files`);
  console.log(`  ⏭️  Skipped: ${skippedCount} files`);
  console.log(`  ❌ Errors: ${errorCount} files`);
  console.log('='.repeat(50));
  console.log('\n✨ Done!');
}

// Run the script
main();
