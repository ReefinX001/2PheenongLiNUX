const fs = require('fs');
const path = require('path');

const projectDir = path.join(__dirname, '..');

function fixSecurityIssues(filePath) {
  try {
    const filename = path.basename(filePath);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Replace all instances of stack/details exposure in development mode
    const patterns = [
      // Pattern 1: stack: undefined
      {
        search: /stack:\s*process\.env\.NODE_ENV\s*===\s*['"']development['"']\s*\?\s*[^:]+\.stack\s*:\s*undefined/g,
        replace: 'stack: undefined'
      },
      // Pattern 2: details: "Contact administrator for more details"
      {
        search: /details:\s*process\.env\.NODE_ENV\s*===\s*['"']development['"']\s*\?\s*[^:]+\.stack\s*:\s*undefined/g,
        replace: 'details: "Contact administrator for more details"'
      },
      // Pattern 3: error: "An error occurred"
      {
        search: /error:\s*process\.env\.NODE_ENV\s*===\s*['"']development['"']\s*\?\s*[^:]+\.message\s*:\s*undefined/g,
        replace: 'error: "An error occurred"'
      },
      // Pattern 4:
      {
        search: /\.\.\.\(process\.env\.NODE_ENV\s*===\s*['"']development['"']\s*&&\s*\{\s*stack:\s*[^}]+\}\)/g,
        replace: ''
      },
      // Pattern 5: details: "Contact administrator for more details"
      {
        search: /details:\s*process\.env\.NODE_ENV\s*===\s*['"']development['"']\s*\?\s*[^:]+\.message\s*:\s*undefined/g,
        replace: 'details: "Contact administrator for more details"'
      }
    ];

    patterns.forEach(pattern => {
      if (pattern.search.test(content)) {
        content = content.replace(pattern.search, pattern.replace);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content);
      return { status: 'fixed', filename, modified: true };
    }

    return { status: 'no_fix_needed', filename, modified: false };

  } catch (error) {
    return { status: 'error', filename: path.basename(filePath), error: error.message };
  }
}

function processAllFilesRecursively() {
  const results = { fixed: 0, noFixNeeded: 0, errors: 0, details: [] };

  function processDirectory(dir) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      // Skip node_modules, .git, .history directories
      if (stat.isDirectory() && !['node_modules', '.git', '.history', '.lh'].includes(item)) {
        processDirectory(fullPath);
      } else if (item.endsWith('.js') && !fullPath.includes('node_modules')) {
        const result = fixSecurityIssues(fullPath);
        results.details.push(result);

        switch (result.status) {
          case 'fixed':
            results.fixed++;
            console.log(`✅ ${result.filename} - Fixed security issues`);
            break;
          case 'no_fix_needed':
            results.noFixNeeded++;
            break;
          case 'error':
            results.errors++;
            console.log(`❌ ${result.filename} - Error: ${result.error}`);
            break;
        }
      }
    }
  }

  console.log('🔒 Fixing security issues (removing stack trace exposure)...\n');
  processDirectory(projectDir);

  console.log('\n📊 Security Fix Summary:');
  console.log(`✅ Files Fixed: ${results.fixed}`);
  console.log(`📝 Files OK: ${results.noFixNeeded}`);
  console.log(`❌ Errors: ${results.errors}`);
  console.log(`📁 Total Files: ${results.fixed + results.noFixNeeded + results.errors}`);

  if (results.fixed > 0) {
    console.log('\n🎉 Security issues fixed!');
    console.log('🔒 Error details are now hidden from users');
    console.log('💡 Restart the server to apply changes: npm start');
  }

  return results;
}

if (require.main === module) {
  processAllFilesRecursively();
}

module.exports = { processAllFilesRecursively };