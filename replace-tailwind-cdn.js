#!/usr/bin/env node

// Script to replace Tailwind CSS CDN with local CSS files
// Safe replacement for production environment

const fs = require('fs');
const path = require('path');

console.log('🔧 Tailwind CSS CDN Replacement Tool');
console.log('=====================================');

// Configuration
const replacements = [
  {
    from: /<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>/g,
    to: '<link href="/css/tailwind.css" rel="stylesheet">'
  },
  {
    from: /<script src="https:\/\/cdn\.tailwindcss\.com.*?"><\/script>/g,
    to: '<link href="/css/tailwind.css" rel="stylesheet">'
  },
  // Alternative format
  {
    from: /<script src=['"]https:\/\/cdn\.tailwindcss\.com.*?['"]><\/script>/g,
    to: '<link href="/css/tailwind.css" rel="stylesheet">'
  }
];

// Priority files to fix first (most critical for production)
const priorityFiles = [
  './views/pattani/installment_Pattani.html',
  './views/login.html',
  './views/frontstore_index.html',
  './views/HR/payroll.html'
];

// Function to replace CDN in a single file
function replaceCDNInFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let hasChanges = false;

    // Apply all replacements
    replacements.forEach(replacement => {
      if (replacement.from.test(newContent)) {
        newContent = newContent.replace(replacement.from, replacement.to);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      // Create backup
      const backupPath = `${filePath}.tailwind-backup`;
      fs.writeFileSync(backupPath, content);

      // Write updated content
      fs.writeFileSync(filePath, newContent);
      console.log(`✅ Updated: ${filePath}`);
      console.log(`📋 Backup created: ${backupPath}`);
      return true;
    } else {
      console.log(`ℹ️  No CDN references found in: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Function to scan directory for HTML files
function scanDirectory(dirPath) {
  const files = [];

  function scan(currentPath) {
    try {
      const items = fs.readdirSync(currentPath);

      items.forEach(item => {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scan(fullPath);
        } else if (stat.isFile() && item.endsWith('.html')) {
          files.push(fullPath);
        }
      });
    } catch (error) {
      console.warn(`Warning: Cannot scan ${currentPath}: ${error.message}`);
    }
  }

  scan(dirPath);
  return files;
}

// Main execution
function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage:
  node replace-tailwind-cdn.js [options]

Options:
  --priority     Replace only priority files (safest)
  --all          Replace in all HTML files
  --file <path>  Replace in specific file
  --test         Dry run - show what would be changed
  --help, -h     Show this help

Examples:
  node replace-tailwind-cdn.js --priority
  node replace-tailwind-cdn.js --file ./views/login.html
  node replace-tailwind-cdn.js --test --all
`);
    return;
  }

  if (args.includes('--priority')) {
    console.log('🎯 Processing priority files...');
    let processed = 0;

    priorityFiles.forEach(file => {
      if (replaceCDNInFile(file)) {
        processed++;
      }
    });

    console.log(`✨ Priority replacement complete! Processed ${processed} files.`);

  } else if (args.includes('--file')) {
    const fileIndex = args.indexOf('--file') + 1;
    if (fileIndex < args.length) {
      const filePath = args[fileIndex];
      console.log(`🎯 Processing specific file: ${filePath}`);
      replaceCDNInFile(filePath);
    } else {
      console.error('❌ Please specify a file path after --file');
    }

  } else if (args.includes('--all')) {
    console.log('🌍 Scanning all HTML files...');
    const allFiles = scanDirectory('./views');
    console.log(`Found ${allFiles.length} HTML files`);

    if (args.includes('--test')) {
      console.log('🧪 TEST MODE - No files will be modified');
      allFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const hasCDN = /cdn\.tailwindcss\.com/.test(content);
        if (hasCDN) {
          console.log(`📝 Would update: ${file}`);
        }
      });
    } else {
      let processed = 0;
      allFiles.forEach(file => {
        if (replaceCDNInFile(file)) {
          processed++;
        }
      });
      console.log(`✨ Bulk replacement complete! Processed ${processed} files.`);
    }

  } else {
    console.log('❓ Please specify an option. Use --help for usage information.');
  }
}

// Export for use as module
if (require.main === module) {
  main();
}

module.exports = { replaceCDNInFile, scanDirectory };